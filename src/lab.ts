// Laboratorio local interactivo: ejecuta pruebas E1–E5 contra SIGECOM y devuelve resultados.
// Solo activo con LAB=1 (implica LIVE_VIEW=1); sin LAB=1 las rutas dan 404 y nada se lee de disco.
// Regla: NO editar agent.ts; reutilizar lógica de server.ts.

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeSession } from "./models.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

// Tipos
export interface TestDef {
  id: string;
  instruccion: string;
  estado_esperado: "terminada" | "fallida";
  respuesta_esperada?: string;
  claves_razon?: string[];
}

export interface TestResult {
  id: string;
  estado: "terminada" | "fallida" | "en_curso" | "error";
  estado_esperado: "terminada" | "fallida";
  paso_check: boolean;
  respuesta_correcta: boolean;
  respuesta_obtenida?: string;
  tiempo_ms: number;
  pasos: number;
  coste_usd: number;
  resumen?: string;
  error?: string;
}

// Estilo lab: solo leo private/desktop.env y pruebas/*.json (solo en LAB=1)
const DESKTOP_ENV_PATH = resolve(__dirname, "..", "private", "desktop.env");

export interface DesktopEnv {
  DESKTOP_URL: string;
  DESKTOP_HTTP: string;
  DESKTOP_PASSWORD: string;
  DESKTOP_TOKEN: string;
  TEAM_TOKEN: string;
}

export function loadDesktopEnv(): DesktopEnv {
  if (!process.env.LAB || process.env.LAB !== "1") {
    throw new Error("LAB=1 requerido para cargar desktop.env");
  }
  if (!existsSync(DESKTOP_ENV_PATH)) {
    throw new Error(`desktop.env no encontrado en ${DESKTOP_ENV_PATH}`);
  }
  const content = readFileSync(DESKTOP_ENV_PATH, "utf8");
  const out: Partial<DesktopEnv> = {};
  for (const line of content.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length > 0) out[k.trim()] = v.join("=").trim();
  }
  // Validar campos esenciales (DESKTOP_TOKEN y TEAM_TOKEN están en desktop.env para __reset/__check)
  if (!out.DESKTOP_URL || !out.DESKTOP_HTTP || !out.DESKTOP_PASSWORD) {
    throw new Error("desktop.env incompleto (falta DESKTOP_URL/HTTP/PASSWORD)");
  }
  return out as DesktopEnv;
}

export function loadTests(): TestDef[] {
  if (!process.env.LAB || process.env.LAB !== "1") {
    throw new Error("LAB=1 requerido para cargar pruebas");
  }
  const dir = join(__dirname, "..", "private", "challenge-1", "pruebas");
  if (!existsSync(dir)) {
    throw new Error(`directorio de pruebas no encontrado: ${dir}`);
  }
  const files = ["E1-crear-cliente.json", "E2-direccion-con-nota.json", "E3-facturas-vencidas.json",
                 "E4-exportar-pedidos.json", "E5-homonimos.json"];
  const out: TestDef[] = [];
  for (const f of files) {
    const path = join(dir, f);
    if (existsSync(path)) {
      const t: any = JSON.parse(readFileSync(path, "utf8"));
      out.push({
        id: t.id,
        instruccion: t.instruccion,
        estado_esperado: t.estado_esperado,
        respuesta_esperada: t.respuesta_esperada,
        claves_razon: t.claves_razon,
      });
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

// Cliente HTTP simple para __reset y __check
function httpPost(url: string, token: string, body?: any): Promise<{ ok: boolean; body?: any; error?: string }> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s max por operación
    fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    }).then(async (r) => {
      clearTimeout(timeout);
      if (!r.ok) {
        resolve({ ok: false, error: `HTTP ${r.status}` });
        return;
      }
      const j = await r.json().catch(() => ({}));
      resolve({ ok: true, body: j });
    }).catch((e: any) => {
      clearTimeout(timeout);
      resolve({ ok: false, error: e?.message ?? String(e) });
    });
  });
}

// Ejecuta una prueba y devuelve el resultado
export async function runTest(def: TestDef, env: DesktopEnv): Promise<TestResult> {
  const start = performance.now();
  const result: TestResult = {
    id: def.id,
    estado: "en_curso",
    estado_esperado: def.estado_esperado,
    paso_check: false,
    respuesta_correcta: false,
    tiempo_ms: 0,
    pasos: 0,
    coste_usd: 0,
  };

  try {
    // 1. Resetear escritorio con DESKTOP_TOKEN
    const resetUrl = `${env.DESKTOP_HTTP}/__reset`;
    const resetRes = await httpPost(resetUrl, env.DESKTOP_TOKEN);
    if (!resetRes.ok) {
      throw new Error(`reset falló: ${resetRes.error}`);
    }
    // Esperar a que el navegador cargue (mínimo 6s según spec)
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 6000));

    // 2. Crear tarea contra el propio servidor (reutilizar lógica de POST /tasks)
    // El servidor se ejecuta localmente en el mismo proceso (no hacemos HTTP a sí mismo)
    // En su lugar, simularlo llamando a runAgent directamente (reutilizar agent.ts sin tocarlo)
    // Para eso necesitamos construir el entorno de ejecución de runAgent
    // Usamos el mismo server.ts como reference pero llamamos a runAgent directamente

    // NOTA: runAgent requiere un servidor WebSocket RFB. Para hacerlo local sin tocar agent.ts,
    //       creamos un cliente RFB conectado al escritorio real usando DESKTOP_URL.
    //       Pero runAgent espera agentOpts.url y agentOpts.password, que vienen del POST /tasks.
    //       Aquí usamos env.DESKTOP_URL y env.DESKTOP_PASSWORD directamente.

    // Crear AbortController para la tarea
    const controller = new AbortController();
    const DEADLINE_MS = 270000; // 4.5 min
    const deadline = performance.now() + DEADLINE_MS;

    // Captura de pasos para conteo y coste
    let stepsCount = 0;
    let totalCostUsd = 0;

    // Mockear log para capturar coste (reutilizar session.tracker)
    const logF = (m: string) => {
      // Coste aparece en logs como: [models] actor/... in=... out=... $0.xxx tot=0.xxx
      const mCost = m.match(/tot=\$([0-9.]+)/);
      if (mCost) totalCostUsd = parseFloat(mCost[1]);
    };

    // Crear session manual para acceder al tracker
    const session = makeSession(logF);
    // Accedemos al tracker directamente (no es exportado, pero usamos @ts-ignore para acceder)
    (session as any).tracker.totalCostUsd = 0;
    totalCostUsd = 0;

    // Definir onStep para contar pasos
    const onStep = (ev: { step: number; png: string; observacion?: string; plan?: string; accion: any; costUsd: number }) => {
      stepsCount = ev.step;
      totalCostUsd = ev.costUsd;
    };

    // Importar runAgent dinámicamente (mismo archivo, no modificar agent.ts)
    const { runAgent } = await import("./agent.ts");

    // Ejecutar la tarea
    const agentRes = await runAgent({
      tarea: def.instruccion,
      url: env.DESKTOP_URL,
      password: env.DESKTOP_PASSWORD,
      signal: controller.signal,
      deadlineMs: deadline,
      log: logF,
      onStep,
    });

    result.estado = agentRes.estado;
    result.resumen = agentRes.resumen;

    // 3. Ejecutar __check con el mismo token (DESKTOP_TOKEN)
    const checkUrl = `${env.DESKTOP_HTTP}/__check`;
    // Construir cuerpo de check: enviamos el testDef completo (como lo espera el servidor)
    // El servidor espera JSON con campos específicos, usamos el testDef tal cual
    const checkRes = await httpPost(checkUrl, env.DESKTOP_TOKEN, def);
    if (!checkRes.ok) {
      throw new Error(`check falló: ${checkRes.error}`);
    }

    // 4. Verificar resultado
    // checkRes.body tiene: { pass: boolean, checks: [ {nombre, ok}, ... ] }
    // pasamos si:
    // - estado coincide con estado_esperado
    // - pass es true (todos los checks ok)
    result.paso_check = (agentRes.estado === def.estado_esperado) && (checkRes.body?.pass === true);

    // 5. Verificar respuesta correcta (si es tarea de pregunta)
    // Extraer "respuesta: <valor>" del resumen
    let respObt: string | undefined;
    let respExp: string | undefined = def.respuesta_esperada;
    if (respExp) {
      const m = agentRes.resumen?.match(/(?:^|[\s.;])[Rr]espuesta:\s*([^\n]+?)\s*$/m);
      if (m) respObt = m[1].trim().replace(/\.$/, "");
      result.respuesta_obtenida = respObt;
      result.respuesta_correcta = respObt === respExp;
    } else {
      result.respuesta_correcta = true; // no aplica
    }

    // Si paso_check es true pero respuesta incorrecta (en preguntas), marcar fallo
    if (result.paso_check && def.respuesta_esperada && !result.respuesta_correcta) {
      result.paso_check = false;
    }

  } catch (e: any) {
    result.estado = "error";
    result.error = e?.message ?? String(e);
    result.paso_check = false;
  } finally {
    result.tiempo_ms = performance.now() - start;
    result.pasos = stepsCount;
    result.coste_usd = totalCostUsd;
  }

  return result;
}

// Candado (file lock) para un solo run a la vez
export function tryAcquireLock(): boolean {
  if (!process.env.LAB || process.env.LAB !== "1") return false;
  const fs = await import("node:fs");
  const path = "/tmp/frontier-desktop.lock";
  try {
    // mkdir es atómico en POSIX: éxito si no existe
    fs.mkdirSync(path, { recursive: false });
    return true;
  } catch {
    return false;
  }
}

export function releaseLock(): void {
  const fs = await import("node:fs");
  try {
    fs.rmdirSync("/tmp/frontier-desktop.lock");
  } catch { /* ignore */ }
}

// Hook para SSE (reutilizar trace.ts)
// Se usa el mismo mecanismo que /live/stream: SSE envía eventos con task_id, step, observacion, accion, coste
// Para lab, enviamos task_id fijo "lab" y actualizamos en tiempo real

// Exportar funciones adicionales para tests
export { tryAcquireLock, releaseLock, loadTests, loadDesktopEnv };

