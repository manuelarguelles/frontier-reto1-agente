// API del agente: Bearer en todas las rutas, task_id <2 s, estado durable sin credenciales, watchdog monotónico.
import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { runAgent, redact, type AgentResult } from "./agent.ts";

const PORT = Number(process.env.PORT ?? 8080);
const TEAM_TOKEN = process.env.TEAM_TOKEN ?? "";
const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DEADLINE_MS = Number(process.env.TASK_DEADLINE_S ?? 270) * 1000;
const HARD_CLOSE_MS = Number(process.env.TASK_HARD_CLOSE_S ?? 280) * 1000;
if (!TEAM_TOKEN) { console.error("falta TEAM_TOKEN"); process.exit(1); }

interface Task { task_id: string; estado: "en_curso" | "terminada" | "fallida"; resumen: string; created: number }
const tasks = new Map<string, Task>();
const STATE = `${DATA_DIR}/tasks.json`;
let active: string | null = null;

mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(STATE)) {
  try {
    for (const t of JSON.parse(readFileSync(STATE, "utf8")) as Task[]) {
      if (t.estado === "en_curso") { t.estado = "fallida"; t.resumen = "Servicio reiniciado durante la tarea; no se reintenta para evitar duplicados."; }
      tasks.set(t.task_id, t);
    }
  } catch { /* estado corrupto: arranca vacío */ }
}
const persist = () => { try { writeFileSync(STATE, JSON.stringify([...tasks.values()].slice(-200))); } catch { /* */ } };

const log = (m: string) => console.log(new Date().toISOString(), m);
const send = (res: http.ServerResponse, code: number, body: unknown) => {
  const s = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
};
const authed = (req: http.IncomingMessage) => {
  const h = req.headers.authorization ?? "";
  const got = Buffer.from(h.startsWith("Bearer ") ? h.slice(7) : "");
  const want = Buffer.from(TEAM_TOKEN);
  return got.length === want.length && timingSafeEqual(got, want);
};
const readBody = (req: http.IncomingMessage) => new Promise<string>((ok, ko) => {
  let b = ""; req.on("data", (d) => { b += d; if (b.length > 1_000_000) { ko(new Error("cuerpo grande")); req.destroy(); } });
  req.on("end", () => ok(b)); req.on("error", ko);
});

function finish(t: Task, r: AgentResult) {
  if (t.estado !== "en_curso") return;
  t.resumen = r.resumen;
  t.estado = r.estado; // terminal solo tras liberar entradas y cerrar el escritorio (ver runAgent)
  active = null; persist();
  log(`tarea ${t.task_id} ${t.estado}`);
}

function start(t: Task, tarea: string, url: string, password: string) {
  const ctl = new AbortController();
  const startedAt = performance.now();
  const deadline = startedAt + DEADLINE_MS;
  // watchdog independiente: cancela a 270 s; si el worker no cierra, fuerza terminal a 280 s
  const soft = setTimeout(() => ctl.abort(), DEADLINE_MS);
  const hard = setTimeout(() => finish(t, { estado: "fallida", resumen: "Tiempo máximo alcanzado; la tarea se detuvo sin confirmar el resultado." }), HARD_CLOSE_MS);
  runAgent({ tarea, url, password, signal: ctl.signal, deadlineMs: deadline, log: (m) => log(`[${t.task_id.slice(0, 8)}] ${redact(m, [password])}`) })
    .then((r) => finish(t, r))
    .catch((e) => finish(t, { estado: "fallida", resumen: redact("Error interno: " + (e?.message ?? e), [password]) }))
    .finally(() => { clearTimeout(soft); clearTimeout(hard); });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!authed(req)) return send(res, 401, { error: "no autorizado" });
    const url = new URL(req.url ?? "/", "http://x");
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
    if (req.method === "POST" && url.pathname === "/tasks") {
      let body: any;
      try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: "JSON inválido" }); }
      const tarea = body?.tarea, e = body?.escritorio;
      if (typeof tarea !== "string" || !tarea.trim() || typeof e?.url !== "string" || typeof e?.password !== "string" || !/^wss?:\/\//.test(e.url))
        return send(res, 400, { error: "se requiere tarea y escritorio {url, password}" });
      const t: Task = { task_id: randomUUID(), estado: "en_curso", resumen: "", created: Date.now() };
      tasks.set(t.task_id, t);
      if (active) { // una tarea activa por instancia: falla explícita sin actuar
        t.estado = "fallida"; t.resumen = "Agente ocupado con otra tarea; no se realizó ninguna acción."; persist();
        return send(res, 200, { task_id: t.task_id });
      }
      active = t.task_id; persist();
      send(res, 200, { task_id: t.task_id });
      setImmediate(() => start(t, tarea, e.url, e.password));
      return;
    }
    const m = url.pathname.match(/^\/tasks\/([\w-]+)$/);
    if (req.method === "GET" && m) {
      const t = tasks.get(m[1]);
      if (!t) return send(res, 404, { error: "tarea no encontrada" });
      return send(res, 200, { estado: t.estado, resumen: t.resumen });
    }
    send(res, 404, { error: "no encontrado" });
  } catch (e: any) { send(res, 500, { error: "error interno" }); log("error: " + e?.message); }
});
server.listen(PORT, () => log(`agente escuchando en :${PORT}`));
