import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAction, redact } from "../src/agent.ts";
import { keysymFor, toPng } from "../src/rfb.ts";

test("validateAction rechaza coordenadas fuera de pantalla y tipos inválidos", () => {
  assert.equal(validateAction({ tipo: "click", x: 10, y: 10 }, 1280, 800), null);
  assert.ok(validateAction({ tipo: "click", x: 1280, y: 10 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: -1, y: 10 }, 1280, 800));
  assert.ok(validateAction({ tipo: "rm -rf" }, 1280, 800));
  assert.ok(validateAction({ tipo: "type" }, 1280, 800));
  assert.ok(validateAction({ tipo: "done" }, 1280, 800));
  assert.equal(validateAction({ tipo: "fail", resumen: "x" }, 1280, 800), null);
});

test("redact oculta la contraseña del escritorio en el resumen", () => {
  assert.equal(redact("clave a722eb81 usada", ["a722eb81"]), "clave [oculto] usada");
  assert.equal(redact("sin secreto", [""]), "sin secreto");
});

test("keysymFor: ASCII, Latin-1 y Unicode directo (BMP)", () => {
  assert.equal(keysymFor("a"), 0x61);
  assert.equal(keysymFor("é"), 0xe9);
  assert.equal(keysymFor("ñ"), 0xf1);
  // Unicode BMP (<= U+FFFF) se devuelve directamente
  assert.equal(keysymFor("€"), 0x20ac);
  assert.equal(keysymFor("\n"), 0xff0d);
});

test("toPng genera PNG válido y recorta con escala", () => {
  const f = { width: 4, height: 4, rgba: new Uint8Array(4 * 4 * 4).fill(255) };
  const png = toPng(f);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const crop = toPng(f, { x: 0, y: 0, w: 2, h: 2, scale: 2 });
  assert.equal(crop.readUInt32BE(16), 4);
});
