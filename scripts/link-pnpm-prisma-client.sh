#!/usr/bin/env bash
# pnpm installs @prisma/client under .pnpm/ with its own nested .prisma/client that can stay stale.
# After `prisma generate`, the real client lives at repo node_modules/.prisma/client — symlink it into the pnpm package.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/node_modules/.prisma"
PKG_DIR=$(find "$ROOT/node_modules/.pnpm" -maxdepth 1 -name '@prisma+client@*' -print -quit 2>/dev/null || true)
if [[ -z "${PKG_DIR:-}" ]] || [[ ! -d "$PKG_DIR/node_modules" ]]; then
  exit 0
fi
NESTED="$PKG_DIR/node_modules"
if [[ ! -d "$NESTED" ]]; then
  exit 0
fi
if [[ -L "$NESTED/.prisma" ]]; then
  rm -f "$NESTED/.prisma"
elif [[ -d "$NESTED/.prisma" ]]; then
  rm -rf "$NESTED/.prisma"
fi
if [[ -d "$TARGET" ]]; then
  ln -s "../../../.prisma" "$NESTED/.prisma"
fi
