# Actualización desde transcripts completos — 10 oct 2026

Fuentes: T1 = `Frontier Hackathon 10 Octubre (1).txt` (inicio 9:07:02, 79 min, completo y legible); T2 = `(2).txt` (inicio 10:31:57; fragmentos de Zoom, casi todo ruido de ASR; solo 6 pasajes útiles). Las marcas son las del propio archivo. T1 cubre lo que `kickoff-analysis.md` no vio (después de 32:32). Solo se listan novedades o contradicciones. Hablante principal: Juan Sebastián Henao (JSH).

## 1. Advertencias críticas (pueden invalidar decisiones actuales)

- T1 34:54–35:06: "Si ya existe un tool [en GitHub, p. ej. de la semana pasada] que accede a la interfaz, NO lo usen. Eso no se puede hacer"; hay que desarrollar "desde cero" y la estrategia es lo importante. El ASR corta el objeto exacto ("interfaz de cierto…"), pero la regla apunta a herramientas ya hechas que operan la interfaz del reto.
  - Choca con `implementation-priorities.md` ("noVNC fijado" como dependencia candidata) y con la idea OpenClaw/Playwright de `design-exploration.md`. Los agentes de terceros ya estaban excluidos; falta aclarar librerías cliente RFB.
  - Acción: preguntar en WhatsApp/Zoom a mentores (Juan Cruz) si un cliente RFB/noVNC como librería de transporte es válido. Plan B: cliente RFB mínimo propio. Sin respuesta, no empaquetar OpenClaw ni agentes ya hechos.
- T1 47:16: aviso de presupuesto: con el modelo más caro "se les acaba el uso en dos llamadas" (el ASR dice "Fable 5"). Reforzar tope de costo por tarea (`US$45` según AGENTS.md).
- T1 01:19:24–01:19:43 (Valentina): el cambio/estrés del servicio NO se anuncia; hay que prever que habrá un cambio y trabajar con generalidad. Matiza T1 17:35 ("la plataforma les llegará la notificación del incidente"). No depender de la notificación para disparar adaptación.

## 2. Evaluación y rúbrica

- T1 18:19 y 47:54: pesos 30% diseño / 40% construcción / 15% comunicación (cómo lo cuentan) / 15% medición de la solución frente a la propuesta inicial (el ASR de este último es ambiguo: parece coherencia diseño-resultado). Puntaje 1–4 por ítem (1 = no demostró; 4 = sorprendería a un ingeniero senior). Ítems del diseño: entendimiento del problema, arquitectura y trade-offs, plan de construcción. Rúbrica completa en la plataforma. No estaban los pesos en los docs.
- T1 17:35, 30:42–31:25: agentes ocultos miden "constantemente por detrás"; analogía 70/30: los ejemplos son el 70% visto; la prueba corre sobre el 30% que no conocemos. Sin cifras formales, pero refuerza "no overfit" y confirma el set oculto (~100 casos, 5 ejemplos: T1 23:50–24:33, ya sabido).
- T1 20:25: jueces llegando durante el día (también remotos) más mentores; puntuación = ranking + scorecard/ficha técnica. "No hay un ganador"; el objetivo es matchmaking. Los intereses/industrias declarados en la plataforma se usan para eso.
- T1 21:31 (aclara "Scorecard: hoy" vs portal 11-oct): scorecard hoy al salir; las empresas pueden contactar "desde el martes" (13 oct). 3/4 mínimo = al menos 2 procesos abiertos (ya sabido).

## 3. Cambios entre tareas / incidente (Reto 1)

- T1 27:18–27:59: ejemplo dado por JSH: la interfaz arranca como una CLÍNICA y tras el incidente el caso de uso pasa a SUPERMERCADO. Cambia la superficie y también las reglas del negocio (T1 44:07: "cambio todas las reglas del negocio... tiene que aprender de verdad"). El README local dice SIGECOM (distribuidora): tratarlo como un dominio más, no como el único. El diseño debe aprender el entorno, no memorizar menús/posiciones.
- T1 25:40: hora del incidente "3 o 4, no aseguro la hora exacta"; T1 35:44: "a las 3:30 cambia la interfaz". Sin cambio frente a lo ya anotado (15:30).
- T1 27:18: el set oculto trae "un montón de casos, errores y vainas por explorar" (errores/casos borde, coherente con prompt injection en CL-0007).
- T1 41:25 / 41:41: Reto 1 se accede por VNC; no hay DOM ni HTML; solo interfaz gráfica (confirma el README).
- T1 35:44: cada participante tiene su propio servidor y máquina; credenciales por persona; presenciales y remotos con las mismas horas.

## 4. Restricciones: herramientas, modelos, hosting

- T1 34:06, 19:36: IA libre (Claude Code, Codex, pi); T1 50:07: OpenRouter/pi no tiene modelos bloqueados. Coincide con lo adoptado; solo se suma que no hay lista negra.
- T1 32:01, 30:42: hosting libre ("hasta en su país"), web/CLI da igual; solo debe cumplir el contrato y darle permiso/autenticación al evaluador según lo descrito en la plataforma. Railway no se menciona en ninguno de los dos transcripts.
- T1 30:01: repo público para que los agentes midan "cómo construyen" (ya sabido).
- T1 46:40–47:09 (Luis Rubiano): los transcripts/logs de terminal de los agentes con que construimos NO hay que entregarlos; lo importante es entry point + repo GitHub. (T1 46:40 "los logs de lo que construiste" suena a lo contrario, pero la aclaración posterior lo anula.) Confirma mantener `private/transcripts` fuera.

## 5. Entregables, formato y tiempos

- T1 01:18:33–01:19:00 (Rodrigo López-Guzmán): el documento de diseño NO tiene que ser de una sola página; puede ser un doc largo, PDF o un enlace web. Contradice "una página y diagrama" de kickoff-analysis (línea 29) y AGENTS.md. Formato libre (T1 29:30).
- T1 01:23:44 (T2, Henao): el diseño cierra a las 12; si falta algo se puede subir después ("retrasarse" la entrega del diseño), pero la idea es cerrar y pasar a ejecución. Una vez subido el diseño "puedes arrancar de una" a construir (T2 01:24:14). No olvidar los entregables.
- T2 53:46–55:04 (Juan Cruz): se puede subir el diseño ya a la plataforma; el repo tiene nombre libre; una vez cargado el link, el equipo lo deja intacto para que lo revisen, pero se puede cambiar hasta que termine esa etapa (decían quedar ~28 min, a ~11:30). Ambiguo: parece hablar del repo ligado al diseño, no del de ejecución; confirmar si hay congelamiento de repo antes de las 20:00.
- T1 34:06, 49:53: deadlines duros: 12:00 diseño; 20:00 todo completo con entry point listo (T1 25:13 dijo "8 o 9 de la noche" como esperanza, el límite publicado es 20:00); luego pitch/demo.
- T1 47:54 (T2 53:29): el diseño y diagrama se suben a la plataforma (T1 39:27: "una página, PDF o enlace, diagrama de arquitectura" en la plataforma).

## 6. Equipos

- T1 23:50, 28:36, 45:36: máximo 2; mismo reto; se arman después de la fase de diseño (que se mide individual). T1 32:32 dice "son aleatorios... pero usted lo puede elegir": se resuelve a favor de libre elección o solo.
- T2 01:24:23–01:24:29: Henao liberaría "ahorita" un canal en la plataforma para comunicarse y formar equipos; aún sin detalles. Revisar el portal tras las 12.
- T1 45:59: un solo reto por persona (puede dar acceso a ambos, pero se resuelve uno): el Reto 1 ya está elegido; no cambia nada.
- T1 33:37: Zoom abierto todo el día con mentores (Juan Cruz y externos); posibles breakout rooms.

## 7. Demo day y debrief

- Nada nuevo sobre horarios 20:00 debrief / 21:15 demo: los transcripts solo dicen "ahí pasamos al pitch" (T1 34:06) y que se medirá comunicación (15%). No aparece formato del demo, duración ni del resumen de tarea en estos archivos (el formato `respuesta:` solo está en el README del reto).
- Comunidad: T1 23:10, mentorías quincenales y cohortes presenciales mensuales; irrelevante para el reto.

## 8. Cosas que NO aparecen (no suponer)

Sin información sobre: límites de concurrencia o tamaño del set de tareas por corrida, reglas anti-hardcode adicionales, uso de Railway, formato de resumen, ni qué hace el check oculto. T2 00:15–00:38 menciona "rate limit" y "bonus tokens" con ASR ininteligible: no tomar como requisito.
