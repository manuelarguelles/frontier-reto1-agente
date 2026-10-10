# WP2: Harness y evaluación - Status

## Resumen

Implementación del paquete WP2 completada. Se ha creado un harness de pruebas que ejecuta E1-E5 contra el agente, reporta resultados en JSON y Markdown, y se han añadido pruebas unitarias para validación de parseo/validación.

## Archivos modificados/creados

### Nuevos archivos
- `scripts/suite.mjs`: Harness principal que ejecuta pruebas E1-E5 con lock de escritorio, reporta JSON/Markdown
- `test/wp2.test.ts`: 15 pruebas unitarias para validación de acciones y parseo JSON

### Modificados
- `src/agent.ts`:
  - Exportado `parseJson` para testing
  - Mejorada `validateAction` con mensajes de error detallados
  - Soporte para scroll sin coordenadas (default 0,0)
  - Validación más estricta de campos obligatorios

## Verificación

### Pruebas unitarias (WP2)
```
$ node --test test/wp2.test.ts test/unit.test.ts test/api.test.ts
✔ 21 tests pass
```

Incluye:
- validateAction con acciones válidas/inválidas
- validateAction coordenadas límite y fuera de rango
- validateAction validación de texto/tecla/resumen
- parseJson con markdown, simple y anidado
- redact múltiples secretos y casos borde

### Script suite.mjs
- Verificado sintaxis: `node --check scripts/suite.mjs` ✓
- Uso: `node scripts/suite.mjs [agente=http://localhost:8099]`
- Reporta:
  - `docs/validation/results-latest.json`
  - `docs/validation/results-<timestamp>.md`

## Próximos pasos (WP3 pendiente)
- Ejecutar suite completa contra agente desplegado
- Integrar con CI/CD para validación automática
- Medir coste real por tarea (placeholder actual)

## Notas
- Los cambios en `src/rfb.ts` y `src/server.ts` son de WP3 (no incluidos en este commit)
- El archivo `scripts/with-desktop-lock.sh` se usa automáticamente por suite.mjs
