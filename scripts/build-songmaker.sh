#!/usr/bin/env bash
#
# Build the songmaker Haskell CLI and install it into bin/songmaker-cli,
# the path the PDF pipeline (src/lib/server/songbookPdf.ts) invokes.
#
# Usage: bash scripts/build-songmaker.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SONGMAKER_DIR="$REPO_ROOT/songmaker"
DEST="$REPO_ROOT/bin/songmaker-cli"

if ! command -v cabal >/dev/null 2>&1; then
  echo "error: cabal not found on PATH" >&2
  exit 1
fi

echo "Building songmaker-cli (cabal build) ..."
cd "$SONGMAKER_DIR"
cabal build songmaker-cli

BIN_PATH="$(cabal list-bin songmaker-cli)"
if [[ ! -x "$BIN_PATH" ]]; then
  echo "error: built binary not found at '$BIN_PATH'" >&2
  exit 1
fi

mkdir -p "$REPO_ROOT/bin"
cp -f "$BIN_PATH" "$DEST"
chmod +x "$DEST"
echo "Installed: $DEST"
"$DEST" --help >/dev/null 2>&1 && echo "Smoke check OK" || echo "warning: --help smoke check failed"
