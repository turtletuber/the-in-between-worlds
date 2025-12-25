#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN=${PYTHON_BIN:-/opt/homebrew/bin/python3.11}
ENV_DIR=${1:-.venv}

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "[setup_venv] Python interpreter not found: $PYTHON_BIN" >&2
  echo "Set PYTHON_BIN to your desired Python 3.11+ binary and re-run." >&2
  exit 1
fi

if [ -d "$ENV_DIR" ]; then
  echo "[setup_venv] Reusing existing virtual environment at $ENV_DIR"
else
  echo "[setup_venv] Creating virtual environment at $ENV_DIR using $PYTHON_BIN"
  "$PYTHON_BIN" -m venv "$ENV_DIR"
fi

source "$ENV_DIR/bin/activate"

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt

echo "[setup_venv] Environment ready. Activate it with: source $ENV_DIR/bin/activate"
