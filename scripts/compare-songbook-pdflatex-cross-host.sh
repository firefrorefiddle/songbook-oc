#!/usr/bin/env bash
# Export LaTeX bundle locally, run pdflatex here, ship the same tree to SERVER, run pdflatex there,
# pull remote main.pdf back and compare checksums / sizes.
#
# Requires: SERVER (and optional SSH_USER) from .envrc; ssh/scp access; pdflatex + pdfinfo locally and on server.
# Usage: ./scripts/compare-songbook-pdflatex-cross-host.sh [songbookId]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .envrc ]]; then
  # shellcheck source=/dev/null
  source .envrc
fi

: "${SERVER:?Set SERVER (e.g. in .envrc)}"
SSH_USER="${SSH_USER:-$USER}"
SSH_OPTS="${SSH_OPTS:--o StrictHostKeyChecking=no}"
SONGBOOK_ID="${1:-}"

EXPORT_DIR="${SONGBOOK_LATEX_EXPORT_DIR:-$REPO_ROOT/tmp/songbook-latex-export}"
TARBALL_LOCAL="/tmp/songbook-latex-export.tgz"
LOCAL_PDF="/tmp/songbook-export-main.local.pdf"
REMOTE_PDF="/tmp/songbook-export-main.remote.pdf"

run_pdflatex_twice() {
  local dir="$1"
  (cd "$dir" && pdflatex -interaction=batchmode -halt-on-error -file-line-error main.tex)
  (cd "$dir" && pdflatex -interaction=batchmode -halt-on-error -file-line-error main.tex)
}

echo "=== Export LaTeX workspace ==="
if [[ -n "$SONGBOOK_ID" ]]; then
  SONGBOOK_LATEX_EXPORT_DIR="$EXPORT_DIR" pnpm exec tsx scripts/export-songbook-latex.ts "$SONGBOOK_ID"
else
  SONGBOOK_LATEX_EXPORT_DIR="$EXPORT_DIR" pnpm exec tsx scripts/export-songbook-latex.ts
fi

echo "=== Local pdflatex (two passes) ==="
run_pdflatex_twice "$EXPORT_DIR"
cp -f "$EXPORT_DIR/main.pdf" "$LOCAL_PDF"
pdflatex --version | head -1 | sed 's/^/local pdflatex: /'
pdfinfo "$LOCAL_PDF" 2>/dev/null | grep -E '^(Pages|PDF version):' || true
sha256sum "$LOCAL_PDF"

echo "=== Pack and upload ==="
tar -czf "$TARBALL_LOCAL" -C "$(dirname "$EXPORT_DIR")" "$(basename "$EXPORT_DIR")"
scp $SSH_OPTS "$TARBALL_LOCAL" "$SSH_USER@$SERVER:/tmp/songbook-latex-export.tgz"

echo "=== Remote pdflatex (two passes) ==="
ssh $SSH_OPTS "$SSH_USER@$SERVER" bash -s <<'REMOTE'
set -euo pipefail
rm -rf /tmp/songbook-latex-export
mkdir -p /tmp
tar -xzf /tmp/songbook-latex-export.tgz -C /tmp
cd /tmp/songbook-latex-export
pdflatex -interaction=batchmode -halt-on-error -file-line-error main.tex
pdflatex -interaction=batchmode -halt-on-error -file-line-error main.tex
echo "--- remote ---"
pdflatex --version | head -1
pdfinfo main.pdf 2>/dev/null | grep -E '^(Pages|PDF version):' || true
sha256sum main.pdf
cat EXPORT_MANIFEST.txt 2>/dev/null || true
REMOTE

echo "=== Fetch remote PDF ==="
scp $SSH_OPTS "$SSH_USER@$SERVER:/tmp/songbook-latex-export/main.pdf" "$REMOTE_PDF"

echo ""
echo "=== Comparison ==="
echo "local : $(sha256sum "$LOCAL_PDF")"
echo "remote: $(sha256sum "$REMOTE_PDF")"
if cmp -s "$LOCAL_PDF" "$REMOTE_PDF"; then
  echo "PDFs are BYTE-IDENTICAL."
else
  echo "PDFs DIFFER (expected when TeX Live / font maps differ between hosts)."
  ls -la "$LOCAL_PDF" "$REMOTE_PDF"
fi
