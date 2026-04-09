#!/bin/zsh
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
MODEL_ID="${MODEL_ID:-carsenk/z-image-turbo-mflux-8bit}"
HF_HOME_DIR="${HF_HOME:-$BASE_DIR/hf-cache}"
HF_HUB_CACHE_DIR="${HF_HUB_CACHE:-$BASE_DIR/hf-cache/hub}"

if [[ -x "$BASE_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="${PYTHON_BIN:-$BASE_DIR/.venv/bin/python}"
else
  PYTHON_BIN="${PYTHON_BIN:-python3}"
fi

mkdir -p "$HF_HOME_DIR" "$HF_HUB_CACHE_DIR"

export HF_HOME="$HF_HOME_DIR"
export HF_HUB_CACHE="$HF_HUB_CACHE_DIR"
export MODEL_ID

"$PYTHON_BIN" - <<'PY'
from huggingface_hub import snapshot_download
import os

model_id = os.environ.get("MODEL_ID", "carsenk/z-image-turbo-mflux-8bit")
cache_dir = os.environ["HF_HUB_CACHE"]

path = snapshot_download(
    repo_id=model_id,
    cache_dir=cache_dir,
    resume_download=True,
)
print(f"MODEL_READY: {path}")
PY
