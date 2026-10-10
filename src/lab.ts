// Laboratorio local interactivo (WP6). Solo activo con LAB=1 (implica LIVE_VIEW=1).
// Sin LAB=1 las rutas /lab* dan 404 y NO se lee nada del disco.
// Los secretos de private/desktop.env viven solo en el servidor: jamás se devuelven al navegador.
import http from "node:http";
import { mkdirSync, rmdirSync, readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { redact } from "./agent.ts";
import { defaultModel, TASK_COST_CAP_USD } from "./models.ts";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
export const LOCK_DIR = "/tmp/frontier-desktop.lock"; // el mismo de scripts/with-desktop-lock.sh

export interface TestDef {
  id: string; nivel: string; instruccion: string;
  estado_esperado: "terminada" | "fallida";
  respuesta_esperada?: string; claves_razon?: string[];
  raw: any; // JSON completo de la prueba: es lo que recibe /__check (solo servidor)
}
export interface DesktopEnv { DESKTOP_URL: string; DESKTOP_HTTP: string; DESKTOP_PASSWORD: string; DESKTOP_TOKEN: string }
export interface TestResult {
  id: string;
  estado: "terminada" | "fallida" | "error";
  estado_esperado: string;
  ok: boolean;                       // estado esperado + __check + respuesta
  check_pass: boolean | null;
  checks: { nombre: string; ok: boolean }[];
  respuesta_esperada?: string; respuesta_obtenida?: string; respuesta_ok: boolean | null;
  razon_ok: boolean | null;
  tiempo_ms: number; pasos: number; coste_usd: number;
  resumen: string; error?: string;
}
export interface LabStep { step: number; accion: any; observacion?: string; plan?: string; costUsd: number }
export interface LabCurrent {
  id: string; fase: "reiniciando" | "esperando" | "agente" | "verificando";
  task_id?: string; startedAt: number; steps: LabStep[]; png?: string; costUsd: number;
}

export interface LabDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  readText: (path: string) => string;
  listDir: (path: string) => string[];
  exists: (path: string) => boolean;
  mkdirLock: () => boolean; rmLock: () => void;
  selfUrl: () => string; teamToken: () => string;
  resetWaitMs: number; pollMs: number; maxWaitMs: number;
  privateDir: string;
}
const defaults = (): LabDeps => ({
  fetch: (...a) => fetch(...a),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  readText: (p) => readFileSync(p, "utf8"),
  listDir: (p) => readdirSync(p),
  exists: existsSync,
  mkdirLock: () => {
    try { mkdirSync(LOCK_DIR); return true; } catch { /* ocupado o huérfano */ }
    // Candado huérfano (servidor reiniciado a mitad de una prueba): una tarea dura <5 min, así que >8 min sin tocar es obsoleto
    try { if (Date.now() - statSync(LOCK_DIR).mtimeMs > 8 * 60_000) { rmdirSync(LOCK_DIR); mkdirSync(LOCK_DIR); return true; } } catch { /* */ }
    return false;
  },
  rmLock: () => { try { rmdirSync(LOCK_DIR); } catch { /* */ } },
  selfUrl: () => `http://127.0.0.1:${process.env.PORT ?? 8080}`,
  teamToken: () => process.env.TEAM_TOKEN ?? "",
  resetWaitMs: 6000, pollMs: 1000, maxWaitMs: 300_000,
  privateDir: join(ROOT, "private"),
});

export const labEnabled = () => process.env.LAB === "1";

export function parseEnvText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

export function createLab(over: Partial<LabDeps> = {}) {
  const d: LabDeps = { ...defaults(), ...over };
  const results = new Map<string, TestResult>();
  let current: LabCurrent | null = null;
  let queue: string[] = [];
  let running = false;
  let lastError: string | null = null;

  function loadEnv(): DesktopEnv {
    const p = join(d.privateDir, "desktop.env");
    if (!d.exists(p)) throw new Error("No se encontró private/desktop.env");
    const e = parseEnvText(d.readText(p));
    for (const k of ["DESKTOP_URL", "DESKTOP_HTTP", "DESKTOP_PASSWORD", "DESKTOP_TOKEN"]) if (!e[k]) throw new Error(`private/desktop.env incompleto (falta ${k})`);
    return e as unknown as DesktopEnv;
  }
  function loadTests(): TestDef[] {
    const dir = join(d.privateDir, "challenge-1", "pruebas");
    if (!d.exists(dir)) throw new Error("No se encontró private/challenge-1/pruebas");
    return d.listDir(dir).filter((f) => /^E\d+.*\.json$/.test(f)).sort().map((f) => {
      const t = JSON.parse(d.readText(join(dir, f)));
      return { id: t.id, nivel: t.nivel ?? "", instruccion: t.instruccion, estado_esperado: t.estado_esperado,
        respuesta_esperada: t.respuesta_esperada, claves_razon: t.claves_razon, raw: t } as TestDef;
    });
  }
  const publicTests = () => loadTests().map((t) => ({ id: t.id, nivel: t.nivel, instruccion: t.instruccion }));

  async function post(url: string, token: string, body?: unknown) {
    const r = await d.fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    if (!r.ok) throw new Error(`${url.split("/").pop()} respondió HTTP ${r.status}`);
    return r.json().catch(() => ({})) as Promise<any>;
  }
  const getSelf = async (path: string) => {
    const r = await d.fetch(d.selfUrl() + path, { headers: { Authorization: `Bearer ${d.teamToken()}` }, signal: AbortSignal.timeout(10_000) });
    return r.ok ? ((await r.json()) as any) : null;
  };

  async function runOne(t: TestDef, env: DesktopEnv): Promise<TestResult> {
    const secrets = [env.DESKTOP_PASSWORD, env.DESKTOP_TOKEN, env.DESKTOP_URL, env.DESKTOP_HTTP];
    const t0 = performance.now();
    const cur: LabCurrent = { id: t.id, fase: "reiniciando", startedAt: Date.now(), steps: [], costUsd: 0 };
    current = cur;
    const r: TestResult = { id: t.id, estado: "error", estado_esperado: t.estado_esperado, ok: false, check_pass: null, checks: [],
      respuesta_esperada: t.respuesta_esperada, respuesta_ok: null, razon_ok: null, tiempo_ms: 0, pasos: 0, coste_usd: 0, resumen: "" };
    try {
      await post(`${env.DESKTOP_HTTP}/__reset`, env.DESKTOP_TOKEN);
      cur.fase = "esperando"; await d.sleep(d.resetWaitMs);
      cur.fase = "agente";
      const made = await (await d.fetch(d.selfUrl() + "/tasks", { method: "POST",
        headers: { Authorization: `Bearer ${d.teamToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tarea: t.instruccion, escritorio: { url: env.DESKTOP_URL, password: env.DESKTOP_PASSWORD } }) })).json() as any;
      if (!made?.task_id) throw new Error("el servidor no creó la tarea");
      cur.task_id = made.task_id;
      let estado = "en_curso", resumen = "";
      const limit = performance.now() + d.maxWaitMs;
      while (estado === "en_curso" && performance.now() < limit) {
        await d.sleep(d.pollMs);
        const tr = await getSelf(`/tasks/${made.task_id}/trace`).catch(() => null);
        if (tr?.steps?.length) {
          const last = tr.steps[tr.steps.length - 1];
          cur.png = last.png; cur.costUsd = last.costUsd;
          cur.steps = tr.steps.map((s: any) => ({ step: s.step, accion: s.accion, observacion: s.observacion, plan: s.plan, costUsd: s.costUsd }));
        }
        const st = await getSelf(`/tasks/${made.task_id}`).catch(() => null);
        if (st) { estado = st.estado; resumen = st.resumen ?? ""; }
      }
      if (estado === "en_curso") throw new Error("la tarea no terminó a tiempo");
      r.estado = estado as any; r.resumen = redact(resumen, secrets);
      cur.fase = "verificando";
      const chk = await post(`${env.DESKTOP_HTTP}/__check`, env.DESKTOP_TOKEN, t.raw);
      r.check_pass = chk?.pass === true;
      r.checks = Array.isArray(chk?.checks) ? chk.checks.map((c: any) => ({ nombre: String(c.nombre), ok: c.ok === true })) : [];
      if (t.respuesta_esperada !== undefined) {
        const m = resumen.match(/[Rr]espuesta:\s*([^\n]+?)\s*$/m);
        r.respuesta_obtenida = m ? redact(m[1].replace(/\.$/, ""), secrets) : undefined;
        r.respuesta_ok = r.respuesta_obtenida === t.respuesta_esperada;
      }
      if (t.claves_razon?.length) r.razon_ok = t.claves_razon.every((c) => resumen.includes(c));
      r.ok = r.estado === t.estado_esperado && r.check_pass === true && r.respuesta_ok !== false;
    } catch (e: any) {
      r.estado = "error"; r.error = redact(e?.message ?? String(e), secrets);
    }
    r.pasos = cur.steps.length ? cur.steps[cur.steps.length - 1].step : 0;
    r.coste_usd = cur.costUsd; r.tiempo_ms = Math.round(performance.now() - t0);
    results.set(t.id, r);
    return r;
  }

  /** Lanza el run en segundo plano. Devuelve null si OK o un mensaje si no se pudo. */
  function start(id: string): { code: number; error?: string; started?: string[] } {
    let tests: TestDef[], env: DesktopEnv;
    try { tests = loadTests(); env = loadEnv(); } catch (e: any) { return { code: 500, error: e.message }; }
    const sel = id === "all" ? tests : tests.filter((t) => t.id === id);
    if (!sel.length) return { code: 404, error: `La prueba ${id} no existe` };
    if (running || !d.mkdirLock()) return { code: 409, error: "Ya hay una prueba en curso o el escritorio está en uso por otro proceso" };
    running = true; lastError = null; queue = sel.map((t) => t.id);
    (async () => {
      try { for (const t of sel) { await runOne(t, env); queue = queue.filter((q) => q !== t.id); } }
      catch (e: any) { lastError = e?.message ?? String(e); }
      finally { running = false; current = null; queue = []; d.rmLock(); }
    })();
    return { code: 202, started: sel.map((t) => t.id) };
  }

  const state = () => ({ running, queue, current, results: [...results.values()], error: lastError });
  const meta = () => ({ actor: defaultModel("actor"), cost_cap_usd: TASK_COST_CAP_USD });

  const send = (res: http.ServerResponse, code: number, body: unknown) => {
    const s = JSON.stringify(body);
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(s) });
    res.end(s);
  };

  /** Devuelve true si atendió la petición. Sin LAB=1: /lab* da 404 y no toca el disco. */
  async function handle(req: http.IncomingMessage, res: http.ServerResponse, authed: (r: http.IncomingMessage) => boolean): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname !== "/lab" && !url.pathname.startsWith("/lab/")) return false;
    if (!labEnabled()) { send(res, 404, { error: "no encontrado" }); return true; }
    if (!authed(req)) { send(res, 401, { error: "no autorizado" }); return true; }
    const p = url.pathname;
    if (req.method === "GET" && p === "/lab") {
      try {
        const html = d.readText(join(ROOT, "public", "lab.html"));
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html), "Cache-Control": "no-store" });
        res.end(html);
      } catch { send(res, 404, { error: "lab.html no encontrado" }); }
      return true;
    }
    if (req.method === "GET" && p === "/lab/tests") {
      try { send(res, 200, { ...meta(), tests: publicTests() }); } catch (e: any) { send(res, 500, { error: e.message }); }
      return true;
    }
    if (req.method === "GET" && p === "/lab/state") { send(res, 200, state()); return true; }
    if (req.method === "POST" && p === "/lab/run") {
      const id = url.searchParams.get("id") ?? "";
      if (!/^(all|E\d+)$/.test(id)) { send(res, 400, { error: "Indica id=E1..E5 o id=all" }); return true; }
      const r = start(id);
      send(res, r.code, r.error ? { error: r.error } : { ok: true, started: r.started });
      return true;
    }
    send(res, 404, { error: "no encontrado" });
    return true;
  }
  return { handle, state, start, loadTests, loadEnv, meta };
}
export type Lab = ReturnType<typeof createLab>;
