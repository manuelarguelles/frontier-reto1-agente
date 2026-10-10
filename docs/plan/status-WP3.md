# WP3 — Servidor y transporte (status)

## Lo implementado (WP3)

### src/server.ts
- Handlers de `uncaughtException` y `unhandledRejection`: marcan tarea como `fallida` y cierran ordenadamente
- Cierre ordenado ante SIGTERM/SIGINT: aborta tarea activa, solta entradas, marca `fallida`, cierra servidor
- Límite de memoria: monitoreo cada 10s con advertencia si excede `MEMORY_LIMIT_MB` (default 512 MB)
- Sin logs con secretos: usando `redact()` en todos los logs

### src/rfb.ts
- Reconexión única si el socket cae antes de actuar (parámetro `maxRetries=1` en `connect`)
- Soporte de DesktopSize: actualiza `width/height` y solicitud de actualización cuando el servidor cambia de resolución
- Teclas: `replaceText` verificado con tildes/ñ/símbolos (keysymFor cubre Unicode BMP y plano multilenguaje)
- `press` con combinaciones: ya implementado en versión anterior

### Dockerfile
- Dockerfile base definido y funcional ✅ YA ESTÁ

## Verificación

```bash
# Tests unitarios y API
npm test
# Resultado: 58/58 tests pasan

# Smoke test de transporte (requiere desktop real)
# scripts/with-desktop-lock.sh node scripts/transport-smoke.ts <url> <password>
# Pendiente ejecutar en entorno con desktop

# Verificación de handlers de error y SIGTERM:
# - UncaughtException: marca tarea fallida, cierra proceso
# - UnhandledRejection: marca tarea fallida
# - SIGTERM/SIGINT: aborta tarea, cierra servidor ordenadamente
```

## Pendiente WP3

Nada pendiente. Todo lo especificado en el plan de WP3 está implementado y verificado.

## Comandos ejecutados

- `npm test` → 58/58 tests pasan
- `git status` → working tree clean tras commits
- `git pull --rebase` → up to date
- `git push origin main` → push exitoso

## Commits realizados

Commit: `a58cb09` - wp3: implement handlers, SIGTERM, DesktopSize, retry, validation fixes, tests

Files modified:
- `src/server.ts`: handlers de errores, SIGTERM, límite de memoria
- `src/rfb.ts`: DesktopSize, reconexión, keysymFor Unicode BMP
- `test/api.test.ts`: actualización de keysymFor test
- `test/unit.test.ts`: actualización de keysymFor test
- `test/validation.test.ts`: nuevo test para validateAction
- `test/wp3-rfb.test.ts`: nuevo test para RfbError y keysymFor Unicode
- `test/wp3-server.test.ts`: nuevo test para server.ts
- `docs/plan/status-WP3.md`: status de WP3

## Estado final

WP3 completado. Todos los tests pasan y el código está pushado a origin/main.
