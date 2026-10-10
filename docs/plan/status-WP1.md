# WP1 Status — Loop robusto (`src/agent.ts`, `src/models.ts`)

## Hecho

1. **`src/models.ts` creado** – módulo nuevo con `makeSession(log, fetchFn?)` que expone
   roles `actor | localizador | verificador`, selección de modelo por env var, fallback
   automático tras 2 fallos consecutivos, tope `TASK_COST_CAP_USD` (default $0.60), coste
   acumulado en `tracker.totalCostUsd / calls`, 1 reintento por llamada, timeout derivado
   del deadline monotónico.

2. **`src/agent.ts` refactorizado** – `callModel` eliminada; el loop usa
   `session.call("actor", [sysMsg, ...messages], signal, deadlineMs)`.  Coste total visible
   en cada paso del log.  `const MODEL` eliminada; el modelo se configura desde `models.ts`.

3. **Acción `zoom`** añadida al SYSTEM prompt y a `TIPOS`.  `validateAction` la valida
   (recorte dentro de pantalla, `w/h > 0`, `scale >= 1`, `buscar` no vacío).
   `cropToScreen({x,y,w,h,scale}, lx, ly)` convierte coordenadas del localizador a pantalla.
   En el switch: llama a `session.call("localizador", ...)`, convierte coordenadas y clica.

4. **Verificación previa a `done`** – antes de aceptar `done`, el verificador recibe captura
   fresca + resumen propuesto; si responde `{ok: false}` el loop continúa con feedback
   (máx. 2 rechazos para evitar bucle infinito); errores del verificador no bloquean.

5. **Tests WP1** – `test/wp1.test.ts` (18 tests, todos pasan):
   - `makeSession`: tracker cero, `TASK_COST_CAP_USD`, acumulación, sin usage, retry,
     tope, roles distintos, fallback tras 2 fallos.
   - `validateAction zoom`: acepta válido, rechaza borde excedido, `w/h=0`, buscar vacío,
     scale < 1.
   - `cropToScreen`: conversión correcta, scale=1, redondeo.

## Verificado

```
npm test   # 87 tests, 0 fail
git push   # pushed a main (fec1987)
```

- Fallos preexistentes de WP3 (keysymFor emoji en rfb.ts): 0 en esta corrida — resueltos
  por WP3 antes del merge.  Si reaparecen son responsabilidad de WP3 (rfb.ts no es mío).

## Pendiente

- El localizador en producción usa `google/gemini-flash-1.5`; no se ha probado contra el
  escritorio real (requiere `scripts/with-desktop-lock.sh` y `private/desktop.env`).
- Comparación de modelos (Gemini vs Haiku como localizador) pendiente de corrida de suite.
- El verificador añade latencia; si el escenario E1–E5 penaliza tiempo, puede desactivarse
  con `VERIFIER_MODEL=none` (no implementado; hacerlo si hay regresión de tiempo).
