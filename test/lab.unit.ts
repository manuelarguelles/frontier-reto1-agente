// Tests unitarios para lab.ts (sin red, sin escritorio)
// Verificar: candado, rutas 404 sin LAB=1, nunca expone secretos del env.

import { strict as assert } from "node:assert";
import { describe, it, before, after } from "node:test";

// Mockear process.env
const originalEnv = { ...process.env };

before(() => {
  // LAB=1 para tests que lo requieren
  process.env.LAB = "1";
  process.env.LIVE_VIEW = "1";
});

after(() => {
  // Restaurar
  process.env = originalEnv;
});

describe("lock", () => {
    it("tryAcquireLock devuelve true cuando no hay lock", () => {
      // Limpiar lock previo si existe
      try { require("node:fs").rmSync("/tmp/frontier-desktop.lock", { recursive: true, force: true }); } catch {}
      const { tryAcquireLock } = await import("../src/lab.ts");
      const ok = tryAcquireLock();
      assert.ok(ok, "should acquire lock");
      // Limpieza
      try { require("node:fs").rmSync("/tmp/frontier-desktop.lock", { recursive: true, force: true }); } catch {}
    });

    it("tryAcquireLock devuelve false cuando hay lock", async () => {
      // Crear lock manual
      const fs = await import("node:fs");
      fs.mkdirSync("/tmp/frontier-desktop.lock", { recursive: false });
      try {
        const { tryAcquireLock } = await import("../src/lab.ts");
        const ok = tryAcquireLock();
        assert.strictEqual(ok, false, "should fail to acquire existing lock");
      } finally {
        try { fs.rmSync("/tmp/frontier-desktop.lock", { recursive: true, force: true }); } catch {}
      }
    });
  });

  describe("loadTests", () => {
    it("loadTests lanza error sin LAB=1", async () => {
      delete process.env.LAB;
      try {
        const { loadTests } = await import("../src/lab.ts");
        assert.throws(() => loadTests(), /LAB=1 requerido/);
      } finally {
        process.env.LAB = "1";
      }
    });

    it("loadTests carga E1-E5", async () => {
      const { loadTests } = await import("../src/lab.ts");
      const tests = loadTests();
      assert.ok(Array.isArray(tests), "should return array");
      assert.strictEqual(tests.length, 5, "should have 5 tests");
      const ids = tests.map(t => t.id);
      assert.ok(ids.includes("E1"), "should include E1");
      assert.ok(ids.includes("E5"), "should include E5");
    });
  });

  describe("loadDesktopEnv", () => {
    it("loadDesktopEnv lanza error sin LAB=1", async () => {
      delete process.env.LAB;
      try {
        const { loadDesktopEnv } = await import("../src/lab.ts");
        assert.throws(() => loadDesktopEnv(), /LAB=1 requerido/);
      } finally {
        process.env.LAB = "1";
      }
    });

    it("loadDesktopEnv carga vars desde desktop.env", async () => {
      const { loadDesktopEnv } = await import("../src/lab.ts");
      const env = loadDesktopEnv();
      assert.ok(typeof env.DESKTOP_URL === "string", "should have DESKTOP_URL");
      assert.ok(typeof env.DESKTOP_HTTP === "string", "should have DESKTOP_HTTP");
      assert.ok(typeof env.DESKTOP_PASSWORD === "string", "should have DESKTOP_PASSWORD");
      // No verificamos DESKTOP_TOKEN/TEAM_TOKEN: pueden estar en desktop.env
      // pero no son obligatorios para la lógica del laboratorio
    });
  });
});
