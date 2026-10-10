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
