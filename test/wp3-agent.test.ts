import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, validateAction } from "../src/agent.ts";

test("redact oculta múltiples secretos en un string", () => {
  const secrets = ["pw123", "secretoclave", "token-xyz-999"];
  const input = "Conectado con pw123 y secretoclave, token-xyz-999 activo";
  const out = redact(input, secrets);
  assert.ok(out.includes("[oculto]"));
  assert.ok(!out.includes("pw123"));
  assert.ok(!out.includes("secretoclave"));
  assert.ok(!out.includes("token-xyz-999"));
});

test("redact no rompe strings sin secretos", () => {
  const input = "Este es un texto normal sin secretos";
  assert.equal(redact(input, []), input);
  assert.equal(redact(input, [""]), input);
  assert.equal(redact(input, [""]), input);
});

test("redact no incluye secretos cortos (<3 chars)", () => {
  const input = "x y z";
  assert.equal(redact(input, ["x", "ab"]), input);
});

test("validateAction acepta todas las acciones válidas", () => {
  assert.equal(validateAction({ tipo: "click", x: 100, y: 200 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "double_click", x: 640, y: 400 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "right_click", x: 10, y: 10, button: 4 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "type", texto: "Hola mundo" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "replace_text", texto: "Nuevo texto" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "key", tecla: "Enter" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "scroll", x: 100, y: 100, dy: 3 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "wait" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "done", resumen: "Tarea completada" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "fail", resumen: "Fallo: sin conexión" }, 1280, 800), null);
});

test("validateAction rechaza coordenadas fuera de límites", () => {
  assert.ok(validateAction({ tipo: "click", x: 1280, y: 0 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 0, y: 800 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: -1, y: 0 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 0, y: -1 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 1279.5, y: 800.1 }, 1280, 800));
});

test("validateAction rechaza acciones faltantes de datos requeridos", () => {
  assert.ok(validateAction({ tipo: "type" }, 1280, 800));
  assert.ok(validateAction({ tipo: "type", texto: 123 }, 1280, 800));
  assert.ok(validateAction({ tipo: "replace_text" }, 1280, 800));
  assert.ok(validateAction({ tipo: "key" }, 1280, 800));
  assert.ok(validateAction({ tipo: "key", tecla: 123 }, 1280, 800));
  assert.ok(validateAction({ tipo: "done" }, 1280, 800));
  assert.ok(validateAction({ tipo: "fail" }, 1280, 800));
});

test("validateAction rechaza tipo desconocido", () => {
  assert.ok(validateAction({ tipo: "rm -rf" }, 1280, 800));
  assert.ok(validateAction({ tipo: "goto" }, 1280, 800));
  assert.ok(validateAction({ tipo: "" }, 1280, 800));
  assert.ok(validateAction({}, 1280, 800));
  assert.ok(validateAction(null as any, 1280, 800));
  assert.ok(validateAction(123 as any, 1280, 800));
});

test("validateAction acepta coordenadas en bordes", () => {
  assert.equal(validateAction({ tipo: "click", x: 0, y: 0 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "click", x: 1279, y: 799 }, 1280, 800), null);
});

test("validateAction acepta scroll sin dy explícito", () => {
  assert.equal(validateAction({ tipo: "scroll", x: 100, y: 100 }, 1280, 800), null);
});
