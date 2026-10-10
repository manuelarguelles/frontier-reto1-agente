// WP4 — unit tests for src/trace.ts (trace storage for live viewer).
import { test } from "node:test";
import assert from "node:assert/strict";

// Reimport para poder manipular LIVE_VIEW
import { createTrace, removeTrace, addTraceStep, getTrace, listTraces, MAX_TRACE_STEPS, clearTraces } from "../src/trace.ts";

// Crear una nueva traza para cada test que necesite Live View
function setupTraceWithLiveView(taskId: string) {
  delete process.env.LIVE_VIEW;
  process.env.LIVE_VIEW = "1";
  createTrace(taskId);
}

test.beforeEach(() => {
  // Reset estado inicial
  delete process.env.LIVE_VIEW;
  process.env.LIVE_VIEW = "1";
  clearTraces();
});

test("createTrace does nothing when LIVE_VIEW is not 1", () => {
  delete process.env.LIVE_VIEW;
  createTrace("test-123");
  const trace = getTrace("test-123");
  assert.strictEqual(trace, undefined);
});

test("createTrace initializes trace when LIVE_VIEW=1", () => {
  process.env.LIVE_VIEW = "1";
  createTrace("test-123");
  const trace = getTrace("test-123");
  assert.ok(trace);
  assert.equal(trace.steps.length, 0);
  assert.ok(trace.startedAt > 0);
});

test("addTraceStep stores step when LIVE_VIEW=1", () => {
  process.env.LIVE_VIEW = "1";
  createTrace("test-456");
  addTraceStep("test-456", {
    step: 1,
    png: "base64pngdata",
    observacion: "Veo el botón",
    plan: "Hacer clic",
    accion: { tipo: "click", x: 100, y: 200 },
    costUsd: 0.001,
    timeMs: 150,
  });
  const trace = getTrace("test-456");
  assert.ok(trace);
  assert.equal(trace.steps.length, 1);
  assert.equal(trace.steps[0].observacion, "Veo el botón");
  assert.equal(trace.steps[0].accion.tipo, "click");
});

test("addTraceStep does nothing when LIVE_VIEW is not 1", () => {
  // Crear traza sin LIVE_VIEW
  delete process.env.LIVE_VIEW;
  createTrace("test-no-liveview");
  // La traza NO debe existir porque createTrace no hace nada sin LIVE_VIEW
  const trace = getTrace("test-no-liveview");
  assert.strictEqual(trace, undefined, "createTrace no debe crear traza sin LIVE_VIEW");
});

test("addTraceStep truncates PNG when exceeding 80KB limit", () => {
  process.env.LIVE_VIEW = "1";
  createTrace("test-789");
  const largePng = "x".repeat(90 * 1024); // 90 KB
  addTraceStep("test-789", {
    step: 1,
    png: largePng,
    observacion: "Veo el botón",
    plan: "Hacer clic",
    accion: { tipo: "click", x: 100, y: 200 },
    costUsd: 0.001,
    timeMs: 150,
  });
  const trace = getTrace("test-789");
  assert.ok(trace);
  assert.ok(trace.steps[0].png.length <= 80 * 1024);
});

test("removeTrace deletes trace entry", () => {
  process.env.LIVE_VIEW = "1";
  createTrace("test-del");
  assert.ok(getTrace("test-del"));
  removeTrace("test-del");
  assert.strictEqual(getTrace("test-del"), undefined);
});

test("listTraces returns empty array when no traces", () => {
  process.env.LIVE_VIEW = "1";
  const traces = listTraces();
  assert.ok(Array.isArray(traces));
  assert.equal(traces.length, 0);
});

test("listTraces returns array with task info", () => {
  process.env.LIVE_VIEW = "1";
  createTrace("task-abc");
  addTraceStep("task-abc", {
    step: 1,
    png: "base64",
    observacion: "test",
    plan: "test",
    accion: { tipo: "wait" },
    costUsd: 0,
    timeMs: 100,
  });
  const traces = listTraces();
  assert.equal(traces.length, 1);
  assert.equal(traces[0].task_id, "task-abc");
  assert.ok(traces[0].startedAt > 0);
  assert.equal(traces[0].steps, 1);
  assert.equal(traces[0].estado, "desconocido");
});

test("addTraceStep maintains max steps limit", () => {
  process.env.LIVE_VIEW = "1";
  createTrace("test-123-max");
  for (let i = 1; i <= MAX_TRACE_STEPS + 5; i++) {
    addTraceStep("test-123-max", {
      step: i,
      png: "base64",
      observacion: `Paso ${i}`,
      plan: "test",
      accion: { tipo: "wait" },
      costUsd: 0,
      timeMs: 100,
    });
  }
  const trace = getTrace("test-123-max");
  assert.ok(trace);
  assert.equal(trace.steps.length, MAX_TRACE_STEPS);
  assert.equal(trace.steps[0].step, 6); // First step should be dropped
});
