// Receptor local de un solo uso: guarda en private/desktop.env (0600) los secretos enviados desde el portal.
import http from "node:http"; import fs from "node:fs";
const out = new URL("../private/desktop.env", import.meta.url).pathname;
http.createServer((req, res) => { let b = ""; req.on("data", d => b += d); req.on("end", () => { fs.writeFileSync(out, b, { mode: 0o600 }); res.end("ok"); console.log("guardado", b.split("\n").length, "líneas"); setTimeout(() => process.exit(0), 200); }); }).listen(8765, "127.0.0.1");
