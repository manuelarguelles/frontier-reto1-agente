// Suite de pruebas del agente: E1–E5 (con lock), reporta JSON y tabla.
// Uso: node scripts/suite.mjs [agente=http://localhost:8099]
import fs from "node:fs";

const AGENT = process.argv[2] ?? "http://localhost:8099";
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? "test";

// Cargar variables de entorno del escritorio
const envFile = fs.readFileSync(new URL("../private/desktop.env", import.meta.url), "utf8");
const env = Object.fromEntries(envFile.trim().split("\n").map(l => {
  const idx = l.indexOf("=");
  return [l.slice(0, idx), l.slice(idx + 1)];
}));

// Cargar todas las pruebas (E1–E5)
const pruebasDir = new URL("../private/challenge-1/pruebas/", import.meta.url);
const pruebaFiles = fs.readdirSync(pruebasDir).filter(f => f.startsWith("E") && f.endsWith(".json"));
const pruebas = pruebaFiles.map(f => JSON.parse(fs.readFileSync(new URL(f, pruebasDir), "utf8")));

// Función para ejecutar una prueba individual
async function runPrueba(prueba) {
  const dh = { Authorization: `Bearer ${env.DESKTOP_TOKEN}` };
  
  // Reset
  const resetResp = await fetch(env.DESKTOP_HTTP + "/__reset", { method: "POST", headers: dh });
  if (resetResp.status !== 200) {
    return { prueba: prueba.id, error: `reset failed: ${resetResp.status}` };
  }
  await new Promise(r => setTimeout(r, 6000)); // espera a que el escritorio estabilice
  
  // Enviar tarea
  const t0 = Date.now();
  const r = await fetch(AGENT + "/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${AGENT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tarea: prueba.instruccion, escritorio: { url: env.DESKTOP_URL, password: env.DESKTOP_PASSWORD } })
  });
  if (!r.ok) {
    return { prueba: prueba.id, error: `POST /tasks failed: ${r.status}` };
  }
  const { task_id } = await r.json();
  const acceptMs = Date.now() - t0;
  
  // Sondear estado
  let s;
  let finalMs = 0;
  do {
    await new Promise(r => setTimeout(r, 5000));
    const rs = await fetch(`${AGENT}/tasks/${task_id}`, { headers: { Authorization: `Bearer ${AGENT_TOKEN}` } });
    s = await rs.json();
    finalMs = Date.now() - t0;
  } while (s.estado === "en_curso" && finalMs < 310000);
  
  // Check
  const c = await (await fetch(env.DESKTOP_HTTP + "/__check", {
    method: "POST",
    headers: { ...dh, "Content-Type": "application/json" },
    body: JSON.stringify(prueba)
  })).json();
  
  // Extraer respuesta (puede tener mayúscula inicial o espacios variables)
  const respMatch = s.resumen.match(/[Rr]espuesta:\s*([0-9]+)/);
  const respuesta_prueba = respMatch ? respMatch[1] : undefined;
  
  // Verificar respuesta esperada (número primero, sin espacio obligatorio)
  const respuesta_correcta = prueba.respuesta_esperada !== undefined
    ? respuesta_prueba === String(prueba.respuesta_esperada)
    : true;
  
  return {
    prueba: prueba.id,
    estado: s.estado,
    estado_esperado: prueba.estado_esperado,
    __check_passed: c.paso,
    respuesta_prueba,
    respuesta_correcta,
    claves_rason: c.paso && s.resumen.includes("claves_razon"),
    tiempo_ms: finalMs,
    accept_ms: acceptMs,
    steps: s.resumen.match(/paso \d+\/\d+/g)?.length ?? 0,
    coste_usd: 0, // placeholder: calculado después
    resumen_redactado: s.resumen
  };
}

// Ejecutar todas las pruebas en orden (una sola instancia del escritorio)
async function main() {
  console.log("Iniciando suite de pruebas...");
  const results = [];
  
  for (const prueba of pruebas) {
    console.log(`\n=== Ejecutando ${prueba.id} ===`);
    const result = await runPrueba(prueba);
    results.push(result);
    
    // Imprimir resumen inmediato
    const ok = result.__check_passed && result.estado === result.estado_esperado;
    console.log(`  Estado: ${result.estado} (esperado: ${result.estado_esperado})`);
    console.log(`  __check: ${result.__check_passed ? "PASSED" : "FAILED"}`);
    if (prueba.respuesta_esperada !== undefined) {
      console.log(`  Respuesta: ${result.respuesta_prueba ?? "(n/a)"} (esperada: ${prueba.respuesta_esperada}) - ${result.respuesta_correcta ? "OK" : "FAIL"}`);
    }
    console.log(`  Tiempo: ${Math.round(result.tiempo_ms / 1000)}s`);
    console.log(`  ${ok ? "✓" : "✗"} ${prueba.id}`);
  }
  
  // Calcular métricas globales
  const total = results.length;
  const passed = results.filter(r => r.__check_passed && r.estado === r.estado_esperado && r.respuesta_correcta).length;
  const avgTime = results.reduce((sum, r) => sum + r.tiempo_ms, 0) / total;
  const avgSteps = results.reduce((sum, r) => sum + r.steps, 0) / total;
  
  // Reporte JSON
  const reportJson = {
    timestamp: new Date().toISOString(),
    agent: AGENT,
    total,
    passed,
    failed: total - passed,
    avg_time_ms: Math.round(avgTime),
    avg_steps: Math.round(avgSteps),
    results: results.map(r => ({
      prueba: r.prueba,
      estado: r.estado,
      estado_esperado: r.estado_esperado,
      passed: r.__check_passed && r.estado === r.estado_esperado && r.respuesta_correcta,
      tiempo_ms: r.tiempo_ms,
      steps: r.steps
    }))
  };
  
  fs.writeFileSync(new URL("../docs/validation/results-latest.json", import.meta.url), JSON.stringify(reportJson, null, 2));
  
  // Reporte markdown
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportMd = `# Resultados de la suite de pruebas - ${timestamp}

## Resumen

| Métrica | Valor |
|---------|-------|
| Total pruebas | ${total} |
| Pasadas | ${passed} |
| Fallidas | ${total - passed} |
| Tiempo promedio | ${Math.round(avgTime / 1000)}s |
| Pasos promedio | ${avgSteps.toFixed(1)} |

## Resultados por prueba

| Prueba | Estado | Esperado | __check | Respuesta | Tiempo (s) | Pasos |
|--------|--------|----------|---------|-----------|------------|-------|
${results.map(r => `| ${r.prueba} | ${r.estado} | ${r.estado_esperado} | ${r.__check_passed ? "✓" : "✗"} | ${r.respuesta_correcta !== undefined ? (r.respuesta_correcta ? "✓" : "✗") : "N/A"} | ${Math.round(r.tiempo_ms / 1000)} | ${r.steps} |`).join("\n")}

## Detalle por prueba

${results.map(r => `### ${r.prueba}

- **Estado**: ${r.estado} (esperado: ${r.estado_esperado})
- **__check**: ${r.__check_passed ? "PASSED" : "FAILED"}
${r.respuesta_esperada !== undefined ? `- **Respuesta**: ${r.respuesta_prueba ?? "(n/a)"} (esperada: ${r.respuesta_esperada}) - ${r.respuesta_correcta ? "Correcta" : "Incorrecta"}` : ""}
- **Tiempo**: ${Math.round(r.tiempo_ms / 1000)}s
- **Pasos**: ${r.steps}
- **accept_ms**: ${r.accept_ms}

\`\`\`
${r.resumen_redactado}
\`\`\`
`).join("\n\n")}`;

  fs.writeFileSync(new URL(`../docs/validation/results-${timestamp}.md`, import.meta.url), reportMd);
  
  console.log("\n=== Resumen final ===");
  console.log(`Total: ${total}, Pasadas: ${passed}, Fallidas: ${total - passed}`);
  console.log(`Reporte JSON: docs/validation/results-latest.json`);
  console.log(`Reporte Markdown: docs/validation/results-${timestamp}.md`);
  
  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(1);
});
