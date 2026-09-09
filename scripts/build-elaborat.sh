#!/usr/bin/env bash
# Compiles docs/elaborat.tex to docs/elaborat.pdf.
#
#   ./scripts/build-elaborat.sh
#
# XeLaTeX is required rather than pdfLaTeX: the architecture diagrams use
# Unicode box-drawing characters, which need a Unicode engine and a monospace
# font that carries those glyphs (DejaVu Sans Mono).
#
# Debian/Ubuntu:
#   sudo apt install texlive-xetex texlive-latex-extra fonts-dejavu
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS="${ROOT}/docs"

command -v xelatex >/dev/null || {
  echo "xelatex not found. On Debian/Ubuntu:"
  echo "  sudo apt install texlive-xetex texlive-latex-extra fonts-dejavu"
  exit 1
}

# Build in a scratch directory so the aux files never land in docs/.
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT

echo "==> Compiling elaborat.tex with XeLaTeX"
# Two passes so the page count in the footer and any references settle.
for pass in 1 2; do
  TEXINPUTS="${DOCS}:" xelatex -interaction=nonstopmode -halt-on-error \
          -output-directory="$BUILD" \
          -jobname=elaborat \
          "${DOCS}/elaborat.tex" > "${BUILD}/pass${pass}.log" 2>&1 || {
    echo "XeLaTeX failed on pass ${pass}:"
    grep -A4 -m3 '^!' "${BUILD}/pass${pass}.log" || tail -30 "${BUILD}/pass${pass}.log"
    exit 1
  }
done

cp "${BUILD}/elaborat.pdf" "${DOCS}/elaborat.pdf"

if command -v pdfinfo >/dev/null; then
  pages=$(pdfinfo "${DOCS}/elaborat.pdf" | awk '/^Pages:/ {print $2}')
  echo "Wrote ${DOCS}/elaborat.pdf (${pages} pages)"
  if [[ "$pages" -lt 3 || "$pages" -gt 10 ]]; then
    echo "WARNING: the brief asks for 3-10 pages, this is ${pages}."
  fi
else
  echo "Wrote ${DOCS}/elaborat.pdf"
fi
