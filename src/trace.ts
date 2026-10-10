// Visor en vivo: almacenamiento por tarea de los últimos N pasos para visualización local.
// Se alimenta desde runAgent con el gancho onStep.
// En producción (LIVE_VIEW distinto de 1): no se guarda nada, no se exponen rutas.

import { type Frame } from "./rfb.ts";

export const MAX_TRACE_STEPS = 50;
export const MAX_PNG_SIZE = 600 * 1024; // 600 KB de base64 (una captura 1280x800 real pesa ~100-250 KB)

export interface TraceStep {
  step: number;
  png: string;          // PNG base64 ≤ MAX_PNG_SIZE
  observacion?: string;
  plan?: string;
  accion: any;
  costUsd: number;
  timeMs: number;       // duración del paso en ms
}

// Mapa task_id -> { steps: TraceStep[], startedAt: number }
const traces = new Map<string, { steps: TraceStep[]; startedAt: number }>();

/** Exportada solo para tests: limpia todas las trazas en memoria */
export function clearTraces(): void {
  traces.clear();
}

export function getTrace(taskId: string): { steps: TraceStep[]; startedAt: number } | undefined {
  return traces.get(taskId);
}

export function addTraceStep(taskId: string, step: TraceStep): void {
  if (!process.env.LIVE_VIEW || process.env.LIVE_VIEW !== "1") return;

  const trace = traces.get(taskId);
  if (!trace) return;

  // Un PNG truncado se ve roto: si excede el límite, se descarta la captura (el visor muestra un aviso) en vez de cortarla.
  if (step.png.length > MAX_PNG_SIZE) step.png = "";

  trace.steps.push(step);
  // Mantener solo los últimos MAX_TRACE_STEPS
  if (trace.steps.length > MAX_TRACE_STEPS) {
    trace.steps.shift();
  }
}

export function createTrace(taskId: string): void {
  if (!process.env.LIVE_VIEW || process.env.LIVE_VIEW !== "1") return;
  traces.set(taskId, { steps: [], startedAt: Date.now() });
}

export function removeTrace(taskId: string): void {
  traces.delete(taskId);
}

export function listTraces(): Array<{ task_id: string; startedAt: number; steps: number; estado: string }> {
  // Para obtener el estado real, se debe consultar la tabla de tareas desde server.ts
  // Esta función solo lista las trazas en memoria
  const arr: Array<{ task_id: string; startedAt: number; steps: number; estado: string }> = [];
  for (const [task_id, trace] of traces.entries()) {
    arr.push({ task_id, startedAt: trace.startedAt, steps: trace.steps.length, estado: "desconocido" });
  }
  return arr;
}

// Hook para integrar con runAgent: se llama por cada paso
export function onStepHook(taskId: string) {
  return (ev: { step: number; png: string; observacion?: string; plan?: string; accion: any; costUsd: number }) => {
    const start = performance.now();
    addTraceStep(taskId, {
      step: ev.step,
      png: ev.png,
      observacion: ev.observacion,
      plan: ev.plan,
      accion: ev.accion,
      costUsd: ev.costUsd,
      timeMs: performance.now() - start,
    });
  };
}
