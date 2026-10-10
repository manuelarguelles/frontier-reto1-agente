#!/usr/bin/env bash
# Exclusión mutua para el escritorio de práctica (uno solo, compartido): uso `scripts/with-desktop-lock.sh <comando...>`
L=/tmp/frontier-desktop.lock
until mkdir "$L" 2>/dev/null; do
  # candado huérfano (>8 min sin tocar): una tarea dura <5 min
  [ -n "$(find "$L" -maxdepth 0 -mmin +8 2>/dev/null)" ] && rmdir "$L" 2>/dev/null
  sleep 3
done
trap 'rmdir "$L"' EXIT
"$@"
