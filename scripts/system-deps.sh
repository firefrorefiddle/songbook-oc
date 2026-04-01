#!/bin/bash
set -e

echo "=== Installing Node.js 20.x ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Checking Node.js version ==="
node --version

echo "=== Installing system dependencies for PDF generation ==="
sudo apt-get update
sudo apt-get install -y \
  texlive-latex-base \
  texlive-latex-extra \
  texlive-lang-german \
  texlive-pictures \
  texlive-fonts-extra

echo "=== Checking pdflatex ==="
pdflatex --version | head -1

echo "=== Checking songmaker-cli ==="
if command -v songmaker-cli &> /dev/null; then
  songmaker-cli --version 2>/dev/null || echo "songmaker-cli found (no --version flag)"
else
  echo "WARNING: songmaker-cli not found. Install to /usr/local/bin/songmaker-cli"
fi

echo "=== System setup complete ==="
