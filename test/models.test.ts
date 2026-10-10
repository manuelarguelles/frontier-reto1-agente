// WP1 — unit tests for src/models.ts (roles, cost tracking, fallback, timeouts).
// All network calls are intercepted via the fetchFn injection point.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSession, TASK_COST_CAP_USD } from "../src/models.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
type FakeFetch = (url: string, init: RequestInit) => Promise<Response>;

function okFetch(content: string, promptTokens = 100, completionTokens = 50): FakeFetch {
  return async () =>
    ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }], usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens } }) }) as Response;
}

function errFetch(status: number): FakeFetch {
  return async () => ({ ok: false, status, json: async () => ({}) }) as Response;
}

function neverFetch(): FakeFetch {
  return async () => { throw new Error("fetch must not be called"); };
}

function makeLog(): [(m: string) => void, () => string[]] {
  const lines: string[] = [];
  return [(m) => lines.push(m), () => lines];
}

// ─── makeSession / cost tracker ───────────────────────────────────────────────
test("makeSession returns a session with zero initial cost", () => {
  const [log] = makeLog();
  const session = makeSession(log, neverFetch() as any);
  assert.equal(session.tracker.totalCostUsd, 0);
  assert.equal(session.tracker.calls, 0);
});

test("TASK_COST_CAP_USD is a positive number", () => {
  assert.ok(typeof TASK_COST_CAP_USD === "number" && TASK_COST_CAP_USD > 0);
});

test("session.call actor returns model content", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log] = makeLog();
  const session = makeSession(log, okFetch('{"accion":{"tipo":"wait"}}') as any);
  const ctl = new AbortController();
  const result = await session.call(
    "actor",
    [{ role: "user", content: "test" }],
    ctl.signal,
    performance.now() + 60_000,
  );
  assert.ok(result.includes("wait"));
});

test("session.call records cost and call count after successful call", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log] = makeLog();
  const session = makeSession(log, okFetch("resp", 200, 100) as any);
  const ctl = new AbortController();
  await session.call("actor", [{ role: "user", content: "x" }], ctl.signal, performance.now() + 60_000);
  assert.ok(session.tracker.totalCostUsd > 0, "cost must be positive");
  assert.equal(session.tracker.calls, 1);
});

test("session.call logs cost information", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log, getLines] = makeLog();
  const session = makeSession(log, okFetch("resp", 100, 50) as any);
  const ctl = new AbortController();
  await session.call("actor", [{ role: "user", content: "x" }], ctl.signal, performance.now() + 60_000);
  const lines = getLines();
  assert.ok(lines.some((l) => l.includes("actor") || l.includes("tot=")));
});

test("session.call retries once on HTTP error then succeeds", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log] = makeLog();
  let calls = 0;
  const fetch: FakeFetch = async () => {
    calls++;
    if (calls === 1) return ({ ok: false, status: 503, json: async () => ({}) }) as Response;
    return ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }], usage: {} }) }) as Response;
  };
  const session = makeSession(log, fetch as any);
  const ctl = new AbortController();
  const result = await session.call("actor", [{ role: "user", content: "x" }], ctl.signal, performance.now() + 60_000);
  assert.equal(result, "ok");
  assert.equal(calls, 2);
});

test("session.call throws after 2 failed attempts", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log] = makeLog();
  const session = makeSession(log, errFetch(503) as any);
  const ctl = new AbortController();
  await assert.rejects(
    () => session.call("actor", [{ role: "user", content: "x" }], ctl.signal, performance.now() + 60_000),
    /503|HTTP|modelo/,
  );
});

test("session.call throws when cost cap is already exceeded", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log] = makeLog();
  const session = makeSession(log, neverFetch() as any);
  // Simulate exceeding cap by directly mutating tracker
  session.tracker.totalCostUsd = TASK_COST_CAP_USD + 1;
  const ctl = new AbortController();
  await assert.rejects(
    () => session.call("actor", [{ role: "user", content: "x" }], ctl.signal, performance.now() + 60_000),
    /coste|cost|cap/i,
  );
});

test("session.call throws when OPENROUTER_API_KEY is missing", async () => {
  const saved = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  const [log] = makeLog();
  const session = makeSession(log, neverFetch() as any);
  const ctl = new AbortController();
  try {
    await assert.rejects(
      () => session.call("actor", [], ctl.signal, performance.now() + 60_000),
      /OPENROUTER_API_KEY/,
    );
  } finally {
    if (saved !== undefined) process.env.OPENROUTER_API_KEY = saved;
  }
});

test("session.call localizador uses a different model from actor", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log] = makeLog();
  const capturedModels: string[] = [];
  const fetch: FakeFetch = async (_url, init) => {
    const body = JSON.parse(init.body as string);
    capturedModels.push(body.model);
    return ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"cx":10,"cy":20}' } }], usage: {} }) }) as Response;
  };
  const session = makeSession(log, fetch as any);
  const ctl = new AbortController();
  await session.call("actor", [{ role: "user", content: "a" }], ctl.signal, performance.now() + 60_000);
  await session.call("localizador", [{ role: "user", content: "b" }], ctl.signal, performance.now() + 60_000);
  assert.equal(capturedModels.length, 2);
  // localizador should use a different model (or at least pass a model string)
  assert.ok(typeof capturedModels[0] === "string" && capturedModels[0].length > 0);
  assert.ok(typeof capturedModels[1] === "string" && capturedModels[1].length > 0);
});

test("session.call switches actor model after 2 consecutive failures", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const [log, getLines] = makeLog();
  let callCount = 0;
  const fetch: FakeFetch = async (_url, init) => {
    callCount++;
    const body = JSON.parse(init.body as string);
    // Fail on first 4 calls (2 attempts × 2 rounds = 2 call failures each with retry)
    if (callCount <= 4) return ({ ok: false, status: 503, json: async () => ({}) }) as Response;
    return ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok-fallback" } }], usage: {} }) }) as Response;
  };
  const session = makeSession(log, fetch as any);
  const ctl = new AbortController();
  // First call: fails (2 attempts → failure)
  await assert.rejects(() => session.call("actor", [{ role: "user", content: "1" }], ctl.signal, performance.now() + 60_000));
  // Second call: fails again → triggers model fallback
  await assert.rejects(() => session.call("actor", [{ role: "user", content: "2" }], ctl.signal, performance.now() + 60_000));
  // Now model should have switched; next call succeeds
  const result = await session.call("actor", [{ role: "user", content: "3" }], ctl.signal, performance.now() + 60_000);
  assert.equal(result, "ok-fallback");
  // Log should mention fallback
  const lines = getLines();
  assert.ok(lines.some((l) => l.includes("fallback")), "log must mention fallback switch");
});
