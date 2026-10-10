// WP5 — Speed: tests for multi-action batches, adaptive settle, and token reduction.
// All tests cover exported helpers only; no network or desktop required.
import { test } from "node:test";
process.env.OPENROUTER_API_KEY ??= "test-key";
import assert from "node:assert/strict";

import {
  extractActions,
  isNavKey,
  adaptiveSettleParams,
  validateAction,
} from "../src/agent.ts";

// ── extractActions ────────────────────────────────────────────────────────────

test("extractActions returns single action wrapped in array from accion field", () => {
  const parsed = { accion: { tipo: "click", x: 10, y: 20 } };
  const acts = extractActions(parsed);
  assert.equal(acts.length, 1);
  assert.equal(acts[0].tipo, "click");
});

test("extractActions returns array from acciones field", () => {
  const parsed = {
    acciones: [
      { tipo: "click", x: 10, y: 20 },
      { tipo: "type", texto: "hola" },
    ],
  };
  const acts = extractActions(parsed);
  assert.equal(acts.length, 2);
  assert.equal(acts[0].tipo, "click");
  assert.equal(acts[1].tipo, "type");
});

test("extractActions caps acciones at 4", () => {
  const parsed = {
    acciones: [
      { tipo: "click", x: 1, y: 1 },
      { tipo: "click", x: 2, y: 2 },
      { tipo: "click", x: 3, y: 3 },
      { tipo: "click", x: 4, y: 4 },
      { tipo: "click", x: 5, y: 5 },
    ],
  };
  const acts = extractActions(parsed);
  assert.equal(acts.length, 4);
});

test("extractActions returns empty array for null/undefined parsed", () => {
  assert.deepEqual(extractActions(null), []);
  assert.deepEqual(extractActions(undefined), []);
  assert.deepEqual(extractActions({}), []);
});

test("extractActions prefers accion when both accion and acciones are present", () => {
  // legacy compat: if both, use accion (model still sent old format)
  const parsed = {
    accion: { tipo: "wait" },
    acciones: [{ tipo: "click", x: 1, y: 1 }],
  };
  const acts = extractActions(parsed);
  assert.equal(acts.length, 1);
  assert.equal(acts[0].tipo, "wait");
});

test("extractActions returns empty array when acciones is not an array", () => {
  assert.deepEqual(extractActions({ acciones: "invalid" }), []);
  assert.deepEqual(extractActions({ acciones: 42 }), []);
});

// ── isNavKey ─────────────────────────────────────────────────────────────────

test("isNavKey returns true for Enter", () => {
  assert.equal(isNavKey("Enter"), true);
});

test("isNavKey returns true for Tab", () => {
  assert.equal(isNavKey("Tab"), true);
});

test("isNavKey returns true for Escape", () => {
  assert.equal(isNavKey("Escape"), true);
});

test("isNavKey returns false for Backspace", () => {
  assert.equal(isNavKey("Backspace"), false);
});

test("isNavKey returns false for Ctrl+A", () => {
  assert.equal(isNavKey("Ctrl+A"), false);
});

test("isNavKey returns false for Down", () => {
  assert.equal(isNavKey("Down"), false);
});

test("isNavKey returns true for combo containing Enter", () => {
  assert.equal(isNavKey("Ctrl+Enter"), true);
});

test("isNavKey returns true for combo containing Tab", () => {
  assert.equal(isNavKey("Shift+Tab"), true);
});

// ── adaptiveSettleParams ──────────────────────────────────────────────────────

test("adaptiveSettleParams returns fast params for type", () => {
  const p = adaptiveSettleParams("type");
  assert.ok(p.minMs < 1000, "minMs should be less than 1000 for type");
  assert.ok(p.maxMs > 0);
});

test("adaptiveSettleParams returns fast params for replace_text", () => {
  const p = adaptiveSettleParams("replace_text");
  assert.ok(p.minMs < 1000, "minMs should be less than 1000 for replace_text");
});

test("adaptiveSettleParams returns fast params for non-nav key (Backspace)", () => {
  const p = adaptiveSettleParams("key", "Backspace");
  assert.ok(p.minMs < 1000, "minMs should be less than 1000 for Backspace key");
});

test("adaptiveSettleParams returns fast params for non-nav key (Ctrl+A)", () => {
  const p = adaptiveSettleParams("key", "Ctrl+A");
  assert.ok(p.minMs < 1000, "minMs should be less than 1000 for Ctrl+A");
});

test("adaptiveSettleParams returns standard params for click", () => {
  const p = adaptiveSettleParams("click");
  assert.ok(p.minMs >= 1000, "minMs should be >= 1000 for click");
});

test("adaptiveSettleParams returns standard params for double_click", () => {
  const p = adaptiveSettleParams("double_click");
  assert.ok(p.minMs >= 1000);
});

test("adaptiveSettleParams returns standard params for key(Enter)", () => {
  const p = adaptiveSettleParams("key", "Enter");
  assert.ok(p.minMs >= 1000, "minMs should be >= 1000 for Enter");
});

test("adaptiveSettleParams returns standard params for key(Tab)", () => {
  const p = adaptiveSettleParams("key", "Tab");
  assert.ok(p.minMs >= 1000, "minMs should be >= 1000 for Tab");
});

test("adaptiveSettleParams returns standard params for scroll", () => {
  const p = adaptiveSettleParams("scroll");
  assert.ok(p.minMs >= 1000);
});

test("adaptiveSettleParams returns standard params for wait", () => {
  const p = adaptiveSettleParams("wait");
  assert.ok(p.minMs >= 1000);
});

// ── validateAction compatibility with batch actions ───────────────────────────

test("validateAction rejects done inside what would be a batch (done must be solo)", () => {
  // done/fail must still pass validateAction individually (they're always valid solo actions);
  // the batch-level restriction is enforced by extractActions/loop, not validateAction.
  assert.equal(validateAction({ tipo: "done", resumen: "ok" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "fail", resumen: "err" }, 1280, 800), null);
});

test("validateAction accepts all batch-compatible action types", () => {
  const actions = [
    { tipo: "click", x: 100, y: 100 },
    { tipo: "type", texto: "abc" },
    { tipo: "replace_text", texto: "xyz" },
    { tipo: "key", tecla: "Tab" },
    { tipo: "scroll", x: 100, y: 100, dy: 3 },
    { tipo: "wait" },
  ];
  for (const act of actions) {
    assert.equal(validateAction(act, 1280, 800), null, `should accept ${act.tipo}`);
  }
});
