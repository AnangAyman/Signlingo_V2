#!/usr/bin/env python3
"""Convert AI Hub Korean sign keypoint JSON into a 126-dim hand vector dataset.

Expected manifest formats:
- JSONL: {"label": "...", "keypoint_path": "path/to/file.json"}
- CSV: columns label,keypoint_path

AI Hub keypoint JSON is expected to include:
- hand_left_keypoints_2d
- hand_right_keypoints_2d

Each hand array is interpreted as repeating [x, y, confidence].
The current Django inference path uses [x, y, z], so this draft adapter
fills z with either 0.0 or the confidence value based on --z-mode.
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np


EXPECTED_HAND_POINTS = 21
FEATURE_SIZE = 126


@dataclass
class Sample:
    label: str
    keypoint_path: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path, help="CSV or JSONL manifest with label and keypoint_path.")
    parser.add_argument("--output", required=True, type=Path, help="Output .npz file path.")
    parser.add_argument(
        "--label-map-output",
        type=Path,
        help="Optional JSON file for the generated label map.",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path("."),
        help="Base directory used to resolve relative keypoint paths.",
    )
    parser.add_argument(
        "--z-mode",
        choices=("zero", "confidence"),
        default="zero",
        help="How to fill the z channel when adapting AI Hub 2D keypoints to the current xyz input format.",
    )
    parser.add_argument(
        "--allowed-labels",
        type=Path,
        help="Optional text file with one allowed label per line. Useful for fingerspelling-only subsets.",
    )
    return parser.parse_args()


def load_manifest(path: Path, root: Path) -> list[Sample]:
    if path.suffix.lower() == ".jsonl":
        return load_manifest_jsonl(path, root)
    if path.suffix.lower() == ".csv":
        return load_manifest_csv(path, root)
    raise ValueError(f"Unsupported manifest format: {path}")


def load_manifest_jsonl(path: Path, root: Path) -> list[Sample]:
    samples: list[Sample] = []
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            samples.append(
                Sample(
                    label=str(payload["label"]).strip(),
                    keypoint_path=resolve_path(root, payload["keypoint_path"]),
                )
            )
    return samples


def load_manifest_csv(path: Path, root: Path) -> list[Sample]:
    samples: list[Sample] = []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            samples.append(
                Sample(
                    label=str(row["label"]).strip(),
                    keypoint_path=resolve_path(root, row["keypoint_path"]),
                )
            )
    return samples


def resolve_path(root: Path, raw_path: str) -> Path:
    path = Path(raw_path)
    return path if path.is_absolute() else (root / path)


def parse_hand(points: Iterable[float], z_mode: str) -> np.ndarray:
    values = list(points)
    expected_values = EXPECTED_HAND_POINTS * 3
    if len(values) != expected_values:
        raise ValueError(f"Expected {expected_values} values for one hand, got {len(values)}")

    rows = []
    for index in range(0, len(values), 3):
        x, y, confidence = values[index : index + 3]
        z_value = 0.0 if z_mode == "zero" else float(confidence)
        rows.append([float(x), float(y), z_value])
    return np.asarray(rows, dtype=np.float32)


def normalize_hand(points: np.ndarray) -> np.ndarray:
    wrist = points[0].copy()
    points = points - wrist
    scale = np.linalg.norm(points[9])
    if scale > 0:
        points = points / scale
    return points


def load_feature_vector(path: Path, z_mode: str) -> np.ndarray:
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)

    left = parse_hand(payload["hand_left_keypoints_2d"], z_mode)
    right = parse_hand(payload["hand_right_keypoints_2d"], z_mode)
    left = normalize_hand(left)
    right = normalize_hand(right)
    vector = np.concatenate([left.flatten(), right.flatten()]).astype(np.float32)
    if vector.shape[0] != FEATURE_SIZE:
        raise ValueError(f"Expected feature length {FEATURE_SIZE}, got {vector.shape[0]}")
    return vector


def build_label_map(labels: list[str]) -> dict[str, int]:
    return {label: index for index, label in enumerate(sorted(set(labels)))}


def load_allowed_labels(path: Path | None) -> set[str]:
    if path is None:
        return set()
    with path.open(encoding="utf-8") as handle:
        return {line.strip() for line in handle if line.strip()}


def main() -> None:
    args = parse_args()
    samples = load_manifest(args.manifest, args.root)
    allowed_labels = load_allowed_labels(args.allowed_labels)
    if allowed_labels:
        samples = [sample for sample in samples if sample.label in allowed_labels]
    if not samples:
        raise ValueError("Manifest did not contain any samples")

    label_map = build_label_map([sample.label for sample in samples])
    features = []
    labels = []
    paths = []

    for sample in samples:
        features.append(load_feature_vector(sample.keypoint_path, args.z_mode))
        labels.append(label_map[sample.label])
        paths.append(str(sample.keypoint_path))

    x = np.asarray(features, dtype=np.float32)
    y = np.asarray(labels, dtype=np.int64)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    np.savez(
        args.output,
        X=x,
        y=y,
        labels=np.asarray([sample.label for sample in samples], dtype=object),
        paths=np.asarray(paths, dtype=object),
    )

    if args.label_map_output:
        args.label_map_output.parent.mkdir(parents=True, exist_ok=True)
        with args.label_map_output.open("w", encoding="utf-8") as handle:
            json.dump(label_map, handle, ensure_ascii=True, indent=2, sort_keys=True)

    print(f"Wrote {len(samples)} samples to {args.output}")


if __name__ == "__main__":
    main()
