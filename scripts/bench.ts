// Mide dónde se va el tiempo de un paso: captura, settle, clic y latencia de cada modelo con una captura real.
import { RfbClient, toPng } from "../src/rfb.ts";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("private/desktop.env", "utf8").trim().split("\n").map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const t = async <T>(f: () => Promise<T>) => { const a = performance.now(); const r = await f(); return [r, Math.round(performance.now() - a)] as const; };
const [c, tConn] = await t(() => RfbClient.connect(env.DESKTOP_URL, env.DESKTOP_PASSWORD));
console.log("conexión+1er frame ms:", tConn);
const caps: number[] = []; for (let i = 0; i < 5; i++) { const [, m] = await t(() => c.capture()); caps.push(m); }
console.log("captura completa ms:", caps.join(","));
const [f, tSet] = await t(() => c.settle(1000, 3000)); console.log("settle(1000,3000) ms:", tSet);
const [, tClick] = await t(() => c.click(640, 400)); console.log("clic (150 ms pulsado) ms:", tClick);
const [, tType] = await t(() => c.type("Papelería Los Andes")); console.log("type 19 chars ms:", tType);
const [, tKey] = await t(() => c.replaceText("901234567")); console.log("replaceText 9 chars ms:", tKey);
const png = toPng(f); console.log("PNG KB:", Math.round(png.length / 1024), " encode ms:", (await t(async () => toPng(f)))[1]);
const b64 = png.toString("base64");
for (const m of ["anthropic/claude-sonnet-4.6", "anthropic/claude-haiku-5.5", "openai/gpt-6-luna"]) {
  const ms: number[] = [];
  for (let i = 0; i < 3; i++) {
    const [r, d] = await t(async () => {
      const x = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: m, temperature: 0, max_tokens: 400, messages: [{ role: "user", content: [{ type: "text", text: 'Describe en una frase qué app ves y responde SOLO JSON {"accion":{"tipo":"wait"}}' }, { type: "image_url", image_url: { url: "data:image/png;base64," + b64 } }] }] }) });
      return x.json() as any;
    });
    ms.push(d); if (i === 0) console.log(m, "in tokens:", r.usage?.prompt_tokens, "out:", r.usage?.completion_tokens);
  }
  console.log(m, "latencia ms:", ms.join(","));
}
await c.disconnect(); process.exit(0);
