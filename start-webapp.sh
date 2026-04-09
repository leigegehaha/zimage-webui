#!/bin/zsh
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -x "$BASE_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="${PYTHON_BIN:-$BASE_DIR/.venv/bin/python}"
else
  PYTHON_BIN="${PYTHON_BIN:-python3}"
fi

cd "$BASE_DIR"
exec "$PYTHON_BIN" "$BASE_DIR/app/server.py"
