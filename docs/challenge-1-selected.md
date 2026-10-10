# Reto 1 elegido — 10 octubre 2026, 10:23 BOG

Elección confirmada en portal por autorización explícita de Manuel.
Material descargado a `private/challenge-1/` (fuera de Git).

## Entorno confirmado por README

- SIGECOM: distribuidora, clientes/pedidos/facturas, navegador kiosko.
- Pantalla 1280×800. Solo captura y operación por VNC; app sin API ni salida de red.
- `/`: visor noVNC. `/websockify`: websocket RFB, contraseña del escritorio.
- `/health`: `{ "ok": true }`.
- POST `/__reset` y `/__check`: token del escritorio, diferente del token del equipo.
- Repintado hasta 1s; clic necesita al menos 100ms pulsado; seleccionar todo
  antes de reemplazar texto para evitar concatenarlo.
- Cinco pruebas locales disponibles; check evalúa cambios, acciones extra y duplicados.

## Contrato agente

POST `/tasks`: `{ "tarea": "…", "escritorio": { "url": "wss://…/websockify", "password": "…" } }`.
Devuelve `{ "task_id": "…" }` en menos de 2s; proceso en segundo plano.
GET `/tasks/{task_id}`: `{ "estado": "en_curso|terminada|fallida", "resumen": "…" }`.
GET `/health`: HTTP200. Todas las llamadas con Bearer token de equipo.

## Implicaciones de diseño

El transporte debe ser VNC/RFB, no DOM/Playwright directo a SIGECOM.
Usar siempre URL/contraseña recibidas en cada tarea; aplicación y escritorio cambian.
Detener acciones antes de cinco minutos y al reportar estado final para no contaminar
la siguiente tarea. Evitar falsos éxitos, duplicados y cambios fuera de alcance.
Fecha relativa se interpreta con la fecha visible en la app.
Preguntas: línea `respuesta: <valor>`; dos datos separados por `;` en orden pedido.
No incluir secretos en resumen ni logs.

Validación visual pendiente: Chrome bloqueó apertura por UI de otra extensión abierta.
El usuario debe cerrarla. PoC local de escritorio sigue separada y no demuestra
compatibilidad con este entorno aún. No se implementó ni entregó el agente.
