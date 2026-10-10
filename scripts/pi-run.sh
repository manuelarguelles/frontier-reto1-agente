#!/usr/bin/env bash
# Uso: scripts/pi-run.sh WPn modelo thinking   — lanza pi agent con superpowers sobre un paquete del plan
cd "$(dirname "$0")/.." || exit 1
WP=$1; MODEL=$2; TH=${3:-medium}
export OPENROUTER_API_KEY="$(security find-generic-password -s frontier.lab10.ai.openrouter -a frontier-hackathon -w)"
SK=~/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/skills
exec pi -p --provider openrouter --model "$MODEL" --thinking "$TH" --no-session \
  --skill $SK/test-driven-development --skill $SK/systematic-debugging --skill $SK/verification-before-completion --skill $SK/writing-plans \
  "Eres el responsable del paquete $WP de docs/plan/implementation-plan.md en este repo (hackathon Frontier, Reto 1). Lee primero AGENTS.md, README.md, docs/plan/implementation-plan.md y el código de src/. Sigue las skills cargadas (TDD, depuración sistemática, verificación antes de declarar terminado). Implementa SOLO tu paquete, toca únicamente los archivos asignados, haz commits pequeños con 'git add <rutas>' y mensajes en inglés sin atribución a IA, y 'git pull --rebase' antes de 'git push' (solo si 'npm test' pasa). Todo comando que use el escritorio de práctica va con scripts/with-desktop-lock.sh y credenciales de private/desktop.env (nunca las imprimas ni las escribas en archivos versionados). Al terminar escribe un resumen de 10 líneas con lo hecho, lo verificado (comandos y resultados reales) y lo pendiente, en docs/plan/status-$WP.md y haz commit/push."
