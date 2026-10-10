// Tests unitarios de WP2: parseo/validación con respuestas de modelo malformadas
import { test } from "node:test";
import assert from "node:assert/strict";

// Re-exportar funciones de agent.ts para testing
import { validateAction, redact, parseJson } from "../src/agent.ts";

test("validateAction acepta acciones válidas", () => {
  // Click válido
  assert.equal(validateAction({ tipo: "click", x: 100, y: 200 }, 1280, 800), null);
  // Double click válido
  assert.equal(validateAction({ tipo: "double_click", x: 640, y: 400 }, 1280, 800), null);
  // Right click válido
  assert.equal(validateAction({ tipo: "right_click", x: 1279, y: 799 }, 1280, 800), null);
  // Replace text válido
  assert.equal(validateAction({ tipo: "replace_text", texto: "Hola Mundo" }, 1280, 800), null);
  // Type válido
  assert.equal(validateAction({ tipo: "type", texto: "texto cualquiera" }, 1280, 800), null);
  // Key válido
  assert.equal(validateAction({ tipo: "key", tecla: "Enter" }, 1280, 800), null);
  // Scroll válido
  assert.equal(validateAction({ tipo: "scroll", x: 100, y: 100, dy: 5 }, 1280, 800), null);
  // Wait válido
  assert.equal(validateAction({ tipo: "wait" }, 1280, 800), null);
  // Done válido
  assert.equal(validateAction({ tipo: "done", resumen: "Tarea completada" }, 1280, 800), null);
  // Fail válido
  assert.equal(validateAction({ tipo: "fail", resumen: "Tarea fallida" }, 1280, 800), null);
});

test("validateAction rechaza acciones inválidas", () => {
  // Tipo inválido
  assert.ok(validateAction({ tipo: "rm -rf" }, 1280, 800));
  assert.ok(validateAction({ tipo: "unknown" }, 1280, 800));
  assert.ok(validateAction({}, 1280, 800));
  
  // Coordenadas fuera de pantalla
  assert.ok(validateAction({ tipo: "click", x: 1280, y: 0 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: -1, y: 0 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 0, y: 800 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 0, y: -1 }, 1280, 800));
  
  // Type sin texto
  assert.ok(validateAction({ tipo: "type" }, 1280, 800));
  assert.ok(validateAction({ tipo: "type", texto: 123 }, 1280, 800));
  
  // Replace text sin texto
  assert.ok(validateAction({ tipo: "replace_text" }, 1280, 800));
  assert.ok(validateAction({ tipo: "replace_text", texto: null }, 1280, 800));
  
  // Key sin tecla
  assert.ok(validateAction({ tipo: "key" }, 1280, 800));
  assert.ok(validateAction({ tipo: "key", tecla: 123 }, 1280, 800));
  
  // Done sin resumen
  assert.ok(validateAction({ tipo: "done" }, 1280, 800));
  assert.ok(validateAction({ tipo: "done", resumen: 123 }, 1280, 800));
  
  // Fail sin resumen
  assert.ok(validateAction({ tipo: "fail" }, 1280, 800));
});

test("validateAction acepta coordenadas límite", () => {
  // Bordes de pantalla
  assert.equal(validateAction({ tipo: "click", x: 0, y: 0 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "click", x: 1279, y: 799 }, 1280, 800), null);
});

test("validateAction rechaza coordenadas decimales fuera de rango", () => {
  // Aunque x e y sean decimales, deben estar en rango
  assert.ok(validateAction({ tipo: "click", x: 1280.5, y: 10 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 1279.999, y: 800 }, 1280, 800));
});

test("redact oculta múltiples secretos", () => {
  const secretos = ["pw123", "token456", "secret789"];
  const texto = "Contraseña: pw123, Token: token456, Secreto: secret789";
  const result = redact(texto, secretos);
  assert.equal(result, "Contraseña: [oculto], Token: [oculto], Secreto: [oculto]");
});

test("redact maneja secretos vacíos", () => {
  assert.equal(redact("texto normal", []), "texto normal");
  assert.equal(redact("texto normal", [""]), "texto normal");
  assert.equal(redact("texto normal", ["x"]), "texto normal");
});

test("redact no falsifica textos similares", () => {
  const result = redact("contraseña a722eb81 usada", ["a722eb81"]);
  assert.equal(result, "contraseña [oculto] usada");
  assert.ok(!result.includes("a722eb81"));
});

test("parseJson extrae JSON de texto con markdown", () => {
  const input = `Voy a hacer clic en el botón:
\`\`\`json
{"tipo": "click", "x": 100, "y": 200}
\`\`\`
`;
  const result = parseJson(input);
  assert.equal(result.tipo, "click");
  assert.equal(result.x, 100);
  assert.equal(result.y, 200);
});

test("parseJson maneja JSON simple", () => {
  const result = parseJson('{"tipo": "wait"}');
  assert.equal(result.tipo, "wait");
});

test("parseJson lanza error sin JSON", () => {
  assert.throws(() => parseJson("este es solo texto"), /sin JSON/);
  assert.throws(() => parseJson("{"), /sin JSON/);
  assert.throws(() => parseJson("}"), /sin JSON/);
});

test("parseJson extrae JSON anidado", () => {
  const input = `{
  "observacion": "Veo el botón",
  "plan": "Hacer clic",
  "accion": {"tipo": "click", "x": 50, "y": 60}
}`;
  const result = parseJson(input);
  assert.equal(result.accion.tipo, "click");
  assert.equal(result.accion.x, 50);
});

test("validateAction rechaza valores no numéricos en coordenadas", () => {
  assert.ok(validateAction({ tipo: "click", x: "100", y: 200 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 100, y: "200" }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: null, y: 200 }, 1280, 800));
});

test("validateAction rechaza tipo undefined", () => {
  assert.ok(validateAction({ tipo: undefined, x: 100, y: 200 }, 1280, 800));
});

test("validateAction acepta scroll sin dy explícito", () => {
  // dy es opcional, default 3
  const result = validateAction({ tipo: "scroll", x: 100, y: 100 }, 1280, 800);
  assert.equal(result, null);
});

test("validateAction acepta coordenadas flotantes dentro de rango", () => {
  assert.equal(validateAction({ tipo: "click", x: 100.5, y: 200.7 }, 1280, 800), null);
});
