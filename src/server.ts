// API del agente: Bearer en todas las rutas, task_id <2 s, estado durable sin credenciales, watchdog monotónico.
import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readFileSync as fsReadFileSync } from "node:fs";
import { runAgent, redact, type AgentResult, type AgentOpts } from "./agent.ts";
import { RfbClient } from "./rfb.ts";
import { createTrace, removeTrace, onStepHook, getTrace, listTraces } from "./trace.ts";
import { createLab } from "./lab.ts";

if (process.env.LAB === "1") process.env.LIVE_VIEW = "1"; // el laboratorio implica el visor en vivo
const PORT = Number(process.env.PORT ?? 8080);
const TEAM_TOKEN = process.env.TEAM_TOKEN ?? "";
const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DEADLINE_MS = Number(process.env.TASK_DEADLINE_S ?? 270) * 1000;
const HARD_CLOSE_MS = Number(process.env.TASK_HARD_CLOSE_S ?? 280) * 1000;
const MEMORY_LIMIT_MB = Number(process.env.MEMORY_LIMIT_MB ?? 512);
if (!TEAM_TOKEN) { console.error("falta TEAM_TOKEN"); process.exit(1); }

// Manejo de errores no capturados: marca tarea como fallida y cierra ordenadamente
process.on("uncaughtException", (err) => {
  log("uncaughtException: " + err.message);
  if (active) {
    const t = tasks.get(active);
    if (t && t.estado === "en_curso") {
      t.estado = "fallida";
      t.resumen = "Error interno (uncaughtException); la tarea se detuvo.";
      persist();
    }
  }
  try { process.exit(1); } catch {}
});
process.on("unhandledRejection", (reason) => {
  log("unhandledRejection: " + String(reason));
  if (active) {
    const t = tasks.get(active);
    if (t && t.estado === "en_curso") {
      t.estado = "fallida";
      t.resumen = "Error interno (unhandledRejection); la tarea se detuvo.";
      persist();
    }
  }
});

// Cierre ordenado ante SIGTERM: abortar tarea activa, soltar entradas, marcar fallida
const gracefulShutdown = async () => {
  log("SIGTERM recibido; cerrando ordenadamente");
  if (active) {
    const t = tasks.get(active);
    if (t && t.estado === "en_curso") {
      // Aborta la tarea en curso para que el agente la marque fallida
      // No se puede abortar la ejecución directamente, se marca como fallida
      t.estado = "fallida";
      t.resumen = "Servicio reiniciado durante la tarea; no se reintenta para evitar duplicados.";
      persist();
    }
  }
  server.close(() => { log("servidor cerrado"); process.exit(0); });
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

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
  let tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  // Visor local: el navegador no puede mandar Bearer; con LIVE_VIEW=1 se acepta ?token= SOLO en /live* y /tasks/{id}/trace
  if (!tok && (process.env.LIVE_VIEW === "1" || process.env.LAB === "1")) {
    const u = new URL(req.url ?? "/", "http://x");
    if (u.pathname === "/live" || u.pathname.startsWith("/live/") || (process.env.LAB === "1" && (u.pathname === "/lab" || u.pathname.startsWith("/lab/"))) || /^\/tasks\/[\w-]+\/trace$/.test(u.pathname)) tok = u.searchParams.get("token") ?? "";
  }
  const got = Buffer.from(tok);
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

  // Crear traza si LIVE_VIEW=1
  if (process.env.LIVE_VIEW === "1") {
    createTrace(t.task_id);
  }

  const onStep = process.env.LIVE_VIEW === "1" ? onStepHook(t.task_id) : undefined;
  runAgent({ tarea, url, password, signal: ctl.signal, deadlineMs: deadline, log: (m) => log(`[${t.task_id.slice(0, 8)}] ${redact(m, [password])}`), onStep })
    .then((r) => {
      // Eliminar traza al terminar
      if (process.env.LIVE_VIEW === "1") {
        removeTrace(t.task_id);
      }
      finish(t, r);
    })
    .catch((e) => {
      // Eliminar traza al fallar
      if (process.env.LIVE_VIEW === "1") {
        removeTrace(t.task_id);
      }
      finish(t, { estado: "fallida", resumen: redact("Error interno: " + (e?.message ?? e), [password]) });
    })
    .finally(() => { clearTimeout(soft); clearTimeout(hard); });
}

const lab = createLab();
const server = http.createServer(async (req, res) => {
  try {
    if (await lab.handle(req, res, authed)) return; // /lab* (404 sin LAB=1)
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

    // Rutas de visor en vivo (solo con LIVE_VIEW=1)
    if (process.env.LIVE_VIEW === "1") {
      if (req.method === "GET" && url.pathname === "/live") {
        // Servir HTML estático
        try {
          const html = fsReadFileSync("./public/live.html", "utf8");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html) });
          res.end(html);
          return;
        } catch {
          return send(res, 404, { error: "live.html no encontrado" });
        }
      }
      if (req.method === "GET" && url.pathname === "/live/tasks") {
        // Lista de tareas con trazas activas (mejorar: incluir estado real de tasks)
        const traces = listTraces();
        for (const t of traces) {
          const task = tasks.get(t.task_id);
          t.estado = task ? task.estado : "desconocido";
        }
        return send(res, 200, traces);
      }
      if (req.method === "GET" && url.pathname.startsWith("/tasks/") && url.pathname.endsWith("/trace")) {
        const match = url.pathname.match(/^\/tasks\/([\w-]+)\/trace$/);
        if (match) {
          const trace = getTrace(match[1]);
          if (!trace) return send(res, 404, { error: "traza no encontrada" });
          return send(res, 200, { steps: trace.steps, startedAt: trace.startedAt });
        }
      }
      if (req.method === "GET" && url.pathname === "/live/stream") {
        // SSE: enviar actualizaciones de la traza activa (si hay una sola en curso)
        const headers = {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        };
        res.writeHead(200, headers);

        // Enviar inicial
        const initialTraces = listTraces();
        for (const t of initialTraces) {
          const task = tasks.get(t.task_id);
          t.estado = task ? task.estado : "desconocido";
        }
        res.write(`data: ${JSON.stringify({ type: "init", traces: initialTraces })}\n\n`);

        // Enviar actualizaciones cada 500 ms (simplificado: sin cleanup en cierre)
        const interval = setInterval(() => {
          if (res.writableEnded) { clearInterval(interval); return; }
          const currentTraces = listTraces();
          for (const t of currentTraces) {
            const task = tasks.get(t.task_id);
            t.estado = task ? task.estado : "desconocido";
          }
          res.write(`data: ${JSON.stringify({ type: "update", traces: currentTraces })}\n\n`);
        }, 500);

        req.on("close", () => {
          clearInterval(interval);
          res.end();
        });
        return;
      }
    }

    send(res, 404, { error: "no encontrado" });
  } catch (e: any) { send(res, 500, { error: "error interno" }); log("error: " + e?.message); }
});

// Verificación de memoria (para Railway 0.5 GB)
const checkMemory = () => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  if (used > MEMORY_LIMIT_MB) {
    log(`advertencia: memoria usada ${used.toFixed(1)} MB excede límite ${MEMORY_LIMIT_MB} MB`);
  }
};
setInterval(checkMemory, 10000);

server.listen(PORT, () => log(`agente escuchando en :${PORT}`));
