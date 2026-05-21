#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "django_port" / "signlingo_django" / "translations"
BASE = ROOT / "en"


def load_language_files(language_dir: Path) -> dict[str, set[str]]:
    data: dict[str, set[str]] = {}
    for path in sorted(language_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            payload = json.load(handle)
        if not isinstance(payload, dict):
            raise ValueError(f"{path} must contain a flat JSON object")
        data[path.name] = {str(key) for key in payload.keys()}
    return data


def main() -> int:
    base_files = load_language_files(BASE)
    has_errors = False

    for language_dir in sorted(path for path in ROOT.iterdir() if path.is_dir() and path.name != "en"):
        current_files = load_language_files(language_dir)
        print(f"[{language_dir.name}]")
        for filename, base_keys in base_files.items():
            current_keys = current_files.get(filename, set())
            missing = sorted(base_keys - current_keys)
            extra = sorted(current_keys - base_keys)
            if missing:
                has_errors = True
                print(f"  missing in {filename}: {', '.join(missing)}")
            if extra:
                print(f"  extra in {filename}: {', '.join(extra)}")
        missing_files = sorted(set(base_files) - set(current_files))
        if missing_files:
            has_errors = True
            print(f"  missing files: {', '.join(missing_files)}")

    if has_errors:
        return 1
    print("All translation keys are aligned with English base files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
