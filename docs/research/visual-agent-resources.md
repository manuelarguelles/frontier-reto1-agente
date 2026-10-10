# Recursos existentes para el agente visual Reto 1

Revisión de fuentes primarias: 10 de octubre de 2026. Búsqueda web, arXiv, documentación oficial y API pública de GitHub. No había herramientas específicas de papers/GitHub expuestas; se buscaron esos dominios mediante web y se verificó metadata con HTTP de solo lectura. Ningún repositorio fue ejecutado, ningún modelo nuevo fue probado y ninguna implementación fue modificada.

## Decisión que recomiendo

Mantener motor propio y reutilizar **noVNC como transporte**. El cuello de botella demostrado es grounding/input, no falta de un framework. Capturar el framebuffer exacto, conservar dimensiones/offsets, introducir recorte ampliado cuando el target sea pequeño y verificar el resultado después de cada acción. Sonnet 4.6 tiene una acción real correcta en nuestra evidencia, insuficiente para afirmar éxito general. Separar modelo que interpreta tarea de método que localiza el elemento es una alternativa respaldada por investigación; inicialmente puede ser el mismo modelo con dos solicitudes, solo si el presupuesto temporal lo permite.

La restricción del reto sobre herramientas/proveedores que hagan la tarea exige distinguir biblioteca de protocolo, modelo fundacional y agente prefabricado. Usar un agente completo de los siguientes repositorios sería una opción a aclarar con organizadores; aquí se recomiendan como referencias de ingeniería. Esto es interpretación del brief, no aprobación oficial.

## Recursos más cercanos

| Recurso y fuente primaria | Qué aporta | Aplicación y limitaciones |
|---|---|---|
| [noVNC API](https://novnc.com/noVNC/docs/API.html) y [licencias](https://github.com/novnc/noVNC/blob/master/LICENSE.txt) | RFB sobre WebSocket, credenciales, framebuffer, teclado y desconexión | Encaja directamente con `wss://…/websockify`. `getImageData`/`toBlob`/`toDataURL` capturan imagen remota sin barras del navegador; `sendKey(keysym, code, down)` permite pulsar/soltar explícitamente. Biblioteca, no agente. Core MPL 2.0; HTML/CSS BSD 2, otros assets con licencias propias. Mantener avisos y revisar obligaciones si se modifican archivos. |
| [mayflower/vnc-use](https://github.com/mayflower/vnc-use) | Agente LangGraph VNC con Gemini Computer Use/Haiku, observación actual más historia textual, coordenadas normalizadas y timeout de 300 s | Coincidencia conceptual casi exacta. Referencia de bucle/acciones/credenciales. Depende de `vncdotool`, ejemplos de VNC TCP, sin evidencia de conexión WSS directa. Su MCP no implementa autenticación; no sustituye nuestro contrato async ni demuestra cancelación dura. MIT; no incorporarlo completo sin resolver restricción. |
| [arthurkatcher/desktop-use](https://github.com/arthurkatcher/desktop-use) | Consola VNC, screenshots anterior/actual, backend OpenAI compatible, anti-loop e interrupción de decisiones en vuelo | Buen patrón: descartar propuesta pendiente al cancelar, no ejecutar una decisión vieja. Su actuador remoto utiliza HTTP/local XTest, no nuestro único acceso RFB. MIT; repo pequeño, no verificado por nosotros. |
| [Google computer-use-preview](https://github.com/google-gemini/computer-use-preview) y [documentación](https://ai.google.dev/gemini-api/docs/computer-use) | Ejemplo oficial de modelo visual y ejecución local; separación respuesta del modelo/actuador | Apache 2.0. Backend Playwright/Browserbase, no VNC. Adaptar conceptos, no navegación DOM remota ni backend externo. **Gemini 2.5 Flash general no es Gemini 2.5 Computer Use**, especializado inicialmente sobre Pro. README actual también lista Gemini 3.6 Flash y 3.5 Flash/Lite; disponibilidad por nuestra API OpenRouter sin confirmar aquí. |
| [Anthropic computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) y [quickstarts](https://github.com/anthropics/anthropic-quickstarts) | Modelo propone herramientas y nuestra aplicación las ejecuta; escala, zoom y diagnóstico de clic | Documentación actual destaca precisión mecánica de Sonnet 4.6 frente a Opus 4.6. Las coordenadas deben usar exactamente la imagen entregada y convertirse al display. Ejemplos MIT. No asumir que toolset nativo/betas Anthropic se transmitan mediante OpenRouter; JSON visual genérico es otra integración. |
| [UI-TARS](https://github.com/bytedance/UI-TARS), [paper](https://arxiv.org/abs/2501.12326), [UI-TARS Desktop](https://github.com/bytedance/UI-TARS-desktop) | Modelo especializado y stack desktop/agente | Repos Apache 2.0. Alternativa futura de grounding, no reemplazo rápido del agente propio. Modelos/checkpoints tienen condiciones propias que deben comprobarse. Desktop completo añade infraestructura ajena y posible incompatibilidad con restricción. |

## Percepción y grounding sin API del sistema

| Recurso | Idea útil ahora | Coste/limitación de integración |
|---|---|---|
| [ShowUI, 26/11/2024](https://arxiv.org/abs/2411.17465), [repo](https://github.com/showlab/ShowUI) | Modelo 2B visual; permite combinar planner general con localizador especializado. Repo ofrece refinamiento iterativo y demos. | Código Apache 2.0; condiciones de checkpoints/demo no verificadas. Inferencia local con Transformers/vLLM: no se debe asumir que quepa o sea rápida en Railway 1 GB. Demo alojada no garantiza SLA y podría infringir restricción de proveedores. |
| [GUI-Actor, 03/06/2025](https://arxiv.org/abs/2506.03143), [repo MIT](https://github.com/microsoft/GUI-Actor) | Regiones candidatas más verificador en vez de confiar en coordenadas textuales. Mejora publicada en resoluciones/layouts desconocidos. | Requiere modelo especializado/inferencia; sus scores de grounding no son éxito de tareas SIGECOM. No entrenar hoy. Reusar idea de verificación independiente y recorte, sin afirmar equivalencia con su algoritmo. |
| [OmniParser](https://github.com/microsoft/OmniParser/blob/master/README.md) | Convierte screenshots en elementos/boxes/descripciones; alternativa a que el VLM adivine coordenadas | No usa DOM remoto. Repo reconocido CC BY 4.0 por GitHub; README distingue detector nuevo `icon_detect_v3` MIT basado en YOLOv9, detectores anteriores AGPL y caption MIT. Seleccionar versión/pesos importa. Python, modelos/OCR y latencia extra; no es primera ruta para las horas disponibles. OmniTool es agente/VM completo y distinto del parser. |

Propuesta concreta para después de diseño: cada imagen incluye ancho/alto remoto y frame_id; cada acción referencia ese frame_id. Si se usa crop `(ox,oy,cw,ch)` y modelo devuelve posición en imagen ampliada `(x',y')` de dimensiones `(sw,sh)`, convertir `x=ox+x'·cw/sw`, `y=oy+y'·ch/sh`; rechazar fuera de límites. Nunca mezclar píxeles nativos con coordenadas normalizadas 0–999/1000. Confirmar convención exacta del modelo, no inferirla por su nombre. El recorte es percepción; no implica descubrir DOM ni automatizar la aplicación por API.

Teclado pendiente: probar Ctrl down → A down/up → Ctrl up, borrar y verificar campo vacío; después escribir y leer la imagen. `sendKey` explícito evita depender del atajo del navegador host. Para tildes, probar keysyms y clipboard RFB si el servidor lo soporta; `clipboardPasteFrom` está documentado pero eso no demuestra que la app vaya a pegar. El fallo previo en escritura nativa de macOS→noVNC no prueba una limitación del protocolo.

## Papers que cambian nuestras decisiones de validación

- [Agent S2, 01/04/2025](https://arxiv.org/abs/2504.00906): separa responsabilidades generalistas/especialistas y grounding. Útil como justificación de planner más localizador/fallback; el stack completo añade búsquedas/modelos y no garantiza caber en 300 s.
- [ScreenSpot-Pro, 04/04/2025](https://arxiv.org/abs/2504.07981), [repo](https://github.com/likaixin2000/ScreenSpot-Pro-GUI-Grounding): apps profesionales, targets pequeños y grounding difícil; propone búsqueda visual por regiones. Adoptar evaluación de target real en screenshot y zoom cuando hay incertidumbre. No trasladar scores publicados a nuestro aplicativo.
- [OSWorld, 11/04/2024; revisión 30/05/2024](https://arxiv.org/abs/2404.07972), [repo](https://github.com/xlang-ai/OSWorld): estados iniciales reproducibles y evaluación por ejecución. Refuerza separar mensaje “terminada” de resultado verificado. Aprovechar enfoque del benchmark, no instalar sus entornos completos hoy.
- [VPI-Bench, 03/06/2025](https://arxiv.org/abs/2506.02456): instrucciones maliciosas visibles dentro de UI; defensas solo por prompt dan mejora limitada. Añadir métrica **intento de acción ajena**, además de modificación ejecutada; nuestra nota de borrar pedidos debe permanecer como dato no confiable.
- [MMPIBench, 08/09/2026](https://arxiv.org/abs/2609.09404): distingue percepción, planificación, intento de herramienta y ejecución. Sirve para medir dónde se detiene la inyección. Es preprint reciente; no tratar resultados como consenso ni como certificado de nuestros modelos.

## Priorización por tiempo

Recurso adicional compartido por Manuel: [Reverse API Engineer](https://github.com/kalil0321/reverse-api-engineer). [Revisión específica](reverse-api-engineer.md): genera clientes desde tráfico web autorizado; no opera exclusivamente RFB/píxeles y no accede al tráfico de negocio del escritorio remoto mediante noVNC. No encaja como actuador de SIGECOM. Su política de incrustar secretos en clientes generados exige cambios antes de cualquier uso real; inspeccionado, no ejecutado.

Antes del mediodía: incorporar estas alternativas descartadas y riesgos al diseño, sin instalar stacks. Tras inicio de implementación: (1) transporte RFB/captura exacta y prueba input/Unicode; (2) API async, cierre de actuador y límites; (3) bucle visual propio con evaluación de coordenadas y fallback; (4) replay de imágenes y casos funcionales locales. Solo considerar ShowUI/GUI-Actor/OmniParser si grounding sigue fallando y existe capacidad de inferencia compatible. No gastar validaciones ocultas para evaluar una biblioteca sin pruebas locales.

## Estado y licencia: metadata verificada

API pública GitHub consultada el 10/10/2026. `pushed_at` indica actividad del repositorio, no release estable ni validación del código. Todos los siguientes reportaban `archived=false`.

| Repo | Último push UTC | Licencia reportada/verificada |
|---|---|---|
| noVNC | 2026-10-05 | Core MPL 2.0 confirmado en LICENSE.txt; API automática NOASSERTION |
| mayflower/vnc-use | 2026-09-03 | MIT |
| arthurkatcher/desktop-use | 2026-08-02 | MIT |
| google/computer-use-preview | 2026-07-28 | Apache 2.0; redirige a google-gemini |
| anthropics/anthropic-quickstarts | 2026-10-08 | MIT |
| showlab/ShowUI | 2026-04-24 | Apache 2.0 |
| microsoft/GUI-Actor | 2026-04-13 | MIT |
| microsoft/OmniParser | 2026-07-20 | CC BY 4.0 repo; componentes/pesos distintos como arriba |
| bytedance/UI-TARS | 2026-01-27 | Apache 2.0 |
| bytedance/UI-TARS-desktop | 2026-10-09 | Apache 2.0 |

Las licencias de artículos, datasets, servicios alojados y checkpoints no se infieren de la licencia del repo. Revisión de cumplimiento completa pendiente antes de incorporar código/pesos. Ninguna búsqueda demuestra resolución automática del reto, generalización a apps desconocidas, ausencia de inyección ni latencia dentro del contrato.
