// Prueba de transporte: conecta, captura, hace clic >=150ms, escribe con tildes, verifica cambio de pantalla y cierra.
import { RfbClient, toPng, sleep } from "../src/rfb.ts";
import { writeFileSync } from "node:fs";
const [url, password] = [process.argv[2], process.argv[3]];
const t0 = Date.now();
const c = await RfbClient.connect(url, password);
console.log("conectado", c.width + "x" + c.height, "en", Date.now() - t0, "ms");
const f1 = await c.capture();
writeFileSync("artifacts/smoke-1.png", toPng(f1));
await c.click(640, 400);                 // clic en el centro
await c.type("Papelería Ñandú 123");     // tildes/ñ por keysym
const f2 = await c.settle(1000);
writeFileSync("artifacts/smoke-2.png", toPng(f2));
writeFileSync("artifacts/smoke-crop.png", toPng(f2, { x: 440, y: 300, w: 400, h: 200, scale: 2 }));
let diff = 0; for (let i = 0; i < f1.rgba.length; i += 4) if (f1.rgba[i] !== f2.rgba[i] || f1.rgba[i+1] !== f2.rgba[i+1]) diff++;
console.log("píxeles distintos tras clic+texto:", diff, "frame", f1.id, "->", f2.id);
console.log("desconexión confirmada:", await c.disconnect(), "closed=", c.isClosed);
process.exit(0);
