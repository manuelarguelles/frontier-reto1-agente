// Cliente RFB mínimo (protocolo VNC 3.8 sobre WebSocket). Solo píxeles: sin DOM ni API de negocio.
// Encodings: Raw + CopyRect. Entrada: ratón (clic >=150 ms) y teclado por keysym RFB.
import { deflateSync, crc32 } from "node:zlib";
import { DESECBCipher } from "./third_party/des.js";

export class RfbError extends Error {}

export interface Frame {
  id: number; // epoch del framebuffer; sube con cada actualización aplicada
  width: number;
  height: number;
  rgba: Uint8Array;
}

const KEYSYMS: Record<string, number> = {
  Enter: 0xff0d, Return: 0xff0d, Tab: 0xff09, Escape: 0xff1b, Backspace: 0xff08, Delete: 0xffff,
  Home: 0xff50, Left: 0xff51, Up: 0xff52, Right: 0xff53, Down: 0xff54, PageUp: 0xff55, PageDown: 0xff56,
  End: 0xff57, Shift: 0xffe1, Ctrl: 0xffe3, Control: 0xffe3, Alt: 0xffe9, Space: 0x20,
  F1: 0xffbe, F2: 0xffbf, F3: 0xffc0, F4: 0xffc1, F5: 0xffc2,
};

export function keysymFor(ch: string): number {
  const cp = ch.codePointAt(0)!;
  if (cp === 10) return 0xff0d;
  if (cp === 9) return 0xff09;
  if (cp >= 0x20 && cp <= 0x7e) return cp;
  if (cp >= 0xa0 && cp <= 0xff) return cp; // Latin-1: keysym = codepoint
  if (cp < 0x10000) return cp; // Unicode BMP directo (<= 0xFFFF)
  return 0x01000000 + cp; // Unicode plano multilenguaje (> 0xFFFF)
}

export class RfbClient {
  width = 0;
  height = 0;
  frameId = 0;
  lastUpdateAt = 0;
  private fb = new Uint8Array(0);
  private ws!: WebSocket;
  private buf = Buffer.alloc(0);
  private waiters: Array<() => void> = [];
  private closed = false;
  private closeReason = "";
  private buttons = 0;
  private x = 0;
  private y = 0;
  private downKeys = new Set<number>();
  private pump: Promise<void> | null = null;

  static async connect(url: string, password: string, timeoutMs = 15000, maxRetries = 1): Promise<RfbClient> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const c = new RfbClient();
      try {
        await c.open(url, timeoutMs);
        await c.handshake(password);
        c.pump = c.loop().catch((e) => { c.closeReason = String(e?.message ?? e); c.closed = true; c.wake(); });
        await c.requestUpdate(false);
        await c.waitFrame(0, timeoutMs);
        return c;
      } catch (e: any) {
        lastError = e;
        c.closed = true; c.wake();
        if (attempt < maxRetries) {
          // pequeña pausa antes de retry
          await sleep(500);
        }
      }
    }
    throw lastError || new RfbError("conexión fallida");
  }

  private open(url: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, ["binary"]);
      ws.binaryType = "arraybuffer";
      const t = setTimeout(() => { reject(new RfbError("timeout abriendo websocket")); try { ws.close(); } catch {} }, timeoutMs);
      ws.onopen = () => { clearTimeout(t); resolve(); };
      ws.onerror = () => { clearTimeout(t); reject(new RfbError("error de websocket")); };
      ws.onmessage = (ev) => { this.buf = Buffer.concat([this.buf, Buffer.from(ev.data as ArrayBuffer)]); this.wake(); };
      ws.onclose = () => { this.closed = true; this.closeReason ||= "conexión cerrada"; this.wake(); };
      this.ws = ws;
    });
  }

  private wake() { const ws = this.waiters; this.waiters = []; for (const w of ws) w(); }

  private async need(n: number): Promise<Buffer> {
    while (this.buf.length < n) {
      if (this.closed) throw new RfbError(this.closeReason || "conexión cerrada");
      await new Promise<void>((r) => { this.waiters.push(r); });
    }
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  }

  private send(b: Uint8Array) {
    if (this.closed) throw new RfbError("conexión cerrada");
    this.ws.send(b);
  }

  private async handshake(password: string) {
    const ver = (await this.need(12)).toString("ascii");
    if (!ver.startsWith("RFB ")) throw new RfbError("no es un servidor RFB");
    this.send(Buffer.from("RFB 003.008\n"));
    const n = (await this.need(1))[0];
    if (n === 0) {
      const len = (await this.need(4)).readUInt32BE(0);
      throw new RfbError("servidor rechazó: " + (await this.need(len)).toString("utf8"));
    }
    const types = [...(await this.need(n))];
    if (types.includes(2)) {
      this.send(Buffer.from([2]));
      const challenge = new Uint8Array(await this.need(16));
      const key = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        // el DES de noVNC ya aplica la inversión de bits propia de VNC
        key[i] = i < password.length ? password.charCodeAt(i) & 0xff : 0;
      }
      const resp = DESECBCipher.importKey(key).encrypt({}, challenge);
      this.send(resp!);
    } else if (types.includes(1)) {
      this.send(Buffer.from([1]));
    } else throw new RfbError("sin tipo de seguridad soportado");
    const res = (await this.need(4)).readUInt32BE(0);
    if (res !== 0) throw new RfbError("autenticación RFB fallida");
    this.send(Buffer.from([1])); // ClientInit: shared
    const init = await this.need(24);
    this.width = init.readUInt16BE(0);
    this.height = init.readUInt16BE(2);
    await this.need(init.readUInt32BE(20)); // nombre del escritorio
    this.fb = new Uint8Array(this.width * this.height * 4);
    // SetPixelFormat: 32 bpp, little-endian, RGB 888 (R<<16 | G<<8 | B => bytes B,G,R,X)
    const pf = Buffer.alloc(20);
    pf[0] = 0;
    pf[4] = 32; pf[5] = 24; pf[6] = 0; pf[7] = 1;
    pf.writeUInt16BE(255, 8); pf.writeUInt16BE(255, 10); pf.writeUInt16BE(255, 12);
    pf[14] = 16; pf[15] = 8; pf[16] = 0;
    this.send(pf);
    const enc = Buffer.alloc(4 + 4 * 2);
    enc[0] = 2; enc.writeUInt16BE(2, 2);
    enc.writeInt32BE(1, 4); // CopyRect
    enc.writeInt32BE(0, 8); // Raw
    this.send(enc);
  }

  private async loop() {
    for (;;) {
      const t = (await this.need(1))[0];
      if (t === 0) {
        const h = await this.need(3);
        const rects = h.readUInt16BE(1);
        for (let i = 0; i < rects; i++) await this.readRect();
        this.frameId++;
        this.lastUpdateAt = Date.now();
        this.wake();
      } else if (t === 1) {
        const h = await this.need(5);
        await this.need(h.readUInt16BE(3) * 6);
      } else if (t === 2) {
        // bell
      } else if (t === 3) {
        // DesktopSize: cambio de resolución (RFB 3.8)
        const h = await this.need(7);
        const newW = h.readUInt16BE(3), newH = h.readUInt16BE(5);
        await this.need(4); // padding
        this.width = newW; this.height = newH;
        this.fb = new Uint8Array(this.width * this.height * 4);
        // solicitar actualización para llenar el nuevo framebuffer
        await this.requestUpdate(false);
        this.frameId++;
        this.wake();
      } else throw new RfbError("mensaje de servidor desconocido " + t);
    }
  }

  private async readRect() {
    const h = await this.need(12);
    const x = h.readUInt16BE(0), y = h.readUInt16BE(2), w = h.readUInt16BE(4), hh = h.readUInt16BE(6);
    const enc = h.readInt32BE(8);
    if (enc === 0) {
      const data = await this.need(w * hh * 4);
      for (let row = 0; row < hh; row++) {
        let o = ((y + row) * this.width + x) * 4;
        let s = row * w * 4;
        for (let col = 0; col < w; col++, o += 4, s += 4) {
          this.fb[o] = data[s + 2]; this.fb[o + 1] = data[s + 1]; this.fb[o + 2] = data[s]; this.fb[o + 3] = 255;
        }
      }
    } else if (enc === 1) {
      const d = await this.need(4);
      const sx = d.readUInt16BE(0), sy = d.readUInt16BE(2);
      const copy = new Uint8Array(w * hh * 4);
      for (let row = 0; row < hh; row++) copy.set(this.fb.subarray(((sy + row) * this.width + sx) * 4, ((sy + row) * this.width + sx + w) * 4), row * w * 4);
      for (let row = 0; row < hh; row++) this.fb.set(copy.subarray(row * w * 4, (row + 1) * w * 4), ((y + row) * this.width + x) * 4);
    } else throw new RfbError("encoding no soportado " + enc);
  }

  private async requestUpdate(incremental: boolean) {
    const m = Buffer.alloc(10);
    m[0] = 3; m[1] = incremental ? 1 : 0;
    m.writeUInt16BE(this.width, 6); m.writeUInt16BE(this.height, 8);
    this.send(m);
  }

  private async waitFrame(after: number, timeoutMs: number) {
    const end = Date.now() + timeoutMs;
    while (this.frameId <= after) {
      if (this.closed) throw new RfbError(this.closeReason || "conexión cerrada");
      if (Date.now() > end) throw new RfbError("timeout esperando framebuffer");
      await new Promise<void>((r) => { this.waiters.push(r); setTimeout(r, 100); });
    }
  }

  /** Captura fresca: pide actualización completa y espera un frame posterior a la solicitud. */
  async capture(timeoutMs = 5000): Promise<Frame> {
    const before = this.frameId;
    await this.requestUpdate(false);
    await this.waitFrame(before, timeoutMs);
    return { id: this.frameId, width: this.width, height: this.height, rgba: this.fb.slice() };
  }

  /** Espera a que la pantalla repinte y se estabilice (dos capturas consecutivas iguales). */
  async settle(minMs = 1000, maxMs = 4000): Promise<Frame> {
    await sleep(minMs);
    const end = Date.now() + maxMs;
    let prev = await this.capture();
    while (Date.now() < end) {
      await sleep(250);
      const cur = await this.capture();
      if (Buffer.compare(Buffer.from(prev.rgba), Buffer.from(cur.rgba)) === 0) return cur;
      prev = cur;
    }
    return prev;
  }

  private pointer(x: number, y: number, mask: number) {
    this.x = Math.max(0, Math.min(this.width - 1, Math.round(x)));
    this.y = Math.max(0, Math.min(this.height - 1, Math.round(y)));
    this.buttons = mask;
    const m = Buffer.alloc(6);
    m[0] = 5; m[1] = mask; m.writeUInt16BE(this.x, 2); m.writeUInt16BE(this.y, 4);
    this.send(m);
  }

  async move(x: number, y: number) { this.pointer(x, y, this.buttons); await sleep(40); }

  /** Clic con botón pulsado >= 150 ms (la app ignora < 100 ms). button: 1 izq, 2 medio, 4 der. */
  async click(x: number, y: number, opts: { button?: number; holdMs?: number; double?: boolean } = {}) {
    const mask = opts.button ?? 1;
    const hold = Math.max(opts.holdMs ?? 150, 120);
    await this.move(x, y);
    for (let i = 0; i < (opts.double ? 2 : 1); i++) {
      this.pointer(x, y, mask);
      await sleep(hold);
      this.pointer(x, y, 0);
      if (opts.double) await sleep(120);
    }
  }

  async scroll(x: number, y: number, dy: number) {
    const mask = dy > 0 ? 16 : 8; // rueda abajo/arriba
    for (let i = 0; i < Math.max(1, Math.abs(Math.round(dy))); i++) {
      this.pointer(x, y, mask); await sleep(40); this.pointer(x, y, 0); await sleep(40);
    }
  }

  private key(keysym: number, down: boolean) {
    const m = Buffer.alloc(8);
    m[0] = 4; m[1] = down ? 1 : 0; m.writeUInt32BE(keysym >>> 0, 4);
    if (down) this.downKeys.add(keysym); else this.downKeys.delete(keysym);
    this.send(m);
  }

  async press(name: string, holdMs = 60) {
    // "Ctrl+A", "Enter", "Shift+Tab"
    const parts = name.split("+");
    const syms = parts.map((p) => KEYSYMS[p] ?? (p.length === 1 ? keysymFor(p.toLowerCase()) : -1));
    if (syms.includes(-1)) throw new RfbError("tecla desconocida: " + name);
    for (const s of syms) { this.key(s, true); await sleep(20); }
    await sleep(holdMs);
    for (const s of syms.reverse()) { this.key(s, false); await sleep(20); }
  }

  /** Escribe texto NFC carácter a carácter con keysyms RFB (Unicode directo para tildes/ñ si hace falta). */
  async type(text: string, perCharMs = 25) {
    for (const ch of text.normalize("NFC")) {
      const s = keysymFor(ch);
      const needShift = ch !== ch.toLowerCase() && ch.toUpperCase() === ch && s < 0x80;
      if (needShift) { this.key(0xffe1, true); await sleep(10); }
      this.key(s, true); await sleep(perCharMs); this.key(s, false); await sleep(perCharMs);
      if (needShift) { this.key(0xffe1, false); await sleep(10); }
    }
  }

  /** Selecciona todo y reemplaza el contenido del campo enfocado. */
  async replaceText(text: string) {
    await this.press("Ctrl+A");
    await sleep(80);
    if (text === "") await this.press("Delete"); else await this.type(text);
  }

  /** Suelta todo lo pulsado y cierra; resuelve cuando el socket quedó cerrado. */
  async disconnect(confirmMs = 2000) {
    if (!this.closed) {
      try {
        for (const k of [...this.downKeys]) this.key(k, false);
        if (this.buttons) this.pointer(this.x, this.y, 0);
      } catch { /* ya cerrado */ }
      try { this.ws.close(); } catch { /* */ }
    }
    const end = Date.now() + confirmMs;
    while (!this.closed && Date.now() < end) await sleep(50);
    this.closed = true;
    this.wake();
    return true;
  }

  get isClosed() { return this.closed; }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function toPng(f: { width: number; height: number; rgba: Uint8Array }, crop?: { x: number; y: number; w: number; h: number; scale?: number }): Buffer {
  let { width, height, rgba } = f;
  if (crop) {
    const s = crop.scale ?? 1;
    const cw = Math.round(crop.w * s), ch = Math.round(crop.h * s);
    const out = new Uint8Array(cw * ch * 4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const sx = Math.min(f.width - 1, Math.floor(crop.x + x / s)), sy = Math.min(f.height - 1, Math.floor(crop.y + y / s));
      const so = (sy * f.width + sx) * 4, o = (y * cw + x) * 4;
      out[o] = rgba[so]; out[o + 1] = rgba[so + 1]; out[o + 2] = rgba[so + 2]; out[o + 3] = 255;
    }
    width = cw; height = ch; rgba = out;
  }
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 3 })), chunk("IEND", Buffer.alloc(0))]);
}
