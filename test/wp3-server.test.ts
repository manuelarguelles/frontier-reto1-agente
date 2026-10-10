// Tests de WP3: robustez del servidor
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 18100, H = { Authorization: "Bearer t", "Content-Type": "application/json" };
const p = spawn("node", ["src/server.ts"], {
  env: { ...process.env, TEAM_TOKEN: "t", PORT: String(PORT), DATA_DIR: "/tmp/wp3-test-" + process.pid },
  stdio: "ignore"
});
after(() => p.kill());
await new Promise((r) => setTimeout(r, 1200));
const call = (path: string, init: any = {}) => fetch(`http://127.0.0.1:${PORT}${path}`, init);

test("server.ts expone /health con Bearer", async () => {
  const r = await call("/health", { headers: H });
  assert.equal(r.status, 200);
  const j: any = await r.json();
  assert.equal(j.ok, true);
});

test("server.ts valida POST /tasks con cuerpo correcto", async () => {
  const r = await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({
    tarea: "Consultar saldo de cuenta 123",
    escritorio: { url: "ws://127.0.0.1:9999/websockify", password: "pw123" }
  }) });
  assert.equal(r.status, 200);
  const j: any = await r.json();
  assert.ok(j.task_id);
  assert.ok(typeof j.task_id === "string" && j.task_id.length > 10);
});

test("server.ts rechaza POST /tasks sin tarea o escritorio inválido", async () => {
  // JSON inválido
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: "no es json" })).status, 400);
  // cuerpo vacío
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: "{}" })).status, 400);
  // tarea no string
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: 123 }) })).status, 400);
  // tarea vacía
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: "" }) })).status, 400);
  // escritorio no objecto
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: "x", escritorio: "y" }) })).status, 400);
  // url no string
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: "x", escritorio: { url: 123, password: "p" } }) })).status, 400);
  // password no string
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: "x", escritorio: { url: "ws://x", password: 123 } }) })).status, 400);
  // URL no empieza con ws/wss
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: "x", escritorio: { url: "http://x", password: "p" } }) })).status, 400);
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: "x", escritorio: { url: "ftp://x", password: "p" } }) })).status, 400);
});

test("server.ts permite unica tarea activa", async () => {
  const r1 = await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({
    tarea: "tarea lenta 1", escritorio: { url: "ws://127.0.0.1:9999/w", password: "p" }
  }) });
  const j1: any = await r1.json();
  const r2 = await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({
    tarea: "tarea lenta 2", escritorio: { url: "ws://127.0.0.1:9999/w", password: "p" }
  }) });
  const j2: any = await r2.json();
  assert.ok(j1.task_id);
  assert.ok(j2.task_id);
  // La segunda debe fallar explícita sin actuar
  const s2 = await (await call(`/tasks/${j2.task_id}`, { headers: H })).json();
  assert.equal(s2.estado, "fallida");
  assert.ok(s2.resumen.includes("ocupado") || s2.resumen.includes(" otra "));
});

test("server.ts GET /tasks/{id} devuelve estado y no expone contraseña", async () => {
  const r = await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({
    tarea: "prueba", escritorio: { url: "ws://127.0.0.1:9999/w", password: "secreto123" }
  }) });
  const j: any = await r.json();
  const s = await (await call(`/tasks/${j.task_id}`, { headers: H })).json();
  assert.ok(["en_curso", "fallida"].includes(s.estado));
  assert.ok(!s.resumen.includes("secreto123"));
});

test("server.ts GET /tasks/inexistente devuelve 404", async () => {
  const r = await call("/tasks/inexistente", { headers: H });
  assert.equal(r.status, 404);
  const j: any = await r.json();
  assert.ok(j.error);
});

test("server.ts devuelve 401 sin autorización válida", async () => {
  assert.equal((await call("/health")).status, 401);
  assert.equal((await call("/health", { headers: { Authorization: "Bearer mal" } })).status, 401);
});

test("server.ts maneja rutas no definidas con 404", async () => {
  assert.equal((await call("/otro", { headers: H })).status, 404);
});
