# PoC escritorio y diagnóstico El Chambas — 2026-10-10

## Resultado parcial

Docker disponible (29.8.2, Mac arm64). Imagen oficial Selenium Chromium
`4.49.0-20260909`, digest
`sha256:08fd293648e126275782c616a61f4ee1d90cf413b1972ebc35dbd054d6789f55`.
Contenedor Linux con escritorio/noVNC arrancado mediante `poc/desktop/compose.yaml`.
Solo noVNC se publica en loopback, puerto 17900. No se ha desplegado en Railway.
No se ha validado todavía navegación autónoma, agente visual ni compatibilidad
con el escritorio del evaluador. La inspección visual quedó bloqueada por una UI
de otra extensión abierta en Chrome; requiere que el usuario cierre esa UI.

Arranque: `docker compose -p frontier-desktop-poc -f poc/desktop/compose.yaml up -d`.
Parada: mismo comando sustituyendo `up -d` por `down`.
Visor: http://127.0.0.1:17900/ (contraseña predeterminada de laboratorio: `secret`).
La imagen incluye Chromium; no se abrió todavía una sesión de navegación interna.

## Bloqueo del sitio de prueba

- `elchambas.com` y `agente.elchambas.com`: DNS A 198.54.117.242;
  HTTPS rechaza conexión.
- NS de `elchambas.com`: `failed-whois-verification.namecheap.com` y
  `verify-contact-details.namecheap.com`. Evidencia fuerte de suspensión por
  verificación de contacto pendiente; falta confirmar en cuenta Namecheap.
- Railway muestra app y Postgres Online, deploy activo d09a7a72, crédito $4.28.
  Panel de deploy logs sin logs en el rango mostrado, no prueba ausencia de errores.
- Dominio `el-chambas-production.up.railway.app`: HTTP 400 `Invalid host header`.
  Chrome también mostró ERR_BLOCKED_BY_CLIENT para esa URL.
- Checkout local `el-chambas-producto/chambas/api.py` limita hosts en modo hosted
  a hostname de CHAMBAS_PUBLIC_ORIGIN y healthcheck.railway.app; esto es consistente
  con el rechazo del dominio alternativo, aunque no se verificó el código desplegado.
- Usuario informa cambio de cuenta ChatGPT y rotación OAuth, también El Chambas.
  No se han leído/reutilizado ni cambiado credenciales; los errores anteriores
  al login no demuestran un fallo OAuth.

Siguiente paso del dominio: verificar contacto en Namecheap/correo oficial.
No modificar NS, reiniciar producción ni ampliar hosts para resolver esta suspensión.

Fuentes oficiales:
- https://www.namecheap.com/support/knowledgebase/article.aspx/10698/46/what-to-do-if-my-domain-was-suspended-due-to-whois-verification-process/
- https://github.com/SeleniumHQ/docker-selenium/blob/trunk/README.md
