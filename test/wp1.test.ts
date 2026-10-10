// WP1: tests for src/models.ts and new agent.ts features (zoom, cropToScreen).
import { test } from "node:test";
process.env.OPENROUTER_API_KEY ??= "test-key";
import assert from "node:assert/strict";
import { makeSession, TASK_COST_CAP_USD } from "../src/models.ts";
import { validateAction, cropToScreen } from "../src/agent.ts";

type MockFetch = (url: string, init: RequestInit) => Promise<Response>;

function okFetch(content: string, usage = { prompt_tokens: 1000, completion_tokens: 200 }): MockFetch {
  return async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }], usage }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

// models.ts ───────────────────────────────────────────────────────────────────

test("makeSession crea tracker con coste y llamadas en cero", () => {
  const sess = makeSession(() => {}, okFetch("x") as any);
  assert.equal(sess.tracker.totalCostUsd, 0);
  assert.equal(sess.tracker.calls, 0);
});

test("TASK_COST_CAP_USD tiene valor positivo (default 0.60)", () => {
  assert.ok(typeof TASK_COST_CAP_USD === "number");
  assert.ok(TASK_COST_CAP_USD > 0);
});

test("call acumula coste y llamadas desde usage tokens", async () => {
  const sess = makeSession(() => {}, okFetch("respuesta", { prompt_tokens: 2000, completion_tokens: 300 }) as any);
  const ac = new AbortController();
  const result = await sess.call("actor", [{ role: "user", content: "test" }], ac.signal, performance.now() + 30_000);
  assert.equal(result, "respuesta");
  assert.equal(sess.tracker.calls, 1);
  assert.ok(sess.tracker.totalCostUsd > 0, "debe acumular coste");
});

test("call no incrementa calls si el modelo omite usage", async () => {
  const noUsageFetch: MockFetch = async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  const sess = makeSession(() => {}, noUsageFetch as any);
  const ac = new AbortController();
  await sess.call("actor", [{ role: "user", content: "x" }], ac.signal, performance.now() + 30_000);
  assert.equal(sess.tracker.calls, 0);
  assert.equal(sess.tracker.totalCostUsd, 0);
});

test("call reintenta una vez ante HTTP 503 y tiene exito en el segundo intento", async () => {
  let attempt = 0;
  const fetch: MockFetch = async () => {
    attempt++;
    if (attempt === 1) return new Response("err", { status: 503 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok-retry" } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  const sess = makeSession(() => {}, fetch as any);
  const ac = new AbortController();
  const result = await sess.call("actor", [{ role: "user", content: "x" }], ac.signal, performance.now() + 30_000);
  assert.equal(result, "ok-retry");
  assert.equal(attempt, 2, "debe haber intentado 2 veces");
});

test("call lanza error si el tope de coste ya esta superado", async () => {
  const sess = makeSession(() => {}, okFetch("x") as any);
  sess.tracker.totalCostUsd = 9999;
  const ac = new AbortController();
  await assert.rejects(
    () => sess.call("actor", [{ role: "user", content: "x" }], ac.signal, performance.now() + 30_000),
    /coste/i,
  );
});

test("call usa modelos distintos para roles actor y localizador", async () => {
  const usedModels: string[] = [];
  const fetch: MockFetch = async (_url, init) => {
    const body = JSON.parse(String(init.body));
    usedModels.push(body.model);
    return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  const sess = makeSession(() => {}, fetch as any);
  const ac = new AbortController();
  const dl = performance.now() + 30_000;
  await sess.call("actor", [{ role: "user", content: "x" }], ac.signal, dl);
  await sess.call("localizador", [{ role: "user", content: "x" }], ac.signal, dl);
  assert.notEqual(usedModels[0], usedModels[1], "actor y localizador deben usar modelos distintos");
});

test("call cambia de modelo tras 2 fallos consecutivos del mismo rol", async () => {
  const usedModels: string[] = [];
  const fetch: MockFetch = async (_url, init) => {
    const body = JSON.parse(String(init.body));
    usedModels.push(body.model);
    return new Response("err", { status: 503 });
  };
  const sess = makeSession(() => {}, fetch as any);
  const ac = new AbortController();
  const dl = performance.now() + 30_000;
  for (let i = 0; i < 2; i++) {
    await sess.call("actor", [{ role: "user", content: "x" }], ac.signal, dl).catch(() => {});
  }
  await sess.call("actor", [{ role: "user", content: "x" }], ac.signal, dl).catch(() => {});
  assert.notEqual(usedModels[0], usedModels[usedModels.length - 1], "debe cambiar al modelo de fallback tras 2 fallos");
});

// agent.ts: zoom action ───────────────────────────────────────────────────────

test("validateAction acepta zoom valido con recorte dentro de pantalla", () => {
  const err = validateAction({ tipo: "zoom", x: 100, y: 50, w: 200, h: 100, scale: 2, buscar: "boton Guardar" }, 1280, 800);
  assert.equal(err, null);
});

test("validateAction acepta zoom con scale 1 (minima)", () => {
  const err = validateAction({ tipo: "zoom", x: 0, y: 0, w: 100, h: 100, scale: 1, buscar: "campo" }, 1280, 800);
  assert.equal(err, null);
});

test("validateAction rechaza zoom cuyo recorte supera borde derecho", () => {
  const err = validateAction({ tipo: "zoom", x: 1200, y: 0, w: 200, h: 100, scale: 2, buscar: "x" }, 1280, 800);
  assert.ok(err, "debe rechazar recorte que se sale por la derecha");
});

test("validateAction rechaza zoom cuyo recorte supera borde inferior", () => {
  const err = validateAction({ tipo: "zoom", x: 0, y: 750, w: 100, h: 200, scale: 2, buscar: "x" }, 1280, 800);
  assert.ok(err, "debe rechazar recorte que supera altura");
});

test("validateAction rechaza zoom con w o h cero", () => {
  assert.ok(validateAction({ tipo: "zoom", x: 0, y: 0, w: 0, h: 100, scale: 2, buscar: "x" }, 1280, 800));
  assert.ok(validateAction({ tipo: "zoom", x: 0, y: 0, w: 100, h: 0, scale: 2, buscar: "x" }, 1280, 800));
});

test("validateAction rechaza zoom sin buscar o buscar vacio", () => {
  assert.ok(validateAction({ tipo: "zoom", x: 0, y: 0, w: 100, h: 100, scale: 2 }, 1280, 800));
  assert.ok(validateAction({ tipo: "zoom", x: 0, y: 0, w: 100, h: 100, scale: 2, buscar: "" }, 1280, 800));
});

test("validateAction rechaza zoom con scale menor que 1", () => {
  assert.ok(validateAction({ tipo: "zoom", x: 0, y: 0, w: 100, h: 100, scale: 0.5, buscar: "x" }, 1280, 800));
});

// agent.ts: cropToScreen ──────────────────────────────────────────────────────

test("cropToScreen convierte coords del localizador al espacio de pantalla", () => {
  const sc = cropToScreen({ x: 100, y: 50, w: 200, h: 100, scale: 2 }, 60, 40);
  assert.equal(sc.x, 130);
  assert.equal(sc.y, 70);
});

test("cropToScreen con scale 1 reproduce offset directamente", () => {
  const sc = cropToScreen({ x: 200, y: 300, w: 400, h: 200, scale: 1 }, 50, 75);
  assert.equal(sc.x, 250);
  assert.equal(sc.y, 375);
});

test("cropToScreen redondea a entero", () => {
  const sc = cropToScreen({ x: 100, y: 100, w: 50, h: 50, scale: 3 }, 10, 11);
  assert.equal(sc.x, 103);
  assert.equal(sc.y, 104);
});

import { normalizeResumen } from "../src/agent.ts";
test("normalizeResumen deja 'respuesta: <valor>' en línea propia y en minúscula", () => {
  assert.equal(normalizeResumen("Sumé 12+13=45. Respuesta: 45"), "Sumé 12+13=45.\nrespuesta: 45");
  assert.equal(normalizeResumen("texto\nrespuesta: 45; 7"), "texto\nrespuesta: 45; 7");
  assert.equal(normalizeResumen("Hice X sin pregunta"), "Hice X sin pregunta");
});

test("GET /tasks incluye causa cuando la tarea es fallida (campo aditivo del contrato)", async () => {
  const { spawn } = await import("node:child_process");
  const p = spawn("node", ["src/server.ts"], { env: { ...process.env, TEAM_TOKEN: "t", PORT: "18411", DATA_DIR: "/tmp/causa-" + process.pid }, stdio: "ignore" });
  try {
    await new Promise((r) => setTimeout(r, 1200));
    const H = { Authorization: "Bearer t", "Content-Type": "application/json" };
    const body = JSON.stringify({ tarea: "x", escritorio: { url: "ws://127.0.0.1:1/websockify", password: "pw" } });
    const { task_id } = await (await fetch("http://127.0.0.1:18411/tasks", { method: "POST", headers: H, body })).json();
    let s: any = {};
    for (let i = 0; i < 40 && s.estado !== "fallida"; i++) { await new Promise((r) => setTimeout(r, 500)); s = await (await fetch(`http://127.0.0.1:18411/tasks/${task_id}`, { headers: H })).json(); }
    assert.equal(s.estado, "fallida");
    assert.ok(typeof s.causa === "string" && s.causa.length > 0, "debe traer causa");
    assert.ok(!JSON.stringify(s).includes("pw"));
  } finally { p.kill(); }
});
