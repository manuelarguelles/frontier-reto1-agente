import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const mk = (port: number, live: boolean) => spawn("node", ["src/server.ts"], { env: { ...process.env, TEAM_TOKEN: "t", PORT: String(port), DATA_DIR: "/tmp/wp4tok-" + port, ...(live ? { LIVE_VIEW: "1" } : {}) }, stdio: "ignore" });
const on = mk(18311, true), off = mk(18312, false);
after(() => { on.kill(); off.kill(); });
await new Promise((r) => setTimeout(r, 1200));
const get = (port: number, path: string) => fetch(`http://127.0.0.1:${port}${path}`).then((r) => r.status);

test("con LIVE_VIEW=1, ?token= abre /live pero no /health ni /tasks", async () => {
  assert.equal(await get(18311, "/live?token=t"), 200);
  assert.equal(await get(18311, "/live?token=mal"), 401);
  assert.equal(await get(18311, "/health?token=t"), 401);
  assert.equal(await get(18311, "/tasks/abc?token=t"), 401);
});
test("sin LIVE_VIEW, ?token= nunca autentica", async () => {
  assert.equal(await get(18312, "/live?token=t"), 401);
  assert.equal(await get(18312, "/health?token=t"), 401);
});
