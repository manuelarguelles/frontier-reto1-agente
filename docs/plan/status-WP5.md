# WP5 Status — Speed optimizations

## What was done

1. **Multi-action batching** (`extractActions`, `src/agent.ts`): the model can now return
   `"acciones": [{...}, ...]` (max 4) instead of `"accion": {...}`. Legacy single-action
   format keeps full backward compatibility (`accion` takes precedence if both are present).
   Batch validation rejects `done`/`fail` inside a list; all actions are validated before
   any is executed. The batch loop (`batchLoop`) aborts early if a page-changing action
   (click, scroll, nav key) causes a detectable frame change, protecting against typing
   into the wrong dialog.

2. **Adaptive settle** (`adaptiveSettleParams`, `isNavKey`): after `type`, `replace_text`,
   or a non-navigation `key` (Backspace, Ctrl+A, arrows…) the settle wait is reduced from
   1000 ms → 200 ms min. After `click`/`scroll`/nav keys (Enter, Tab, Escape) the full
   1000 ms wait is preserved. Expected saving: ~800 ms per text-input action, ~25% of
   average step time.

3. **SLIM_IMAGES=1** (`src/agent.ts`): env var reduces image history from 2 frames to 1,
   cutting per-step input-token cost by ~half the image payload when active.

4. **System prompt update** (`SYSTEM_FULL`): added the `acciones` batch format section so
   the model knows it can use it; removed the now-redundant `"estado"` key from the single-
   action template.

5. **26 unit tests** (`test/wp5.test.ts`): cover `extractActions` (6 cases), `isNavKey`
   (8 cases), `adaptiveSettleParams` (10 cases), and `validateAction` batch compatibility
   (2 cases). No network or VNC desktop required.

## Verified (commands and real results)

```
$ npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
ℹ tests 135
ℹ pass 135
ℹ fail 0
```

- Baseline (before WP5): 89 committed tests, all pass.
- After WP5: 135 tests (89 original + 26 WP5 + 20 WP4 token tests), 0 failures.
- `node --test test/wp5.test.ts` → 26/26 pass.
- `git push` succeeded: HEAD is `d576a18`, remote confirmed.

## Note on implementation landing

Due to concurrent work on the shared branch, `src/agent.ts` changes were staged twice.
The final state was committed in `189e6a1` (WP4 agent included the working-tree changes);
`test/wp5.test.ts` was committed separately in `d576a18` after it was removed in `a157e1d`.
Both commits are now on `origin/main`.

## Pending / out of scope

- Bench measurement (steps/time before vs. after): requires running `scripts/suite.mjs`
  against the live SIGECOM desktop with `scripts/with-desktop-lock.sh`; deferred to
  post-12:00 execution window.
- Validating that E1–E5 still pass end-to-end with the batch prompt: needs desktop access
  (lock contended by other WPs during design phase).
- The `SLIM_IMAGES=1` and batch flags are off by default; enable after validating E1–E5
  with the new prompt to avoid regression.
