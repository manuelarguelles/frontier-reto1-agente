# Comparación de retos y estrategia de despliegue

Revisión del portal el 10 de octubre de 2026, aproximadamente 09:47 Lima/Bogotá. Se leyeron Brief, Restricciones, Aclaraciones y Entregables de ambos retos. Ya estaban abiertos antes de las 10:10 anunciadas inicialmente. Elección sigue cerrando a las 10:30 y es irreversible. Ningún reto se seleccionó.

Fuente de contratos: [portal de retos](https://frontier.lab10.ai/evento/reto). Captura estructurada: [challenge-contracts.json](challenge-contracts.json). El README del material asignado aún falta; no se inventa el esquema completo.

## Comparación

| Aspecto | Reto 1 | Reto 2 |
|---|---|---|
| Objetivo | Agente que opera aplicaciones desconocidas por pantalla | Reemplazo exacto de un servicio desconocido, incluidos errores |
| Trabajo principal | Observación visual, interacción, navegación, recuperación y comprobación | Experimentos, inferencia de reglas y estado, réplica y pruebas diferenciales |
| Riesgo técnico estimado | Acceso al escritorio, fiabilidad de acciones y límite de 5 minutos | Descubrir comportamientos raros, errores, estado y semántica exacta |
| Modelos propuestos, aún sin medir | Gemini para visión; apoyo de DeepSeek/Qwen durante desarrollo | DeepSeek para hipótesis y Qwen para scripts/réplica; el reemplazo podría ser determinista si el material lo permite |
| Entregables adicionales | Resumen por tarea según README | Especificación y log de experimentos según README |
| Transferencia de despliegue | API, runner y acceso a escritorio; estado de tareas y trazas | API compatible, reset reproducible y estado definido |

Inclinación provisional: Reto 2 facilita medir y defender hipótesis con evidencia y puede ahorrar inferencias en producción. No demuestra que sea más fácil: su complejidad real depende del protocolo y comportamientos del material. Reto 1 resulta atractivo si se busca una demostración de agente visual, con más dependencias de interacción. Manuel elige después de valorar ambos.

## Contratos publicados

Ambos: repo público, video público de hasta 2 minutos, GET /health listo devuelve 200, token del equipo en Authorization Bearer y disponibilidad desde 20:00 hasta fin del demo day. Diseño hasta 12:00: documento de una página y diagrama.

Reto 1:

- POST /tasks recibe tarea natural y escritorio (URL y contraseña); devuelve task_id en menos de 2 segundos. El servicio debe aceptar la tarea sin esperar a terminarla.
- GET /tasks/{task_id} devuelve estado en_curso, terminada o fallida y resumen.
- Cada tarea dispone de cinco minutos; evaluación en una app nunca vista y escritorio limpio.
- Restricción: no usar herramientas ni proveedores externos que resuelvan el trabajo por el equipo. Faltan detalles de primitivas de acceso permitidas y formato de resumen en README. No asumir acceso a DOM ni prohibición literal de bibliotecas de bajo nivel sin leerlo.

Reto 2:

- Aceptar los mismos requests, incluidas rutas inexistentes; reproducir errores y no solo respuestas exitosas.
- POST /__reset con token de equipo restaura estado inicial antes de cada test. Con otro token o sin token, responder como el original; no aplicar un rechazo genérico que cambie esa semántica.
- El reemplazo no puede consultar el original ni otro reemplazo. Separar herramientas de experimentación del servicio entregado.
- Scripts y fuzzers propios permitidos; no usar herramientas que hagan el trabajo por el equipo.

## Railway y portabilidad

Actualización del usuario: staff mencionó Railway y un servidor asignado. El contrato visible de ambos retos sigue diciendo “Despliégalo donde quieras”; no se vieron aclaraciones publicadas. Confirmar si el servidor asignado es entorno de pruebas, hosting de entrega o ambos, y si existe instrucción nueva sobre el destino final.

Propuesta basada en la preferencia de Manuel, pendiente del material y del destino asignado:

1. Durante diseño, definir despliegue; implementar y desplegar después del cierre de esa fase.
2. Usar un servicio o proyecto de hackatón en la cuenta propia, separado del servicio de El Chambas. Posteriormente se confirmó acceso a El Chambas, proyecto b4ddc8e6-d595-44ed-89a7-9d289f5c9f56, con dos servicios online y US$4.28 de saldo de prueba. hopeful-solace corresponde a otro ID. No se alteró El Chambas.
3. Empaquetar la solución con Dockerfile y configuración por entorno: PORT, token de equipo, credencial de modelo si hace falta y acceso al entorno. No fijar URLs propias en el código.
4. Validar /health y el contrato completo en ese entorno propio, sin consumir corridas ocultas salvo decisión explícita.
5. Desplegar el mismo commit o imagen en el destino del organizador cuando se conozca; configurar variables y permisos por separado. Validar otra vez antes de presentar la URL final.
6. Si existen datos necesarios, hacer explícita su persistencia/exportación. No asumir que archivos locales viajan automáticamente entre servicios o sobreviven a un redeploy.

Railway construye servicios desde Dockerfile y su almacenamiento fuera de volúmenes es efímero. Las variables pertenecen al entorno; las selladas no se copian a entornos de PR. Fuentes: [Servicios](https://docs.railway.com/services), [Variables](https://docs.railway.com/variables), [Entornos](https://docs.railway.com/environments).

## Preguntas que resuelve el material

- ¿Cómo se accede al escritorio o al servicio original y qué operaciones están permitidas?
- ¿Cuál es el esquema exacto de requests, respuestas, errores y resumen?
- ¿Cuáles son límites de concurrencia, persistencia y acceso de evaluación?
- ¿Qué semántica y protocolo usa el servicio del Reto 2 y qué debe incluir su log/spec?
- ¿Cómo entregan el Railway del organizador y cuál es su función?

Sin creación de infraestructura, publicación ni cambio de reto durante esta revisión.
