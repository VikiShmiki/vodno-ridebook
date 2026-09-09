#!/usr/bin/env python3
"""Render a Markdown document to a print-ready HTML file.

Used by scripts/build-elaborat.sh to produce docs/elaborat.pdf. Kept minimal
and dependency-light: only the `markdown` package is required.
"""

import sys
from pathlib import Path

import markdown

CSS = """
@page { size: A4; margin: 14mm 15mm; }
* { box-sizing: border-box; }
body {
  font-family: "DejaVu Sans", "Segoe UI", system-ui, sans-serif;
  font-size: 9.5pt; line-height: 1.33; color: #1a1d23; margin: 0;
}
h1 { font-size: 17.5pt; margin: 0 0 .25em; letter-spacing: -.01em; }
h2 { font-size: 12.5pt; margin: 1.1em 0 .35em; padding-bottom: .18em;
     border-bottom: 1.5px solid #d8dce3; page-break-after: avoid; }
h3 { font-size: 10.5pt; margin: .85em 0 .25em; page-break-after: avoid; }
p, li { orphans: 3; widows: 3; }
code, pre { font-family: "DejaVu Sans Mono", ui-monospace, monospace; }
code { font-size: 8.6pt; background: #f1f3f6; padding: .08em .3em; border-radius: 3px; }
pre { background: #f7f8fa; border: 1px solid #e2e6ec; border-radius: 5px;
      padding: .45em .6em; margin: .55em 0; overflow: hidden; page-break-inside: avoid; }
pre code { background: none; padding: 0; font-size: 7.3pt; line-height: 1.26; white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: .7em 0;
        font-size: 8.4pt; page-break-inside: avoid; }
th, td { border: 1px solid #d8dce3; padding: .22em .45em; text-align: left; vertical-align: top; }
th { background: #f1f3f6; font-weight: 600; }
blockquote { margin: .8em 0; padding: .5em .85em; border-left: 3px solid #ff7a29;
             background: #fff8f3; page-break-inside: avoid; }
blockquote p { margin: .2em 0; }
img { max-width: 68%; border: 1px solid #d8dce3; border-radius: 5px;
      page-break-inside: avoid; display: block; margin: .5em auto; }
em { color: #55606f; }
hr { border: none; border-top: 1px solid #e2e6ec; margin: 1em 0; }
ul, ol { padding-left: 1.3em; margin: .5em 0; }
a { color: #0b5fbf; text-decoration: none; }
"""


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: md_to_html.py <input.md> <output.html>", file=sys.stderr)
        return 2

    source, target = Path(sys.argv[1]), Path(sys.argv[2])
    body = markdown.markdown(
        source.read_text(encoding="utf-8"),
        extensions=["tables", "fenced_code", "toc", "sane_lists", "attr_list"],
    )
    target.write_text(
        "<!doctype html>\n"
        f'<html lang="en"><head><meta charset="utf-8">'
        f"<title>{source.stem}</title><style>{CSS}</style></head>"
        f"<body>{body}</body></html>",
        encoding="utf-8",
    )
    print(f"Wrote {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
