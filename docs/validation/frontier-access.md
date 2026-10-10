# Validación de accesos Frontier — 10 octubre 2026

Comprobaciones realizadas a las 11:32–11:34 Lima/Bogotá (UTC−5), únicamente de lectura. No se modificó SIGECOM ni se gastó ninguna evaluación.

## Comprobado ahora

| Recurso | Resultado | Qué acredita |
| --- | --- | --- |
| `https://frontier-r1-tm55-production.up.railway.app/health` | HTTP 200, `{"ok":true}` | El servicio de escritorio responde y declara salud correcta. |
| `https://frontier-r1-tm55-production.up.railway.app/` | HTTP 200; validación TLS correcta; 0.34 s | El visor noVNC es accesible desde esta máquina. |
| `https://frontier.lab10.ai/entrar` | HTTP 200; validación TLS correcta; 1.13 s | El portal de acceso responde. No verifica por sí solo la sesión autenticada. |

Se usó `curl` con límite de 20 segundos y validación TLS predeterminada. No se consultaron endpoints de mutación, reset, check ni evaluación oculta. No se leyeron ni registraron contraseñas/tokens.

## Evidencia visual anterior, separada de esta comprobación

La exploración de 10:33–10:58 ya confirmó autenticación VNC y navegación visual por SIGECOM v3.9, clientes y facturas. El registro está en [desktop-evidence.md](../design/desktop-evidence.md). Las capturas privadas permanecen bajo `artifacts/desktop-poc/` (ignoradas por Git).

Esa evidencia acredita una entrada real previa. No demuestra que la sesión siga conectada a las 11:34 ni que el futuro agente headless funcione.

## Pendiente: revalidación visual actual

El subagente de validación no tiene la sesión visual persistente del agente principal: `agent` y `cua` están ausentes en su Node REPL. Además, los `SKILL.md` anunciados de Chrome y Computer Use no existen en las rutas suministradas; sus directorios `skills/` están vacíos. Se buscó el archivo en el catálogo local sin encontrarlo.

Por tanto no se inició otra automatización ni se manipuló el navegador con una herramienta alternativa. Falta recuperar el bootstrap oficial o reutilizar una sesión visual ya inicializada por el agente principal para observar el noVNC actual y efectuar una navegación de lectura.

Pendientes también: reautenticación independiente si la conexión actual caducó, comprobación del token de escritorio y del token de equipo sin revelar valores, y ejecución en el contenedor del agente durante la fase autorizada de implementación. La respuesta HTTP 200 del visor no sustituye esas pruebas.

No se creó ni cerró ninguna pestaña en esta comprobación. No hay evidencia visual nueva porque el runtime visual no pudo inicializarse con las instrucciones disponibles.
