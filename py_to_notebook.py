"""Convert a plain .py script into a Jupyter .ipynb, splitting into cells at
section-header comments so each section's outputs are saved when you run it.

No jupytext needed — uses nbformat (already installed). A cell boundary is
started at any banner/section-header comment line (e.g. `# ====`, `# ── Title ──`)
*once the current cell already contains real code*, so a boxed
`# ====\n# Title\n# ====` header stays glued to the code beneath it.

    python py_to_notebook.py quantization.py latency.py ...
"""
import re
import sys
from pathlib import Path

import nbformat

# `# ` followed by 2+ box/rule chars (=, -, em dash, or ─-family) = section header
BANNER = re.compile(r"^#\s*[=\-─-╿—]{2,}")


def _is_header(line: str) -> bool:
    return bool(BANNER.match(line))


def _is_code(line: str) -> bool:
    s = line.strip()
    return bool(s) and not s.startswith("#")


def split_cells(src: str):
    cells, cur, cur_has_code = [], [], False
    for line in src.splitlines():
        if _is_header(line) and cur_has_code:
            cells.append(cur)
            cur, cur_has_code = [], False
        cur.append(line)
        if _is_code(line):
            cur_has_code = True
    if cur:
        cells.append(cur)

    out = []
    for c in cells:
        while c and not c[0].strip():
            c.pop(0)
        while c and not c[-1].strip():
            c.pop()
        if c:
            out.append("\n".join(c))
    return out


def convert(py_path, out_path=None, header_md=None):
    src = Path(py_path).read_text(encoding="utf-8")
    nb = nbformat.v4.new_notebook()
    nb.cells = []
    if header_md:
        nb.cells.append(nbformat.v4.new_markdown_cell(header_md))
    for block in split_cells(src):
        nb.cells.append(nbformat.v4.new_code_cell(block))
    out = Path(out_path) if out_path else Path(py_path).with_suffix(".ipynb")
    nbformat.write(nb, out)
    return out


if __name__ == "__main__":
    # self-check: boxed header glues to its code; a later rule splits
    sample = "import x\n# ====\n# title\n# ====\ncode()\n# ----\nmore()"
    assert split_cells(sample) == [
        "import x",
        "# ====\n# title\n# ====\ncode()",
        "# ----\nmore()",
    ], split_cells(sample)

    for arg in sys.argv[1:]:
        print(f"  {arg}  ->  {convert(arg)}")
    if len(sys.argv) == 1:
        print("self-check passed; pass .py files to convert")
