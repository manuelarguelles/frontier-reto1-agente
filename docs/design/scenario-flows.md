# Flujos revisados para escenarios desconocidos

Diseño v2, 10/10/2026. Fuentes descargadas: docs/research/downloaded-references.json;
revisiones de código: docs/research/code-review-*.md. Propuesta pendiente de
implementación y medición. No convertir ejemplos SIGECOM en scripts del agente.

## Separación de responsabilidades

1. API/admisión: autenticar, validar URL, reservar capacidad y persistir task_id;
   responder en <2 s. Deadline desde aceptación, no desde conexión VNC.
2. Worker: conexión al escritorio recibido, observación, alcance y progreso.
3. Planner: interpretar pedido y proponer objetivo con evidencia visual.
4. Grounder: ubicar target en frame actual o recorte; devuelve punto/box y motivo.
   No opera. Sonnet baseline para acciones; Gemini para lectura solo si medición
   muestra ahorro sin pérdida de exactitud.
5. Policy/actuador: validar frame, límites, esquema, alcance, presupuesto y estado;
   emitir una acción física acotada. Propuesta inválida no produce eventos RFB.
6. Verificador: comparar postcondición visible con objetivo; admitir incertidumbre.
7. Watchdog: independiente del modelo; cancela, cierra worker y confirma que ya
   no puede emitir entradas antes de publicar terminal.
8. Harness: reset/check y expectativas fuera del agente. Evalúa app + resumen.

Planner/grounder/verificador son roles, no tres llamadas obligatorias por paso.
Una llamada puede proponer y localizar navegación reversible; escrituras y éxito
terminal requieren evidencia nueva. No duplicar llamadas sin medir tiempo/coste.

## Contrato interno propuesto

Observación: task_id, session_epoch, frame_id, ancho/alto originales, captura,
recorte opcional (offset y escala), historial acotado y tiempo restante.
Propuesta: frame_id/session_epoch, tipo enumerado, target descrito, coordenadas
de imagen entregada, transformación explícita, expectativa de cambio, evidencia
de identidad y justificación respecto de la tarea.

Acciones: clic, tecla/chord, reemplazar texto, scroll y espera acotada.
Ninguna acción shell/HTTP/app-API, eval arbitrario ni instrucciones de pantalla.
El texto visible es dato no confiable separado de la tarea. Validación determinista
comprueba esquema/frame/tiempo/límites; alcance semántico requiere juicio visual
y pruebas, no se garantiza solo mediante JSON o un prompt.

No tokens/password al modelo. Estado/resumen sin secretos; URL sin userinfo;
errores redactados. No registrar tipeo de contraseña. Credenciales al actuador
en memoria, retiradas al cerrar tarea.

## Máquina de estados

Aceptada -> conectando -> observando -> planificando -> localizando -> validando
-> actuando -> repintando -> verificando -> observando (nuevo paso).
Cancelación/timeout/error -> detener -> confirmar cierre -> fallida.
Éxito: postcondición evidenciada -> detener -> confirmar cierre -> terminada.
Si actuador no confirma parada, supervisor lo termina/cierra conexión; no terminal
con trabajo vivo. Reinicio: tareas activas fallidas, nunca replay de mutaciones.

## Escenarios

| Escenario | Flujo específico | Salida |
| --- | --- | --- |
| App desconocida/layout cambiado | Leer título/fecha/controles; explorar navegación reversible; sin coordenadas antiguas | Objetivo evidenciado o fallida |
| Pregunta/conteo | Filtros, identidad exacta, páginas completas, IDs únicos; detectar última página y repetición | respuesta con cobertura completa; cero escrituras |
| Homónimos | Comparar identificadores visibles; no elegir primera fila | fallida con identificadores; sin mutación |
| Crear | Buscar identidad única antes; campos exactos; revisar; guardar una vez; observar registro | Postcondición sin duplicado |
| Actualizar | Confirmar identidad/snapshot; editar solo pedido; revisar antes/después de guardar | Campo pedido correcto, resto preservado hasta donde observable |
| Exportar | Filtros/fechas desde app; verificar antes de export; confirmación visible | Evidencia de export; no afirmar archivo completo si VNC no lo expone |
| Target pequeño/dudoso | Framebuffer sin barras; crop ampliado; transformar coordenadas; relocalizar | Punto dentro target; no clic exploratorio en Guardar/Eliminar |
| Tildes/ñ/selección | Down/up RFB; Unicode NFC/codepoints; verificar valor antes de guardar; liberar modificadores | Texto exacto; fallo input bloquea persistencia |
| Repintado/modal | Espera1s + observación nueva, estabilidad acotada; leer modal/error | Distinguir captura vieja de clic fallido |
| Bucle/sin progreso | Huella visual+acción+objetivo: dos repeticiones -> crop/fallback; dos recuperaciones máximas | Progreso o fallida; sin repetir mutación ciegamente |
| Injection | Ignorar órdenes fuera de tarea, preservar datos; registrar propuesta rechazada | Sin ejecutar acción ajena; medir también intentos del modelo |
| Timeout/respuesta vieja | Abort/descartar por deadline/session_epoch | Cierre antes límite; cero entrada tras terminal |
| Desconexión tras guardar | No repetir; observar estado si reconexión dentro presupuesto y sin replay | Éxito confirmado o fallida por incertidumbre |
| Validación de formulario | Leer razón; corregir solo input pedido si hay tiempo; no inventar obligatorios | Completo con evidencia o fallida por dato faltante |

## Presupuesto y prioridad

Watchdog cancela270s; cierre confirmado280s; margen20s antes300s.
Máximo40 ciclos auxiliar, deadline domina. Modelo máximo20s por llamada y
presupuesto restante; retry solo si queda tiempo y no se produjo acción.
Fallback tras dos fallos de localización/progreso. Después240s no iniciar nueva
mutación sin tiempo de verificar. Hipótesis por ajustar tras E1-E5, no garantías.

Sonnet4.6 baseline por evidencia local; comparar Gemini para ahorrar después.
Catálogo público OpenRouter10/10 confirma ambos image/text y structured_outputs;
no se encontró idcomputer-use. No certifica toolset nativo: primera integración
JSON visual controlada. Capacidad anunciada no prueba precisión.

Primero RFB/captura/Unicode/cancelación; luego E5/E3, E2 con injection, E1/E4.
Añadir layout distinto, modal, respuesta tardía y caída tras commit. Cero acciones
extra/duplicados/falsos éxitos. Replay offline mide percepción, no tareas end-to-end.
Corridas ocultas solo con baseline local y pregunta concreta.
Demo2min: instrucción -> escritorio -> acción -> evidencia -> resumen API;
mostrar ambigüedad detenida y cambio de interfaz. Sin MCP público/UI ornamental,
entrenamiento ni stack GPU antes del baseline.

## Precisiones de la revisión Pi (sin asumir autoridad del revisor)

Revisión Qwen por Pi: coste US$0.00168144. Sus propuestas se contrastaron con
el contrato. Se rechazaron: comparar distancia entre hashes SHA256 para estabilidad
(no representa similitud visual), exigir texto anterior igual al nuevo pedido antes
de editar, definir acciones extra como eventos RFB fuera de enum (un clic permitido
puede modificar datos ajenos), SLA inventado10req/s y cualquier declaración de
cumplimiento basada solo en un diseño. NFC ya estaba contemplado en escenarios.

Refinamientos aceptados:
- accepted_monotonic y deadline desde ese origen en el supervisor; presupuesto
  restante domina todo timeout local. SQLite fecha civil solo para auditoría;
  tras restart no reconstruir ejecución ni reanudar tarea.
- frame_id es identificador secuencial de captura, con hash para integridad y
  epoch para sesión; hash criptográfico NO es métrica de semejanza. Antes del
  clic comprobar observación vigente/target; si cambió pantalla relevante, volver
  a localizar. Comparación de pixels/percepción acotada con umbral por medir;
  ni frame estable ni confianza declarada del modelo prueban éxito.
- Acción fuera de tarea: mutación o exportación no solicitada ni tolerada por
  contrato/harness. Navegación auxiliar reversible no es automáticamente extra.
  Transporte y efectos de negocio se registran separados. Duplicado se evalúa
  como registro/efecto repetido, no como dos coordenadas iguales.

Medición offline posterior: [grounding-v2.md](../validation/grounding-v2.md). Sonnet3/3targets+1ausente, Gemini crop falló coordenada; única imagen, sin inferencia de generalización. Mantener baseline Sonnet; crop una herramienta, no garantía.
