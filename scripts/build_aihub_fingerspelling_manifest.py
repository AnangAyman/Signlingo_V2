#!/usr/bin/env python3
"""Filter a manifest down to fingerspelling or selected labels.

Input manifest:
- CSV with columns: label,keypoint_path
- JSONL with keys: label,keypoint_path

This tool does not assume a fixed AI Hub label taxonomy. It filters using:
- a text file of allowed labels, or
- a regex pattern.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Source CSV or JSONL manifest.")
    parser.add_argument("--output", required=True, type=Path, help="Filtered CSV or JSONL manifest.")
    parser.add_argument("--allowed-labels", type=Path, help="Optional text file with one allowed label per line.")
    parser.add_argument("--label-regex", help="Optional regex matched against the label.")
    return parser.parse_args()


def read_manifest(path: Path) -> list[dict[str, str]]:
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))
    if path.suffix.lower() == ".jsonl":
        rows = []
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows
    raise ValueError(f"Unsupported manifest format: {path}")


def write_manifest(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() == ".csv":
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["label", "keypoint_path"])
            writer.writeheader()
            writer.writerows(rows)
        return
    if path.suffix.lower() == ".jsonl":
        with path.open("w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        return
    raise ValueError(f"Unsupported manifest format: {path}")


def load_allowed_labels(path: Path | None) -> set[str]:
    if path is None:
        return set()
    with path.open(encoding="utf-8") as handle:
        return {line.strip() for line in handle if line.strip()}


def main() -> None:
    args = parse_args()
    rows = read_manifest(args.input)
    allowed = load_allowed_labels(args.allowed_labels)
    pattern = re.compile(args.label_regex) if args.label_regex else None

    def keep(row: dict[str, str]) -> bool:
        label = str(row["label"]).strip()
        if allowed and label in allowed:
            return True
        if pattern and pattern.search(label):
            return True
        return not allowed and pattern is None

    filtered = [row for row in rows if keep(row)]
    write_manifest(args.output, filtered)
    print(f"Filtered {len(filtered)} / {len(rows)} rows into {args.output}")


if __name__ == "__main__":
    main()
