# Análisis del kickoff de Frontier

Fuente: avance de transcripción compartido por Manuel el 10 de octubre de 2026. Cubre 00:00–32:32 de una reunión iniciada a las 09:07:02. Las marcas siguientes son relativas al comienzo de la transcripción. El texto automático tiene errores de reconocimiento; las cifras o frases ambiguas no se convierten en requisitos confirmados.

## Evidencia por tema

| Marca | Hallazgo | Consecuencia |
|---|---|---|
| 15:45–16:54 | El primer checkpoint mide el diseño del sistema; durante esa fase no se implementa. Importan escalabilidad, profundidad y trade-offs. | Preparar diseño y diagrama antes de escribir la solución del reto. La instalación y pruebas de pi realizadas fueron preparación de herramientas. |
| 16:54–18:19 | Existe evaluación con casos desconocidos y cambio del entorno durante la jornada para evitar overfitting. | Diseñar adaptación y medir generalización; no optimizar solo los ejemplos. |
| 19:36 | Se pueden usar las herramientas que se quieran; pi y OpenRouter se ofrecen como recursos. | Pi no es obligatorio; mantener el método de modelos ya aprobado sin confundirlo con una regla del concurso. |
| 20:25–21:31 | El objetivo también es conectar participantes con empresas y entregar una ficha técnica. Se anuncia un umbral 3/4 y al menos dos oportunidades. | Preparar evidencia comprensible para revisión técnica. El cómputo del umbral y sus condiciones no están especificados aquí; no asumir oferta o contratación garantizada. |
| 23:50–24:33; 28:36 | Diseño individual; equipos opcionales de hasta dos personas después de esa fase y con el mismo reto. | Cada participante entrega y defiende su diseño. No formar equipo antes del cierre del diseño. |
| 24:33 | Se anuncian cinco ejemplos y aproximadamente cien casos ocultos por reto. | Los ejemplos no definen toda la distribución. Confirmar cantidades y formato en el brief; no confundir cantidad de casos con las tres corridas del portal. |
| 25:40–27:18 | Reto 1: operar una interfaz gráfica antigua mediante clics y menús; sin acceso al código del servidor. El incidente cambia aspectos de la superficie o dominio. | Proponer observación, acción y verificación del estado. Evitar depender de coordenadas fijas. El detalle de accesos permitidos depende del brief. |
| 27:18–28:36 | Reto 2: explorar un servicio sin documentación, con operaciones y forma de acceso inusuales; el incidente cambia el escenario. | Proponer experimentos reproducibles, hipótesis y una especificación con evidencia. |
| 29:30–30:01 | El diseño acepta archivos como PDF, imágenes y documentación. Para ejecución el repo GitHub debe ser público. | Mantener original y trazas privadas fuera de Git; preparar un repo reproducible publicable. El portal sigue indicando una página de diseño más diagrama. |
| 30:01–30:42; 32:01 | Hay que desplegar un entrypoint accesible y cumplir el contrato publicado en la plataforma. No se prescribe un proveedor de hosting; URL y autenticación deben ajustarse al contrato. | Leer primero contrato, formatos, límites y acceso del evaluador; elegir hosting a partir de esos requisitos. Una demo visual por sí sola no sustituye la API. |

## Diferencias y puntos abiertos

| Tema | Portal revisado | Avance oral | Regla de trabajo |
|---|---|---|---|
| Incidente | 15:30 | Entre las 15 y las 16, sin asegurar hora exacta (25:40) | Prepararse para 15:30 y revisar notificaciones; no fijar la lógica al reloj. |
| Cierre del diseño | 12:00 | Aproximadamente 12:00 o 11:30 (25:13) | Planificar terminar a las 11:30; conservar 12:00 como cierre publicado mientras no cambie. |
| Scorecard | Desde el 11 de octubre | “Hoy” (21:31) | No prometer disponibilidad inmediata; verificar actualización del portal. |
| Formación de equipos | Opcional, mismo reto, después del diseño | Se explica que son elegidos (23:50); frase final ambigua a 32:32 | Hasta dos personas, elegidas por participantes y mismo reto; consultar staff si la plataforma contradice esto. |
| Frecuencia de evaluación | Tres corridas durante el día y una final adicional | Se describe medición “por detrás” durante entregas | Usar el límite explícito del portal; no interpretar la charla como corridas ilimitadas. |
| Diseño | Una página y diagrama | Se admiten varios formatos de archivo | La flexibilidad de formato no elimina el alcance del entregable. |

## Decisiones de trabajo

Son criterios adoptados para preparar el proyecto, no una elección de reto ni autorización de publicación o entrega. D02–D04 son propuestas de ingeniería derivadas del objetivo de adaptación y trazabilidad, no requisitos literales del organizador. Su viabilidad depende del brief y contrato.

| ID | Decisión | Motivo y evidencia | Validación pendiente |
|---|---|---|---|
| D01 | Mantener la fase de diseño separada de la implementación del reto. | 15:45: el diseño se evalúa antes de ejecutar. | Brief, formato y cierre vigente. |
| D02 | Diseñar un ciclo observar → decidir → actuar → comprobar → actualizar lo aprendido. | 17:35 y 27:59: el cambio prueba adaptación a escenarios no vistos. | Que el ciclo funcione en variantes locales y permita recuperar fallas. Es una propuesta arquitectónica, no una exigencia literal. |
| D03 | Separar reglas del dominio, estado aprendido y adaptador de entorno. | 26:38–28:36: cambia la superficie o caso de uso. | Actualizar adaptador o hipótesis sin reescribir la solución completa. |
| D04 | Preparar un registro reproducible de acciones, observaciones, hipótesis y evidencia; distinguir confirmado de supuesto. | Reto 2 según rúbrica y 27:18; ambos requieren explicar resultados. | Relacionar cada comportamiento documentado con la evidencia que lo prueba. |
| D05 | Priorizar cumplimiento del contrato del entrypoint y reproducibilidad del repo. | 29:30–32:01: evaluación automática mediante API y repo público. | URL accesible, autenticación, esquema, errores y timeouts según brief; README ejecutable por otra persona. |
| D06 | Diseñar casos locales con variaciones durante diseño; implementarlos y ejecutarlos después del cierre de esa fase, antes de consumir el set oculto. | Cinco ejemplos mencionados a 24:33 y tres corridas según portal. | Baseline local, cambio simulado y medición posterior; gastar una corrida solo con una hipótesis concreta. |
| D07 | Comparar modelos por aciertos, latencia, costo y uso correcto de herramientas en el reto. | Recursos libres (19:36), presupuesto del portal y pruebas básicas en validation/pi-checks.json. | Conservar los modelos de desarrollo aprobados; seleccionar el modelo entregado con evidencia de casos locales. |
| D08 | Elegir el reto después de leer ambos briefs y contratos. | Elección irreversible en el portal. | Estimar complejidad de acceso, despliegue y evaluación. No seleccionar a partir de esta transcripción incompleta. |

## Lista de comprobación para el diseño

La rúbrica ya revisada pide entendimiento del problema (supuestos, límites y casos difíciles), arquitectura con alternativas descartadas y razones, y un plan de medición con métricas y casos concretos. La salida publicada es un documento de una página y un diagrama. Durante diseño se definen los casos; no se implementa ni ejecuta la solución del reto.

Antes de cerrar el diseño hay que extraer del brief: esquema de entrada/salida, acceso y operaciones permitidas sobre el entorno, autenticación del entrypoint, tiempos y límites, reglas de persistencia, concurrencia y forma de verificar resultados. Son preguntas por resolver, no restricciones inventadas. No se asume REST, GraphQL ni otro protocolo hasta leer el contrato.

## Secuencia antes de ejecutar

1. Leer ambos briefs y contratos; registrar restricciones, ejemplos y criterios de aceptación.
2. Compararlos por viabilidad en el tiempo, acceso al entorno, adaptación y facilidad de medir. Manuel confirma la elección antes de 10:30.
3. Completar el diseño individual con objetivo, límites, componentes, alternativas descartadas, recuperación y métricas. Objetivo interno: 11:30; cierre publicado: 12:00.
4. Tras el cierre de diseño, decidir si se continúa solo o con una persona del mismo reto.
5. Construir el entrypoint, evaluaciones locales y trazas; desplegar temprano para validar acceso.
6. Ante el incidente, conservar un baseline, detectar qué cambió, adaptar y medir la diferencia; documentar las causas.

## Procedencia

Original completo e índice de intervenciones en `private/transcripts/`, excluidos de Git. Resumen basado en el avance recibido; no se descargó el enlace privado de Tactiq. Hash y líneas originales están en el índice local para poder comprobar las citas. Las reglas del portal provienen de la revisión de las secciones Detalles, Herramientas, Reto, Rúbrica y Resultados de esta sesión.
