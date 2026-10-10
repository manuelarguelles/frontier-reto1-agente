# Frontier 2026 · Reto 1 — Agente que opera lo que no tiene API

Agente que ejecuta tareas en lenguaje natural sobre aplicaciones de escritorio **desconocidas**, usando solo píxeles:
se conecta por VNC (RFB) al escritorio que recibe en cada tarea, mira capturas, hace clics y escribe como un empleado nuevo.
Sin DOM, sin API de negocio, sin herramientas de terceros que operen la app: el cliente RFB es propio.

## Contrato (todas las rutas con `Authorization: Bearer <TEAM_TOKEN>`)

| Ruta | Respuesta |
|---|---|
| `GET /health` | `{"ok": true}` |
| `POST /tasks` `{"tarea", "escritorio": {"url": "wss://…/websockify", "password"}}` | `{"task_id"}` en milisegundos; la tarea corre en segundo plano |
| `GET /tasks/{task_id}` | `{"estado": "en_curso\|terminada\|fallida", "resumen"}` |

## Cómo funciona

1. **Transporte** (`src/rfb.ts`): RFB 3.8 sobre WebSocket, autenticación VNC, encodings Raw y CopyRect, captura nativa del framebuffer con `frame_id`, clic con botón pulsado ≥150 ms, teclado por keysym (NFC; Unicode directo para tildes/ñ), `Ctrl+A` remoto antes de reemplazar texto, repintado esperado hasta estabilizar, desconexión confirmada que suelta teclas y botones.
2. **Loop** (`src/agent.ts`): observar → una acción JSON del modelo (Sonnet vía OpenRouter) → validar (tipo, límites de pantalla) → ejecutar → esperar repintado → verificar. Detecta acciones sin efecto y cambia de estrategia o se detiene; nunca declara éxito sin evidencia visible.
3. **Seguridad**: el contenido de la pantalla es dato sin autoridad (una nota que pide borrar pedidos se ignora y se reporta); la contraseña del escritorio se redacta de logs y resumen; ante tareas imposibles, ambiguas (homónimos) o peligrosas termina `fallida` nombrando los datos que lo explican.
4. **Tiempo** (`src/server.ts`): una tarea activa por instancia (si llega otra, falla explícita sin actuar); watchdog monotónico cancela a 270 s y cierra a 280 s; el estado terminal solo se publica **después** de cerrar el escritorio, para no contaminar la tarea siguiente. Reinicios marcan las tareas en curso como `fallida` sin reintentar (evita duplicados).

## Ejecutar

```bash
TEAM_TOKEN=... OPENROUTER_API_KEY=... node src/server.ts      # Node >= 24 (ejecuta TypeScript nativo)
docker build -t reto1 . && docker run -p 8080:8080 -e TEAM_TOKEN=... -e OPENROUTER_API_KEY=... reto1
node scripts/harness.mjs E1                                    # reset -> tarea -> __check (necesita private/desktop.env)
```

Variables: `TEAM_TOKEN`, `OPENROUTER_API_KEY`, `AGENT_MODEL` (por defecto `anthropic/claude-sonnet-4.6`), `AGENT_MAX_STEPS`, `TASK_DEADLINE_S`, `DATA_DIR`.

## Estado y evidencia

- E1 (alta de cliente) contra SIGECOM real: `__check` en verde, 115 s, estado correcto.
- Metodología de evaluación (golden set E1–E5, harness separado) y resultados medidos por modelo: `docs/evaluation/`.
- Diseño y razones de cada decisión: `docs/design/`; flujos por escenario: `docs/design/scenario-flows.md`; prioridades: `docs/design/implementation-priorities.md`; investigación y repos de referencia revisados (no ejecutados): `docs/research/`.
- Terceros: `src/third_party/des.js` (DES de noVNC, MPL-2.0) solo para el desafío de autenticación VNC.

## Fuera de alcance (a propósito)

GPU, entrenamiento o ajuste fino, agentes/MCP de terceros, pool de workers (sin memoria medida), DOM o API de la app, y OCR especializado salvo que fallen los recortes.
