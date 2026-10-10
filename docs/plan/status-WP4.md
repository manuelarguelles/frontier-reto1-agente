# WP4 — Visor en vivo local

## Implementación

### Archivos nuevos/modified

| Archivo | Descripción |
|---------|-------------|
| `src/trace.ts` | Almacenamiento en memoria por tarea (últimos 50 pasos), tronca PNG a 80 KB, hook para runAgent |
| `src/server.ts` | Rutas `/live`, `/live/tasks`, `/tasks/{id}/trace`, `/live/stream` (SSE) solo cuando `LIVE_VIEW=1` |
| `public/live.html` | Interfaz visual simple: última captura, línea de tiempo, estado de tarea, comparación de modelo/coste |
| `test/wp4-trace.test.ts` | Tests unitarios para trace.ts (10 tests, todos pasan) |
| `test/wp4-server.test.ts` | Tests para rutas y verificación de código (8 tests, todos pasan) |

### Características implementadas

1. **Trace storage (`src/trace.ts`)**
   - Almacena hasta 50 pasos por tarea en memoria
   - Truncado automático de PNG a 80 KB (último recurso)
   - Hook `onStepHook` integrado con `runAgent`
   - Función `clearTraces()` solo para tests

2. **Rutas del servidor (`src/server.ts`)**
   - `/live`: HTML estático (404 sin LIVE_VIEW)
   - `/live/tasks`: Lista de tareas activas con estado
   - `/tasks/{id}/trace`: Detalle completo de traza
   - `/live/stream`: SSE (EventSource) para actualizaciones en tiempo real

3. **Viewer (`public/live.html`)**
   - CSS autónomo sin dependencias externas
   - Última captura visible
   - Línea de tiempo con pasos (observación, plan, acción, coste, tiempo)
   - Estado de tarea (running/done/failed)
   - Actualización automática cada 500 ms vía SSE

### Política de activación

- `LIVE_VIEW=1`: Habilita rutas y almacenamiento
- `LIVE_VIEW != 1`: Todas las rutas 404, no se guarda nada (producción)

### Tests ejecutados

```bash
$ npm test
✔ 133 tests, 0 fail
```

Tests específicos de WP4:
- `test/wp4-trace.test.ts`: 10 tests (trace storage, límites, truncado)
- `test/wp4-server.test.ts`: 8 tests (rutas, HTML, integración)

### Evidencia de verificación

- ✅ `npm test` pasa (133/133 tests)
- ✅ `node -c src/trace.ts` — no hay errores de sintaxis
- ✅ `node -c src/server.ts` — no hay errores de sintaxis
- ✅ HTML size: 13,773 bytes (carga rápida)
- ✅ `git commit` con mensajes en inglés sin atribución a IA
- ✅ `git pull --rebase` exitoso
- ✅ `git push origin main` exitoso

### Pendiente

- [ ] Validar en portal con escritorio real (requiere `LIVE_VIEW=1` y credenciales)
- [ ] Verificar SSE en navegadores (Chrome, Firefox, Safari)
- [ ] Documentar `LIVE_VIEW=1` en README.md o docs
- [ ] Configurar Railway para habilitar LIVE_VIEW en staging

### Comandos útiles

```bash
# Activar visor en desarrollo
LIVE_VIEW=1 npm start

# Ver rutas disponibles
curl -s -H "Authorization: Bearer $TEAM_TOKEN" http://localhost:8080/live/tasks | jq

# Ver traza específica
curl -s -H "Authorization: Bearer $TEAM_TOKEN" http://localhost:8080/tasks/{task_id}/trace | jq

# Ver HTML
curl -s http://localhost:8080/live > /tmp/live.html && open /tmp/live.html
```

### Registros de ejecución

- Commit: `1059299` — "WP4: implement live viewer with SSE and trace storage"
- Creado: 2026-10-10 (sistema Frontier Hackathon 2026)
- Paquete: WP4 (doc/plan/implementation-plan.md)
- Author: Codex (AI coding agent)
