// Harness separado del worker: reset -> POST /tasks al agente -> sondeo -> __check. Uso: node scripts/harness.mjs E1 [agente=http://localhost:8099]
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(new URL("../private/desktop.env", import.meta.url), "utf8").trim().split("\n").map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const id = process.argv[2] ?? "E1", agent = process.argv[3] ?? "http://localhost:8099", agentToken = process.env.AGENT_TOKEN ?? "test";
const file = fs.readdirSync(new URL("../private/challenge-1/pruebas/", import.meta.url)).find(f => f.startsWith(id + "-"));
const prueba = JSON.parse(fs.readFileSync(new URL("../private/challenge-1/pruebas/" + file, import.meta.url), "utf8"));
const dh = { Authorization: `Bearer ${env.DESKTOP_TOKEN}` };
console.log("reset:", (await fetch(env.DESKTOP_HTTP + "/__reset", { method: "POST", headers: dh })).status);
await new Promise(r => setTimeout(r, 6000));
const t0 = Date.now();
const r = await fetch(agent + "/tasks", { method: "POST", headers: { Authorization: `Bearer ${agentToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ tarea: prueba.instruccion, escritorio: { url: env.DESKTOP_URL, password: env.DESKTOP_PASSWORD } }) });
const { task_id } = await r.json(); console.log("task", task_id, "aceptada en", Date.now() - t0, "ms");
let s; do { await new Promise(r => setTimeout(r, 5000)); s = await (await fetch(`${agent}/tasks/${task_id}`, { headers: { Authorization: `Bearer ${agentToken}` } })).json(); } while (s.estado === "en_curso" && Date.now() - t0 < 310000);
console.log("estado:", s.estado, "(esperado", prueba.estado_esperado + ") en", Math.round((Date.now() - t0) / 1000), "s\nresumen:", s.resumen);
const c = await (await fetch(env.DESKTOP_HTTP + "/__check", { method: "POST", headers: { ...dh, "Content-Type": "application/json" }, body: JSON.stringify(prueba) })).json();
console.log("check:", JSON.stringify(c));
if (prueba.respuesta_esperada !== undefined) console.log("respuesta esperada:", prueba.respuesta_esperada);
