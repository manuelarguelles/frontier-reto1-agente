// WP6: laboratorio local. Sin red ni escritorio real: fetch, disco y candado inyectados.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createLab, parseEnvText, LOCK_DIR } from "../src/lab.ts";

const SECRETS = { DESKTOP_URL: "wss://sec-host.example/websockify", DESKTOP_HTTP: "https://sec-host.example", DESKTOP_PASSWORD: "S3CRETPW", DESKTOP_TOKEN: "S3CRETTOK" };
const files: Record<string, string> = {
  "/p/desktop.env": Object.entries(SECRETS).map(([k, v]) => `${k}=${v}`).join("\n"),
  "/p/challenge-1/pruebas/E3-x.json": JSON.stringify({ id: "E3", nivel: "regular", instruccion: "¿Cuántas?", estado_esperado: "terminada", respuesta_esperada: "45", diff_esperado: [] }),
  "/p/challenge-1/pruebas/E1-x.json": JSON.stringify({ id: "E1", nivel: "facil", instruccion: "Crea", estado_esperado: "terminada", diff_esperado: [{ valor: "x" }] }),
};
const diskDeps = {
  privateDir: "/p", exists: (p: string) => p === "/p/challenge-1/pruebas" || p in files,
  readText: (p: string) => { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; },
  listDir: () => ["E3-x.json", "E1-x.json", "README.md"],
};
function mkRes() {
  const r: any = { code: 0, body: "", writeHead(c: number) { r.code = c; }, end(b: string) { r.body = b ?? ""; } };
  return r;
}
const req = (method: string, url: string) => ({ method, url, headers: {} }) as any;

test("sin LAB=1 las rutas /lab* dan 404 y no se lee disco", async () => {
  delete process.env.LAB;
  let reads = 0;
  const lab = createLab({ ...diskDeps, readText: () => { reads++; return ""; }, exists: () => { reads++; return true; } });
  for (const [m, u] of [["GET", "/lab"], ["GET", "/lab/tests"], ["POST", "/lab/run?id=all"], ["GET", "/lab/state"]]) {
    const res = mkRes();
    assert.equal(await lab.handle(req(m, u), res, () => true), true);
    assert.equal(res.code, 404, u);
  }
  assert.equal(reads, 0);
  assert.equal(await lab.handle(req("GET", "/health"), mkRes(), () => true), false);
});

test("con LAB=1 exige token y /lab/tests no expone secretos ni respuestas", async () => {
  process.env.LAB = "1";
  const lab = createLab(diskDeps);
  let res = mkRes();
  await lab.handle(req("GET", "/lab/tests"), res, () => false);
  assert.equal(res.code, 401);
  res = mkRes();
  await lab.handle(req("GET", "/lab/tests"), res, () => true);
  assert.equal(res.code, 200);
  const j = JSON.parse(res.body);
  assert.deepEqual(j.tests.map((t: any) => t.id), ["E1", "E3"]);
  assert.ok(j.tests[0].nivel && j.tests[0].instruccion && j.actor && j.cost_cap_usd > 0);
  for (const v of Object.values(SECRETS)) assert.ok(!res.body.includes(v));
  assert.ok(!res.body.includes("45") || !/respuesta/i.test(res.body));
  assert.ok(!res.body.includes("diff_esperado"));
  delete process.env.LAB;
});

test("parseEnvText lee claves con comillas y export", () => {
  assert.deepEqual(parseEnvText('A=1\nexport B="x y"\n# c\n'), { A: "1", B: "x y" });
});

test("candado: segundo run mientras hay uno -> 409; se libera al terminar; resultados sin secretos", async () => {
  process.env.LAB = "1";
  let locked = false, locks = 0;
  const calls: string[] = [];
  let taskPolls = 0;
  const fake = async (url: any, init: any = {}) => {
    const u = String(url); calls.push(`${init.method ?? "GET"} ${u}`);
    const J = (b: any, ok = true, status = 200) => ({ ok, status, json: async () => b }) as any;
    if (u.endsWith("/__reset")) { assert.equal(init.headers.Authorization, "Bearer S3CRETTOK"); return J({}); }
    if (u.endsWith("/__check")) return J({ pass: true, checks: [{ nombre: "cambios esperados", ok: true }] });
    if (u.endsWith("/tasks")) return J({ task_id: "t1" });
    if (u.endsWith("/trace")) return J({ steps: [{ step: 1, png: "AAAA", accion: { tipo: "click" }, observacion: "ok", costUsd: 0.01 }] });
    if (u.endsWith("/tasks/t1")) return J(++taskPolls < 2 ? { estado: "en_curso", resumen: "" } : { estado: "terminada", resumen: "clave S3CRETPW\nrespuesta: 45" });
    throw new Error("url inesperada " + u + " S3CRETTOK");
  };
  let release!: () => void; const gate = new Promise<void>((r) => (release = r));
  const lab = createLab({ ...diskDeps, fetch: fake as any, sleep: async (ms) => { if (ms === 6) await gate; }, resetWaitMs: 6, pollMs: 0,
    mkdirLock: () => { if (locked) return false; locked = true; locks++; return true; }, rmLock: () => { locked = false; },
    selfUrl: () => "http://self", teamToken: () => "TT" });
  const a = lab.start("E3");
  assert.equal(a.code, 202);
  assert.equal(lab.start("E1").code, 409);
  assert.equal(lab.start("zzz").code, 404);
  release();
  for (let i = 0; i < 50 && lab.state().running; i++) await new Promise((r) => setTimeout(r, 10));
  const st = lab.state();
  assert.equal(st.running, false); assert.equal(locked, false); assert.equal(locks, 1);
  const r = st.results[0];
  assert.equal(r.id, "E3"); assert.equal(r.ok, true); assert.equal(r.respuesta_ok, true); assert.equal(r.pasos, 1); assert.equal(r.coste_usd, 0.01);
  const dump = JSON.stringify(st);
  for (const v of Object.values(SECRETS)) assert.ok(!dump.includes(v), v);
  assert.ok(calls.some((c) => c.includes("/__reset")));
  delete process.env.LAB;
});

test("el candado real usa /tmp/frontier-desktop.lock", () => assert.equal(LOCK_DIR, "/tmp/frontier-desktop.lock"));

test("error en reset se reporta en español sin secretos", async () => {
  process.env.LAB = "1";
  const lab = createLab({ ...diskDeps, fetch: (async () => ({ ok: false, status: 503, json: async () => ({}) })) as any, sleep: async () => {},
    mkdirLock: () => true, rmLock: () => {} });
  lab.start("E1");
  for (let i = 0; i < 50 && lab.state().running; i++) await new Promise((r) => setTimeout(r, 10));
  const r = lab.state().results[0];
  assert.equal(r.estado, "error"); assert.ok(r.error?.includes("503"));
  delete process.env.LAB;
});

const PORT = 18123;
const p = spawn("node", ["src/server.ts"], { env: { ...process.env, TEAM_TOKEN: "t", PORT: String(PORT), DATA_DIR: "/tmp/lab-test-" + process.pid, LAB: "", LIVE_VIEW: "" }, stdio: "ignore" });
after(() => p.kill());
test("servidor real sin LAB=1: /lab da 404", async () => {
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/lab?token=t`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/lab/state`, { headers: { Authorization: "Bearer t" } })).status, 404);
});
