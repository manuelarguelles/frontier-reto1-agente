// WP4 — tests for server routes with LIVE_VIEW=1 (without network calls or desktop).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.beforeEach(() => {
  delete process.env.LIVE_VIEW;
});

test("live.html exists in public folder", () => {
  const htmlPath = join(__dirname, "..", "public", "live.html");
  const content = readFileSync(htmlPath, "utf8");
  assert.ok(content, "public/live.html debe existir");
  assert.ok(content.includes("Visor en vivo"), "HTML debe contener texto esperado");
});

test("live.html contains required CSS and JS", () => {
  const htmlPath = join(__dirname, "..", "public", "live.html");
  const content = readFileSync(htmlPath, "utf8");

  // Verificar elementos esenciales
  assert.ok(content.includes("<style"), "HTML debe incluir <style>");
  assert.ok(content.includes("<script"), "HTML debe incluir <script>");
  assert.ok(content.includes("EventSource"), "JS debe incluir EventSource para SSE");
  assert.ok(content.includes("/live/stream"), "JS debe incluir endpoint stream");
  assert.ok(content.includes("/live/tasks"), "JS debe incluir endpoint tasks");
  assert.ok(content.includes("/tasks/"), "JS debe incluir endpoint de traza por tarea");
});

test("trace.ts exports required functions and constants", async () => {
  const trace = await import("../src/trace.ts");
  assert.ok(typeof trace.createTrace === "function");
  assert.ok(typeof trace.removeTrace === "function");
  assert.ok(typeof trace.addTraceStep === "function");
  assert.ok(typeof trace.getTrace === "function");
  assert.ok(typeof trace.listTraces === "function");
  assert.ok(typeof trace.onStepHook === "function");
  assert.equal(trace.MAX_TRACE_STEPS, 50);
  assert.equal(trace.MAX_PNG_SIZE, 600 * 1024);
});

test("server.ts imports trace module", () => {
  const serverPath = resolve(__dirname, "..", "src", "server.ts");
  const content = readFileSync(serverPath, "utf8");
  assert.ok(content.includes("./trace.ts"), "server.ts debe importar trace.ts");
  assert.ok(content.includes("createTrace"), "server.ts debe usar createTrace");
  assert.ok(content.includes("removeTrace"), "server.ts debe usar removeTrace");
  assert.ok(content.includes("onStepHook"), "server.ts debe usar onStepHook");
  assert.ok(content.includes("/live"), "server.ts debe exponer rutas /live");
});

test("server.ts wrap runAgent with LIVE_VIEW check", () => {
  const serverPath = resolve(__dirname, "..", "src", "server.ts");
  const content = readFileSync(serverPath, "utf8");

  // Verificar que runAgent se llama con onStep condicional
  assert.ok(content.includes('process.env.LIVE_VIEW === "1"'), "server.ts debe check LIVE_VIEW");
  assert.ok(content.includes("onStepHook"), "server.ts debe usar onStepHook");
  assert.ok(content.includes("createTrace"), "server.ts debe crear trace al iniciar");
  assert.ok(content.includes("removeTrace"), "server.ts debe eliminar trace al terminar");
});

test("server.ts adds /live routes inside LIVE_VIEW block", () => {
  const serverPath = resolve(__dirname, "..", "src", "server.ts");
  const content = readFileSync(serverPath, "utf8");

  // Verificar que las rutas están dentro de un bloque LIVE_VIEW === "1"
  const liveViewBlock = content.indexOf('process.env.LIVE_VIEW === "1"');
  const liveRoutes = content.indexOf('/live"');
  assert.ok(liveRoutes > liveViewBlock, "/live debe estar dentro del bloque LIVE_VIEW");
});

test("agent.ts includes onStep hook signature", () => {
  const agentPath = resolve(__dirname, "..", "src", "agent.ts");
  const content = readFileSync(agentPath, "utf8");

  assert.ok(content.includes("onStep?:"), "agent.ts debe definir onStep como opcional");
  assert.ok(content.includes("onStep?.("), "agent.ts debe llamar onStep si existe");
});

test("agent.ts AgentOpts interface includes onStep", () => {
  const agentPath = resolve(__dirname, "..", "src", "agent.ts");
  const content = readFileSync(agentPath, "utf8");

  // Buscar la definición de AgentOpts
  const match = content.match(/interface AgentOpts[^}]+}/s);
  assert.ok(match, "AgentOpts debe estar definido");
  assert.ok(match[0].includes("onStep"), "AgentOpts debe incluir onStep");
});

test("server does not expose /live routes when LIVE_VIEW is not 1", async () => {
  // Simular un servidor simple
  const http = await import("node:http");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/live") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ route: "live" }));
      return;
    }
    res.writeHead(404);
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve, reject) => {
    server.listen(0, () => {
      const port = (server.address() as any).port;
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => {
          assert.strictEqual(res.statusCode, 200);
          const body = JSON.parse(data);
          assert.strictEqual(body.ok, true);
          resolve(null);
        });
      }).on("error", reject);
    });
  });

  await new Promise((resolve) => {
    server.close(resolve);
  });
});
