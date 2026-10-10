# WP1 Status — Loop robusto (`src/agent.ts`, `src/models.ts`)

## Hecho

1. **`src/models.ts` creado** (commit `8e7843d`) — módulo nuevo con `makeSession(log, fetchFn?)` que expone
   roles `actor | localizador | verificador`, selección de modelo por env var, fallback
   automático tras 2 fallos consecutivos, tope `TASK_COST_CAP_USD` (default $0.60), coste
   acumulado en `tracker.totalCostUsd / calls`, 1 reintento por llamada (300 ms de espera),
   timeout derivado del deadline monotónico de la tarea.

2. **`src/agent.ts` refactorizado** (commit `fec1987`) — `callModel` eliminada (era inline,
   sin fallback ni coste); el loop crea `session = makeSession(o.log)` y llama
   `session.call("actor", [sysMsg, ...messages], signal, deadlineMs)`.
   Coste acumulado visible en cada paso del log.

3. **Acción `zoom`** añadida al SYSTEM prompt y a `TIPOS`. `validateAction` valida
   (recorte dentro de pantalla, `w/h > 0`, `scale >= 1`, `buscar` no vacío).
   `cropToScreen({x,y,w,h,scale}, lx, ly)` convierte coords del localizador a pantalla.
   En el switch del loop: llama `session.call("localizador", ...)`, convierte y clica.

4. **Verificación previa a `done`** — antes de aceptar `done`, el verificador recibe
   captura fresca + resumen propuesto; si responde `{ok: false}` el loop continúa con
   feedback (máx. 2 rechazos para evitar bucle); errores del verificador no bloquean.

5. **Anti-bucle / modales** — sistema prompt actualizado advierte del uso de `zoom` para
   controles pequeños y el aviso `noProgress >= 2` guía al modelo a cambiar estrategia.
   `doneAttempts` impide bucle infinito en la verificación.

6. **Resumen de preguntas** — regla 7 del SYSTEM prompt ya garantizaba `respuesta: <valor>`;
   sin cambio de código adicional.

## Tests

| Archivo | Tests | Estado |
|---|---|---|
| `test/models.test.ts` | 11 | ✅ todos pasan |
| `test/wp1.test.ts` | 18 | ✅ todos pasan |
| `test/unit.test.ts`, `test/api.test.ts`, etc. | 58 (suites anteriores) | ✅ sin regresión |
| **TOTAL** | **87** | **✅ 87/87** |

## Verificado — comandos y resultados reales

```
$ npm test
ℹ tests 87
ℹ pass  87
ℹ fail  0
ℹ duration_ms 1417.613375

$ git log --oneline -3
cb26603 docs(WP1): add status-WP1.md
fec1987 feat(WP1): agent uses ModelSession - zoom, verify-before-done, cost tracking
8e7843d feat(WP1): add models.ts - role-based model sessions with cost tracking and fallback

$ git status
On branch main / nothing to commit, working tree clean / up to date with origin/main
```

Commits en main y en origin: `8e7843d`, `fec1987`, `cb26603`.

## Pendiente / fuera de alcance WP1

- El localizador usa `google/gemini-flash-1.5` en producción; comparación con Haiku pendiente.
- Prueba contra escritorio real (requiere `scripts/with-desktop-lock.sh` + `private/desktop.env`).
- Opción `VERIFIER_MODEL=none` para deshabilitar verificador si la latencia extra penaliza tiempo.
