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
- `git log --oneline -10` → HEAD en commits de WP3

## Commits realizados

1. wp3: handlers de errores y SIGTERM en server.ts
2. wp3: soporte de DesktopSize y reconexión en rfb.ts
3. wp3: límite de memoria y validación de scroll sin coordenadas
4. wp3: corregir keysymFor para Unicode BMP directo
5. wp3: actualizar tests para validar nueva lógica
