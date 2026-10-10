#!/usr/bin/env bash
# Exclusión mutua para el escritorio de práctica (uno solo, compartido): uso `scripts/with-desktop-lock.sh <comando...>`
L=/tmp/frontier-desktop.lock
until mkdir "$L" 2>/dev/null; do sleep 3; done
trap 'rmdir "$L"' EXIT
"$@"
