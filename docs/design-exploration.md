# Exploración de arquitectura para ambos retos

Estado: análisis y propuestas del 10 de octubre de 2026; ningún reto elegido y ninguna implementación autorizada mediante este documento. Basado en contratos publicados, idea de Manuel y documentación oficial. No sustituye el diseño individual de una página.

## Memoria nueva confirmada

Railway se pudo leer en el navegador conectado: workspace manuel-arguelles-alumno, proyecto el-chambas, dos servicios online, crédito de prueba mostrado US$4.28 y 15 días. Proyecto confirmado: b4ddc8e6-d595-44ed-89a7-9d289f5c9f56. No confundirlo con hopeful-solace, que es otro ID. Frontier y Railway accesibles en dos pestañas del mismo navegador conectado. No se ha creado servicio de hackatón ni alterado El Chambas.

Manuel propone una capa sobre sistemas legacy: OpenClaw en una VPS, skills, navegador y Playwright, con API o MCP para recibir solicitudes de terceros. Su principal duda es si puede ejecutarse un navegador dentro de la VPS. Es una hipótesis a evaluar, no decisión implementada.

## Viabilidad técnica de la idea

Playwright soporta Chromium headless y ejecución en Docker/Linux. Un navegador completo puede funcionar en un servidor sin pantalla física. OpenClaw tiene perfiles de navegador dedicados y acciones respaldadas por Playwright. Esto respalda la posibilidad técnica de una capa de automatización web.

Fuentes oficiales consultadas: [Playwright Docker](https://playwright.dev/docs/docker), [Playwright Browsers](https://playwright.dev/docs/browsers), [OpenClaw Browser en su repositorio oficial](https://github.com/openclaw/openclaw/blob/main/docs/tools/browser.md). El buscador web no estuvo disponible por credencial expirada; se consultaron directamente páginas oficiales y el archivo fuente oficial de OpenClaw. No se instalaron componentes.

Playwright controla navegadores, no de forma general todas las aplicaciones nativas del sistema operativo. Un navegador propio en la VPS no obtiene por sí solo control del escritorio remoto del evaluador. Si el escritorio se entrega por una web noVNC u otra vista canvas, Playwright puede potencialmente abrir esa vista y enviar eventos; la aplicación dentro del escritorio sigue siendo píxeles, no un DOM automáticamente accesible. noVNC es solo una hipótesis hasta leer el material.

## Reto 1

El problema concreto no es conectarse a absolutamente cualquier sistema: debe operar apps que se acceden igual que la de pruebas y generalizar a una app no vista en un escritorio limpio. POST /tasks recibe tarea y acceso al escritorio, debe devolver task_id en menos de dos segundos; el worker dispone de cinco minutos. GET /tasks/{task_id} expone estado y resumen según README pendiente.

Arquitectura propuesta:

- API de contrato y registro de tareas.
- Cola/worker para operar asíncronamente.
- Adaptador de acceso al escritorio según el protocolo permitido.
- Agente propio: observar imagen o superficie permitida, decidir acción, ejecutarla, comprobar resultado y actualizar conocimiento.
- Memoria acotada de lo aprendido, evidencia de acciones, presupuesto temporal y recuperación de errores.

OpenClaw completo es una alternativa de producto, pero su control de navegador y skill de automatización ya incluyen parte central del trabajo. El brief prohíbe herramientas/proveedores que hagan esto por el equipo. No se afirma que OpenClaw esté prohibido; hay que aclararlo con staff antes de basar la entrega en él. Un API propio y un loop propio con primitivas de captura/clic/teclado ofrecen mayor trazabilidad del aporte y menor complejidad inicial.

MCP sería útil como interfaz adicional para clientes, pero no reemplaza los endpoints HTTP exigidos y no es necesario para el primer alcance del concurso. Playwright se usaría como adaptador si el acceso es web; no es el razonador. Gemini es candidato para visión, aún no probado con el escritorio real.

Principales pruebas de diseño: completar una tarea en app no vista, comprobar éxito observado, recuperar una acción fallida, tolerar cambios de menús/layout, y terminar dentro de cinco minutos sin exceder presupuesto. No basta que el modelo declare éxito.

## Reto 2

La capa sobre el sistema original se usa para experimentar, no para resolver requests del reemplazo desplegado. Propuesta: harness de experimentos propio → hipótesis → pruebas dirigidas y fuzzing → especificación con evidencia → implementación del reemplazo → pruebas diferenciales locales. Después del incidente, comparar evidencia nueva, actualizar reglas y repetir.

Ejes de exploración: entradas válidas/invalidas, límites, rutas desconocidas, errores, orden y secuencia de llamadas, estado e invariantes. No asumir que es stateless ni que JSON es el único formato. POST /__reset requiere semántica publicada, incluido comportamiento como original sin token o con otro token.

El original no debe ser dependencia del reemplazo entregado. DeepSeek puede apoyar hipótesis y Qwen scripts/implementación. Si la semántica es determinista, el modelo puede intervenir en la ingeniería sin ser necesario en cada request de producción. La complejidad real depende del README y material pendientes.

## Comparación para decidir

Reto 1 prioriza agente visual y generalización en interacción; Reto 2 prioriza ciencia de experimentos, semántica exacta y evidencia. El primero tiene riesgo de acceso al escritorio y latencia; el segundo riesgo de cobertura incompleta y detalles de estado/errores. La preferencia provisional por Reto 2 procede de facilidad de medir y controlar costos, no de una prueba de que sea más sencillo. El interés de Manuel por la capa legacy es una razón válida para preferir Reto 1 si el material confirma acceso viable y primitives permitidas.

## Railway y VPS

Railway puede alojar el servicio de API y un proceso con navegador empaquetado, sujeto a recursos y modo de acceso. Un servicio Railway en contenedor no equivale a una VPS administrable completa. No asumir que podemos instalar allí un escritorio persistente como en un host con control total. Preparar paquete portable y configuración por entorno; persistencia explícita si hace falta. Crédito US$4.28 es de Railway, separado de US$45 de OpenRouter. Dimensionar al conocer material y restricciones.

## Preguntas pendientes

1. ¿El escritorio es noVNC/VNC/RDP u otro protocolo, y se permiten primitivas de captura/clic/teclado/DOM?
2. ¿Se permite OpenClaw como runtime, o debe implementarse el loop de agente? La frase de restricción no permite concluirlo sola.
3. ¿Qué formato exacto recibe POST /tasks y devuelve el resumen?
4. ¿Qué entorno asigna staff en Railway y cuál es su función?
5. ¿Qué operaciones/protocolo y límites tiene el servicio del Reto 2?

Próximo paso: aclarar acceso y restricciones y escoger el reto con Manuel antes de 10:30. No enviar preguntas al staff ni elegir reto sin instrucción de Manuel.
