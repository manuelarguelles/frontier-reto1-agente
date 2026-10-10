// Diagnóstico: ¿qué método de "seleccionar todo" tumba el socket? Repite cada método N veces sobre un campo de texto real.
import { RfbClient, sleep } from "../src/rfb.ts";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("private/desktop.env", "utf8").trim().split("\n").map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const methods: Record<string, (c: RfbClient) => Promise<void>> = {
  "Ctrl+A (press)": async c => { await c.press("Ctrl+A"); },
  "triple-click": async c => { await c.click(259, 131); await c.click(259, 131); await c.click(259, 131); },
  "Home,Shift+End": async c => { await c.press("Home"); await c.press("Shift+End"); },
  "solo escribir (type)": async c => { await c.type("abc"); },
};
for (const [name, fn] of Object.entries(methods)) {
  let drops = 0; const N = 12;
  for (let i = 0; i < N; i++) {
    let c: RfbClient | null = null;
    try {
      c = await RfbClient.connect(env.DESKTOP_URL, env.DESKTOP_PASSWORD);
      await c.click(259, 131); await sleep(300);          // foco en un campo de texto
      await fn(c); await sleep(400);
      await c.capture(3000);                                 // si el socket murió, esto lanza
    } catch { drops++; }
    finally { await c?.disconnect(500).catch(() => {}); }
  }
  console.log(name.padEnd(24), "caídas:", drops, "/", N);
}
process.exit(0);
