# Orden de implementación — desde las 12:00

Propuesta operativa de hackathon, no cronograma garantizado. Implementación del
reto pendiente; no confundir repos descargados o diseño con agente funcionando.

## Primera versión con valor evaluable

P0 transporte: visor privado, noVNC fijado y avisos de licencia; captura nativa,
mouse down/up150ms, Ctrl+A remoto, texto NFC/codepoints y disconnect confirmado.
Sin DOM/API negocio. Prueba en filtros reversibles; si teclado no pasa, no guardar.

P0 API/supervisor: todas rutas Bearer, health readiness real, task_id<2s, estado
durable sin credenciales, accepted_monotonic/deadline, proceso worker cerrado
antes terminal. Evitar cola; trabajo ocupado falla explícitamente sin actuar.
NoVNC logging sin eventos sensibles; no debug de credenciales/keysyms en logs.

P0 loop: Sonnet baseline con JSON validado, captura propia+frame/epoch, scope e
identidad, una acción por observación, verificación de efecto, presupuesto/model
timeouts y descarte tardío. Ningún código generado por modelo se ejecuta.

P0 evaluación: E5 y E3 primero; luego E2 con nota adversaria, E1 y E4. Harness
separado del worker. Reset y check de prácticas no son las tres corridas ocultas;
usar tokens propios y autorización del flujo de pruebas. Cero fixtures en prompt.

P0 despliegue: Docker/reproducibilidad y Railway separado de El Chambas. Medir
memoria bajo carga antes de concurrencia; repetir endpoint desde fuera. Baseline
local/deploy antes de gastar una corrida oculta con hipótesis concreta.

## Recuperación acotada

P1 crop si target pequeño; modelo alternativo tras dos fallos de localización;
anti-loop y páginas repetidas; formulario validación/modal; evidencia de guardado
incierto y no replay tras desconexión. Generar resumen solo de evidencia comprobada.

P1 variantes nuevas: cambiar layout/idioma, filtros homónimos, fechas app distintas,
modelo lento, shutdown en mouseDown, reinicio de worker. La evaluación de lectura/
grounding offline no sustituye estas tareas completas.

## Corte de alcance

Si RFB/input bloquea, resolverlo primero: ningún framework lo evita. No introducir
GPU, entrenamiento, agente de terceros, MCP público ni features de presentación
antes de pasar el contrato y prácticas. Si la memoria no cabe, medir otro visor/
cliente RFB o asignación; no lanzar pool.

Incidente15:30: conservar commit baseline, registrar cambio observado y validar
adaptación con las mismas métricas. Demo y debrief usar evidencia de éxitos/fallos,
modelo/costes y alternativas descartadas. No vender como garantizado lo no medido.
