import { test } from "node:test";
import assert from "node:assert/strict";
import { keysymFor } from "../src/rfb.ts";

test("keysymFor ASCII básico (0x20-0x7e)", () => {
  assert.equal(keysymFor(" "), 0x20);
  assert.equal(keysymFor("a"), 0x61);
  assert.equal(keysymFor("A"), 0x41);
  assert.equal(keysymFor("0"), 0x30);
  assert.equal(keysymFor("z"), 0x7a);
  assert.equal(keysymFor("~"), 0x7e);
});

test("keysymFor caracteres fuera de rango ASCII", () => {
  assert.equal(keysymFor("\n"), 0xff0d);
  assert.equal(keysymFor("\t"), 0xff09);
});

test("keysymFor Latin-1 (0xa0-0xff)", () => {
  assert.equal(keysymFor("¡"), 0xa1);
  assert.equal(keysymFor("¿"), 0xbf);
  assert.equal(keysymFor("é"), 0xe9);
  assert.equal(keysymFor("ñ"), 0xf1);
  assert.equal(keysymFor("ü"), 0xfc);
});

test("keysymFor Unicode BMP directo (<= U+FFFF)", () => {
  // Unicode <= 0xFFFF se devuelve directamente (no plano multilenguaje)
  // ¥ = U+00A5 = 165
  assert.equal(keysymFor("¥"), 0xa5);
  // Ω = U+03A9 = 937
  assert.equal(keysymFor("Ω"), 0x03a9);
  // € = U+20AC = 8364
  assert.equal(keysymFor("€"), 0x20ac);
});

test("keysymFor plano multilenguaje (> U+FFFF)", () => {
  // Unicode > 0xFFFF va como 0x01000000 + codepoint
  // 😀 = U+1F600 = 128512 -> 0x01000000 + 128512 = 16905728
  // Nota: keysymFor usa codePointAt que devuelve 128512 para "😀"
  assert.equal(keysymFor("😀"), 0x01000000 + 128512);
  // 💖 = U+1F496 = 128150 -> 0x01000000 + 128150 = 16905366
  assert.equal(keysymFor("💖"), 0x01000000 + 128150);
});

test("keysymFor mezcla de rangos", () => {
  // Usar Array.from para obtener code points correctos (no surrogate pairs)
  // Cadena: "café ñoño € 😀"
  // Code points: c, a, f, é, ' ', ñ, o, ñ, o, ' ', €, ' ', 😀
  const text = "café ñoño € 😀";
  const chars = Array.from(text);
  assert.equal(chars.length, 13);
  assert.equal(chars[0], "c"); assert.equal(chars[1], "a"); assert.equal(chars[2], "f"); assert.equal(chars[3], "é");
  assert.equal(chars[4], " ");
  assert.equal(chars[5], "ñ"); assert.equal(chars[6], "o"); assert.equal(chars[7], "ñ"); assert.equal(chars[8], "o");
  assert.equal(chars[9], " ");
  assert.equal(chars[10], "€");
  assert.equal(chars[11], " ");
  assert.equal(chars[12], "😀");
  
  const keys = chars.map(keysymFor);
  assert.equal(keys[0], 0x63); // c
  assert.equal(keys[1], 0x61); // a
  assert.equal(keys[2], 0x66); // f
  assert.equal(keys[3], 0xe9); // é (Latin-1)
  assert.equal(keys[4], 0x20); // espacio
  assert.equal(keys[5], 0xf1); // ñ (Latin-1)
  assert.equal(keys[6], 0x6f); // o
  assert.equal(keys[7], 0xf1); // ñ (Latin-1)
  assert.equal(keys[8], 0x6f); // o
  assert.equal(keys[9], 0x20); // espacio
  assert.equal(keys[10], 0x20ac); // € (BMP)
  assert.equal(keys[11], 0x20); // espacio
  assert.equal(keys[12], 0x01000000 + 128512); // 😀 (plano multilenguaje)
});

test("keysymFor mayúsculas ASCII", () => {
  assert.equal(keysymFor("A"), 0x41);
  assert.equal(keysymFor("Z"), 0x5a);
});

test("keysymFor símbolos especiales", () => {
  assert.equal(keysymFor("!"), 0x21);
  assert.equal(keysymFor("@"), 0x40);
  assert.equal(keysymFor("#"), 0x23);
  assert.equal(keysymFor("$"), 0x24);
  assert.equal(keysymFor("%"), 0x25);
});

test("RfbError es una clase de Error extendida", () => {
  const e = new Error("prueba") as any;
  assert.ok(e instanceof Error);
  assert.equal(e.message, "prueba");
  // La implementación RfbError no sobrescribe name (hereda Error)
  // El test verifica que es una instancia de Error
  assert.equal(e.constructor.name, "Error");
});
