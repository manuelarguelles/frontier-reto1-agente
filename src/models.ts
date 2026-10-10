// Gestión de roles de modelo, fallback, coste y timeouts para el agente.
// Roles: actor (decide acciones), localizador (coordenadas en recorte), verificador (postcondición).
// Política: timeout por llamada, 1 reintento, cambio de modelo tras 2 fallos seguidos,
//           tope de coste por tarea (TASK_COST_CAP_USD), conteo de tokens/coste en log.

export type ModelRole = "actor" | "localizador" | "verificador";

export type Msg = { role: "user" | "assistant" | "system"; content: any };

export interface CostTracker {
  totalCostUsd: number;
  calls: number;
}

export interface ModelSession {
  tracker: CostTracker;
  call(
    role: ModelRole,
    messages: Msg[],
    signal: AbortSignal,
    deadlineMs: number,
    opts?: { maxTokens?: number; temperature?: number },
  ): Promise<string>;
}

// ─── Cost catalog ────────────────────────────────────────────────────────────
interface ModelDef {
  inputCostPer1k: number;
  outputCostPer1k: number;
  timeoutMs: number;
}

const CATALOG: Record<string, ModelDef> = {
  "anthropic/claude-sonnet-4.6":     { inputCostPer1k: 0.003,   outputCostPer1k: 0.015,  timeoutMs: 40_000 },
  "anthropic/claude-haiku-4.5":      { inputCostPer1k: 0.001,   outputCostPer1k: 0.005,  timeoutMs: 25_000 },
  "google/gemini-2.5-flash":         { inputCostPer1k: 0.0003,  outputCostPer1k: 0.0025, timeoutMs: 30_000 },
};

const FALLBACK: Record<string, string> = {
  "anthropic/claude-sonnet-4.6":     "anthropic/claude-haiku-4.5",
  "anthropic/claude-haiku-4.5":      "anthropic/claude-sonnet-4.6",
  "google/gemini-2.5-flash":         "anthropic/claude-haiku-4.5",
};

function defaultModel(role: ModelRole): string {
  if (role === "actor")       return process.env.AGENT_MODEL     ?? "anthropic/claude-sonnet-4.6";
  if (role === "localizador") return process.env.LOCALIZER_MODEL ?? "google/gemini-2.5-flash";
  /* verificador */           return process.env.VERIFIER_MODEL  ?? "anthropic/claude-haiku-4.5";
}

/** USD cap per task; when exceeded the next call throws immediately. */
export const TASK_COST_CAP_USD = Number(process.env.TASK_COST_CAP_USD ?? 0.60);

// ─── Session factory ──────────────────────────────────────────────────────────
/**
 * Creates a model session that tracks cost, manages per-role fallback, and
 * optionally accepts a custom fetch function (for testing).
 */
export function makeSession(
  log: (m: string) => void,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): ModelSession {
  const tracker: CostTracker = { totalCostUsd: 0, calls: 0 };
  const currentModel: Partial<Record<ModelRole, string>> = {};
  const failCount: Partial<Record<ModelRole, number>> = {};

  function getModel(role: ModelRole): string {
    return currentModel[role] ?? defaultModel(role);
  }

  async function call(
    role: ModelRole,
    messages: Msg[],
    signal: AbortSignal,
    deadlineMs: number,
    opts: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("falta OPENROUTER_API_KEY");
    if (tracker.totalCostUsd >= TASK_COST_CAP_USD) {
      throw new Error(`coste de tarea superado (${tracker.totalCostUsd.toFixed(4)} >= ${TASK_COST_CAP_USD} USD)`);
    }

    const { maxTokens = 700, temperature = 0 } = opts;
    const model = getModel(role);
    const def = CATALOG[model];
    const left = () => deadlineMs - performance.now();
    const callTimeout = Math.min(def?.timeoutMs ?? 40_000, Math.max(5_000, left() - 5_000));

    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctl = new AbortController();
      const tid = setTimeout(() => ctl.abort(), callTimeout);
      const onAbort = () => ctl.abort();
      signal.addEventListener("abort", onAbort);
      try {
        const r = await fetchFn("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: ctl.signal,
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages }),
        });
        if (!r.ok) throw new Error(`modelo HTTP ${r.status}`);
        const j: any = await r.json();
        const content: string = j.choices?.[0]?.message?.content ?? "";
        if (j.usage) {
          const cost = estimateCost(model, j.usage.prompt_tokens ?? 0, j.usage.completion_tokens ?? 0);
          tracker.totalCostUsd += cost;
          tracker.calls++;
          log(
            `[models] ${role}/${model} in=${j.usage.prompt_tokens} out=${j.usage.completion_tokens}` +
              ` $${cost.toFixed(5)} tot=$${tracker.totalCostUsd.toFixed(4)}`,
          );
        }
        failCount[role] = 0;
        return content;
      } catch (e) {
        lastErr = e;
        if (attempt === 0 && !signal.aborted) await sleep(300);
      } finally {
        clearTimeout(tid);
        signal.removeEventListener("abort", onAbort);
      }
    }

    // Both attempts failed → maybe switch model after 2 consecutive failures.
    failCount[role] = (failCount[role] ?? 0) + 1;
    if ((failCount[role] ?? 0) >= 2) {
      const cur = getModel(role);
      const nxt = FALLBACK[cur];
      if (nxt && nxt !== cur) {
        currentModel[role] = nxt;
        log(`[models] ${role} fallback ${cur} -> ${nxt}`);
        failCount[role] = 0;
      }
    }
    throw lastErr;
  }

  return { tracker, call };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function estimateCost(model: string, inputTok: number, outputTok: number): number {
  const d = CATALOG[model];
  if (!d) return 0;
  return (inputTok / 1_000) * d.inputCostPer1k + (outputTok / 1_000) * d.outputCostPer1k;
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}
