# Plan de implementación (12:40 → 20:00) — orquestado con pi agent

Línea base verificada: E1–E5 pasan `__check` en local; entrypoint desplegado en Railway; CI/CD activo. Cada paquete (WP) toca archivos distintos.
Reglas: TDD (superpowers), `npm test` verde antes de commit, commit solo de tus archivos (`git add <rutas>`), NO hacer push a main si `npm test` falla (el CD despliega y mata tareas en curso), mensajes de commit en inglés sin atribución a IA, nunca secretos en archivos/logs. El escritorio de práctica es único: todo comando que lo use va con `scripts/with-desktop-lock.sh`.

## Orquestación de modelos EN EL AGENTE ENTREGADO (runtime, `src/models.ts`)
Roles: **actor** (decide la acción; Sonnet 4.6 baseline), **localizador** (solo coordenadas sobre recorte ampliado; se activa ante controles pequeños o 2 fallos de localización; candidato Gemini 2.5 Flash vía OpenRouter, comparar), **verificador** (comprueba postcondición visible antes de `done`; mismo modelo que actor o más barato). Política: timeout por llamada, 1 reintento, cambio de modelo tras 2 fallos seguidos, tope de coste por tarea (`TASK_COST_CAP_USD`, default 0.60), conteo de tokens/coste por tarea en el log, descarte de respuestas tardías, nunca superar el deadline de 270 s.

## WP1 — Loop robusto (`src/agent.ts`, nuevo `src/models.ts`)
1. Extraer llamadas a modelo a `src/models.ts` (roles, fallback, coste, timeouts) con tests unitarios (mock de fetch).
2. Verificación previa a `done`: una captura nueva + pregunta de verificación; si no hay evidencia, continuar o `fallida`.
3. Acción `zoom` (recorte ampliado con offset/escala explícitos) para controles pequeños; el localizador devuelve coordenadas en el recorte y se convierten a pantalla.
4. Manejo de modales/diálogos de validación, anti-bucle (páginas repetidas), guardado incierto: comprobar antes de repetir.
5. Resumen de preguntas siempre `respuesta: <valor>` (número primero; dos datos con `;`); tareas fallidas nombran ids/valores que explican el porqué; nunca secretos.

## WP2 — Harness y evaluación (`scripts/`, `test/`, `docs/validation/`)
1. `scripts/suite.mjs`: corre E1–E5 (con lock), reporta JSON y tabla: estado, `__check`, `respuesta:` correcta, claves_razon presentes, tiempo, coste, pasos, acciones extra. Verifica que el resumen no contiene la contraseña.
2. Variantes sintéticas sin tocar SIGECOM: tests de parseo/validación con respuestas de modelo malformadas, acciones fuera de pantalla, injection en texto de pantalla simulado.
3. Escribir `docs/validation/results-<hora>.md` con resultados y comparativas de modelos (mismos casos).

## WP3 — Servidor y transporte (`src/server.ts`, `src/rfb.ts`, `Dockerfile`)
1. Robustez: handlers de `uncaughtException`/`unhandledRejection`, cierre ordenado (SIGTERM: abortar tarea, soltar entradas, marcar `fallida` sin replay), límite de memoria medido (0.5 GB en Railway), sin logs con secretos.
2. RFB: reconexión única si el socket cae antes de actuar (nunca tras un guardado incierto), soporte de resize (DesktopSize) y encodings eficientes si el costo/latencia lo justifica; pruebas con el escritorio local de `poc/desktop`.
3. Teclas: `replaceText` verificado con tildes/ñ/símbolos; `press` con combinaciones.

## Después (yo, hilo principal)
Validar entrypoint en portal, video de 2 min, congelar despliegues antes de 20:00, corridas ocultas solo con hipótesis concreta.

## WP4 — Visor en vivo local (`src/trace.ts`, `src/server.ts` solo rutas nuevas, `public/live.html`, tests)
Objetivo: que Manuel vea trabajar al agente SIN abrir otro cliente VNC (un segundo visor puede expulsar al agente del escritorio) y sin afectar producción.
1. `src/trace.ts`: almacén en memoria por tarea (últimos N pasos: paso, miniatura PNG base64 ≤ 80 KB, observación, plan, acción, coste acumulado, tiempos). Se alimenta con el gancho `onStep` de `runAgent` (ya existe; NO edites `src/agent.ts`).
2. `src/server.ts`: si `LIVE_VIEW=1`: `GET /live` (HTML), `GET /live/tasks` (lista), `GET /tasks/{id}/trace` (JSON), `GET /live/stream` (SSE). Todas con Bearer o `?token=` solo cuando `LIVE_VIEW=1`. Con `LIVE_VIEW` distinto de 1 las rutas responden 404 y no se guarda nada (producción nunca guarda capturas).
3. `public/live.html`: una sola página sin dependencias: última captura grande, línea de tiempo de pasos (acción, observación, coste), estado de la tarea y comparación de modelo/coste. Debe leerse bien en pantalla de portátil.
4. Tests (sin red ni escritorio) de trace.ts y de que las rutas no existen sin `LIVE_VIEW=1`.

## WP5 — Velocidad (`src/agent.ts`, `src/rfb.ts`, tests)
Medido: modelo 55–65 % del paso, espera de repintado ~25 %. Objetivos sin perder precisión (validar con `scripts/suite.mjs`, 5/5 como mínimo):
1. Varias acciones por turno del modelo (`acciones: [...]`, máx. 4, ejecutadas en orden con verificación de que la pantalla no cambió de página entre una y otra cuando haga falta); compatibilidad con la acción única.
2. Espera adaptativa: tras `type`/`replace_text`/`key` sin cambio de página, no esperar el mínimo de 1 s; tras clic, mantener 1 s + estabilidad.
3. Reducir tokens por paso (prompt del sistema más corto, 1 imagen + texto del historial) y medir con `scripts/bench.ts`.
Reglas: no tocar `src/server.ts`; E1–E5 deben seguir pasando; reportar pasos y tiempo por tarea antes/después.

## WP6 — Laboratorio local interactivo (`src/lab.ts`, `public/lab.html`, rutas nuevas en `src/server.ts`, tests)
Objetivo: que Manuel, en su Mac, pulse un botón y vea al agente resolver cada tarea de práctica en vivo, con resultado y coste, sin terminal. Solo local: activo únicamente con `LAB=1` (implica `LIVE_VIEW=1`); sin `LAB=1` las rutas dan 404 y nada se lee de disco. NO edites `src/agent.ts`.
1. `src/lab.ts`: lee `private/desktop.env` (solo en local, nunca lo devuelve al navegador) y las pruebas de `private/challenge-1/pruebas/*.json`; por prueba hace `POST {DESKTOP_HTTP}/__reset` con el token del escritorio, espera 6 s, crea la tarea contra el propio servidor (misma lógica que `POST /tasks`, reutilizando funciones de server.ts), sondea, y llama a `/__check`; devuelve estado, `__check`, `respuesta:` correcta, tiempo, pasos y coste. Un solo run a la vez (candado como `scripts/with-desktop-lock.sh` vía `mkdir /tmp/frontier-desktop.lock`).
2. Rutas (solo `LAB=1`, mismo `?token=` que el visor): `GET /lab` (HTML), `GET /lab/tests` (lista E1–E5 con su instrucción), `POST /lab/run?id=E3` o `?id=all`, `GET /lab/state` (resultados acumulados), SSE reutilizando `/live/stream`.
3. `public/lab.html`: una página sin dependencias con botones por prueba y "Correr todas", tabla de resultados (✓/✗, estado vs esperado, `__check`, respuesta, tiempo, pasos, coste), y a la derecha el visor en vivo de la tarea actual (captura, observación, acción) reutilizando el mismo SSE de `/live`. Español, legible en portátil.
4. Tests sin red ni escritorio (mock de fetch y de disco): candado, rutas 404 sin `LAB=1`, nunca expone secretos del env.
Reglas: tests verdes sin variables de entorno; no desplegar; commit/push de tus archivos.
