#!/usr/bin/env bash
# Copy a production SQLite snapshot into the local dev database, then apply
# pending Prisma migrations so the dev schema matches the repository.
#
# Defaults (override with env vars):
#   SYNC_PROD_SOURCE  — path to prod DB (default: prisma/prod.db under repo root)
#   SYNC_PROD_DEST    — path to dev DB (default: dev.db under repo root)
#
# Example:
#   pnpm db:sync-from-prod
#   SYNC_PROD_SOURCE=/path/to/downloaded.db pnpm db:sync-from-prod

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE="${SYNC_PROD_SOURCE:-$PROJECT_ROOT/prisma/prod.db}"
DEST="${SYNC_PROD_DEST:-$PROJECT_ROOT/dev.db}"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "error: sqlite3 is required (install sqlite3 CLI)." >&2
  exit 1
fi

if [ ! -f "$SOURCE" ]; then
  echo "error: source database not found: $SOURCE" >&2
  echo "Set SYNC_PROD_SOURCE or place a prod snapshot at prisma/prod.db." >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"

echo "Backing up (SQLite .backup):"
echo "  from: $SOURCE"
echo "  to:   $DEST"

# Transactionally consistent copy; avoids copying a half-written WAL file.
sqlite3 "$SOURCE" ".backup '$DEST'"

# Absolute file: URL so resolution does not depend on cwd or schema-relative rules.
DATABASE_URL="file:${DEST}"
export DATABASE_URL

echo "Applying migrations: DATABASE_URL=$DATABASE_URL pnpm prisma migrate deploy"
(cd "$PROJECT_ROOT" && pnpm prisma migrate deploy)

echo "Done. Dev database is at: $DEST"
