import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 18099, H = { Authorization: "Bearer t", "Content-Type": "application/json" };
const p = spawn("node", ["src/server.ts"], { env: { ...process.env, TEAM_TOKEN: "t", PORT: String(PORT), DATA_DIR: "/tmp/ci-data-" + process.pid }, stdio: "ignore" });
after(() => p.kill());
await new Promise((r) => setTimeout(r, 1200));
const call = (path: string, init: any = {}) => fetch(`http://127.0.0.1:${PORT}${path}`, init);

test("todas las rutas exigen Bearer", async () => {
  assert.equal((await call("/health")).status, 401);
  assert.equal((await call("/health", { headers: { Authorization: "Bearer mal" } })).status, 401);
  assert.equal((await call("/health", { headers: H })).status, 200);
});

test("POST /tasks valida el cuerpo y responde task_id rápido; GET devuelve estado", async () => {
  assert.equal((await call("/tasks", { method: "POST", headers: H, body: "{}" })).status, 400);
  const t0 = Date.now();
  const r = await call("/tasks", { method: "POST", headers: H, body: JSON.stringify({ tarea: "x", escritorio: { url: "ws://127.0.0.1:1/websockify", password: "pw" } }) });
  assert.equal(r.status, 200);
  const { task_id } = await r.json();
  assert.ok(Date.now() - t0 < 2000 && task_id);
  const s = await (await call(`/tasks/${task_id}`, { headers: H })).json();
  assert.ok(["en_curso", "fallida"].includes(s.estado));
  assert.ok(!JSON.stringify(s).includes("pw"));
  assert.equal((await call("/tasks/inexistente", { headers: H })).status, 404);
});
