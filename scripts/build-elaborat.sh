#!/usr/bin/env bash
# Renders docs/elaborat.md to docs/elaborat.pdf.
#
#   ./scripts/build-elaborat.sh
#
# Requires: python3 with the `markdown` package, and a Chrome/Chromium binary
# (set CHROME to override auto-detection).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/docs/elaborat.md"
HTML="${ROOT}/docs/elaborat.html"
PDF="${ROOT}/docs/elaborat.pdf"

CHROME="${CHROME:-}"
if [[ -z "$CHROME" ]]; then
  for candidate in google-chrome chromium chromium-browser \
      "$HOME/.cache/ms-playwright/chromium-"*/chrome-linux64/chrome; do
    if command -v "$candidate" >/dev/null 2>&1 || [[ -x "$candidate" ]]; then
      CHROME="$candidate"; break
    fi
  done
fi
[[ -n "$CHROME" ]] || { echo "No Chrome/Chromium found; set CHROME=/path/to/chrome"; exit 1; }

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c "import markdown" >/dev/null 2>&1; then
  echo "The 'markdown' package is missing. Install it with:"
  echo "  $PYTHON -m pip install markdown"
  exit 1
fi

"$PYTHON" "${ROOT}/scripts/md_to_html.py" "$SRC" "$HTML"
"$CHROME" --headless --no-sandbox --disable-gpu \
  --no-pdf-header-footer --print-to-pdf="$PDF" "file://${HTML}" >/dev/null 2>&1

echo "Wrote $PDF"
