import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAction } from "../src/agent.ts";

test("validateAction rechaza tipos inválidos y respuestas malformadas", () => {
  // Tipo inválido
  assert.ok(validateAction({ tipo: "invalido" }, 1280, 800));
  assert.ok(validateAction({ tipo: "" }, 1280, 800));
  assert.ok(validateAction({}, 1280, 800));
  assert.ok(validateAction(null, 1280, 800));
  assert.ok(validateAction(undefined, 1280, 800));
  assert.ok(validateAction("click", 1280, 800));
  
  // JSON incompleto
  assert.ok(validateAction({ tipo: "click" }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 10 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", y: 10 }, 1280, 800));
  
  // Coordenadas no numéricas
  assert.ok(validateAction({ tipo: "click", x: "10", y: 10 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 10, y: "10" }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: NaN, y: 10 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 10, y: Infinity }, 1280, 800));
});

test("validateAction rechaza coordenadas fuera de pantalla", () => {
  // Límites exactos
  assert.equal(validateAction({ tipo: "click", x: 0, y: 0 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "click", x: 1279, y: 799 }, 1280, 800), null);
  
  // Fuera de límites
  assert.ok(validateAction({ tipo: "click", x: 1280, y: 0 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 0, y: 800 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: -1, y: 0 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 0, y: -1 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: 2000, y: 1500 }, 1280, 800));
});

test("validateAction valida acciones que requieren texto", () => {
  // replace_text y type requieren texto no vacío (string)
  assert.ok(validateAction({ tipo: "replace_text" }, 1280, 800));
  assert.ok(validateAction({ tipo: "replace_text", texto: null }, 1280, 800));
  assert.ok(validateAction({ tipo: "replace_text", texto: 123 }, 1280, 800));
  assert.equal(validateAction({ tipo: "replace_text", texto: "hola" }, 1280, 800), null);
  
  assert.ok(validateAction({ tipo: "type" }, 1280, 800));
  assert.ok(validateAction({ tipo: "type", texto: null }, 1280, 800));
  assert.ok(validateAction({ tipo: "type", texto: 123 }, 1280, 800));
  assert.equal(validateAction({ tipo: "type", texto: "mundo" }, 1280, 800), null);
  
  // type con caracteres especiales
  assert.equal(validateAction({ tipo: "type", texto: "áéíóúñ" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "type", texto: "¡Hola! ¿Cómo estás?" }, 1280, 800), null);
});

test("validateAction valida acciones de tecla", () => {
  // key requiere tecla no vacía (string)
  assert.ok(validateAction({ tipo: "key" }, 1280, 800));
  assert.ok(validateAction({ tipo: "key", tecla: null }, 1280, 800));
  assert.ok(validateAction({ tipo: "key", tecla: 123 }, 1280, 800));
  assert.equal(validateAction({ tipo: "key", tecla: "Enter" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "key", tecla: "Ctrl+A" }, 1280, 800), null);
  
  // Teclas inválidas no se rechazan (validación en ejecución)
  assert.equal(validateAction({ tipo: "key", tecla: "F1" }, 1280, 800), null);
});

test("validateAction valida acciones terminales (done/fail)", () => {
  // done y fail requieren resumen no vacío (string)
  assert.ok(validateAction({ tipo: "done" }, 1280, 800));
  assert.ok(validateAction({ tipo: "done", resumen: null }, 1280, 800));
  assert.ok(validateAction({ tipo: "done", resumen: 123 }, 1280, 800));
  assert.equal(validateAction({ tipo: "done", resumen: "Tarea completada" }, 1280, 800), null);
  
  assert.ok(validateAction({ tipo: "fail" }, 1280, 800));
  assert.ok(validateAction({ tipo: "fail", resumen: null }, 1280, 800));
  assert.ok(validateAction({ tipo: "fail", resumen: 123 }, 1280, 800));
  assert.equal(validateAction({ tipo: "fail", resumen: "Error: no se encontró el botón" }, 1280, 800), null);
});

test("validateAction valida acciones de scroll", () => {
  // scroll no requiere x/y obligatorias (son opcionales con valores por defecto)
  assert.equal(validateAction({ tipo: "scroll" }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "scroll", dy: 50 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "scroll", x: 100, y: 100, dy: 50 }, 1280, 800), null);
  
  // x/y fuera de pantalla si se dan
  assert.ok(validateAction({ tipo: "scroll", x: 1280, y: 100 }, 1280, 800));
  assert.ok(validateAction({ tipo: "scroll", x: 100, y: 800 }, 1280, 800));
  assert.ok(validateAction({ tipo: "scroll", x: -1, y: 100 }, 1280, 800));
  assert.ok(validateAction({ tipo: "scroll", x: 100, y: -1 }, 1280, 800));
});

test("validateAction valida acciones de click", () => {
  // click, double_click, right_click requieren x e y válidas
  assert.equal(validateAction({ tipo: "click", x: 100, y: 100 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "double_click", x: 200, y: 150 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "right_click", x: 300, y: 200 }, 1280, 800), null);
  
  // Falta x o y
  assert.ok(validateAction({ tipo: "click", x: 100 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", y: 100 }, 1280, 800));
});

test("validateAction valida wait (sin coordenadas)", () => {
  // wait no requiere coordenadas
  assert.equal(validateAction({ tipo: "wait" }, 1280, 800), null);
});

test("validateAction maneja coordenadas en punto flotante", () => {
  // Coordenadas válidas en punto flotante
  assert.equal(validateAction({ tipo: "click", x: 100.5, y: 200.7 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "click", x: 0.1, y: 0.1 }, 1280, 800), null);
  assert.equal(validateAction({ tipo: "click", x: 1279.9, y: 799.9 }, 1280, 800), null);
});

test("validateAction rechaza coordenadas infinitas o NaN", () => {
  assert.ok(validateAction({ tipo: "click", x: Infinity, y: 100 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: -Infinity, y: 100 }, 1280, 800));
  assert.ok(validateAction({ tipo: "click", x: NaN, y: 100 }, 1280, 800));
});

test("validateAction valida acción zoom (recorte ampliado)", () => {
  // El modelo propone zoom con coordenadas en el recorte
  assert.equal(validateAction({ tipo: "click", x: 50, y: 50 }, 640, 400), null);
  assert.equal(validateAction({ tipo: "click", x: 639, y: 399 }, 640, 400), null);
});
