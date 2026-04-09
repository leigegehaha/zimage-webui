#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageFilter


BASE_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = BASE_DIR / "skim" / "config.json"
ASPECT_RATIOS = {
    "1:1": (1, 1),
    "4:3": (4, 3),
    "3:4": (3, 4),
    "16:9": (16, 9),
    "9:16": (9, 16),
}
RESOLUTION_BASE = {
    "1080p": 1080,
    "2k": 2048,
    "4k": 3840,
}


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff._-]+", "-", value).strip("-")
    return cleaned[:48] or "image"


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def resolve_config_path(config_path: Path, value: str | None) -> Path | None:
    if not value:
        return None
    raw = Path(value)
    if raw.is_absolute():
        return raw
    return (config_path.parent / raw).resolve()


def compute_dimensions(aspect_ratio: str, resolution: str) -> tuple[int, int]:
    if aspect_ratio not in ASPECT_RATIOS:
        raise ValueError(f"Unsupported aspect ratio: {aspect_ratio}")
    base = RESOLUTION_BASE.get(resolution.lower())
    if base is None:
        raise ValueError(f"Unsupported resolution: {resolution}")
    w_ratio, h_ratio = ASPECT_RATIOS[aspect_ratio]
    if w_ratio >= h_ratio:
        width = base
        height = round(base * h_ratio / w_ratio)
    else:
        height = base
        width = round(base * w_ratio / h_ratio)
    return width, height


def apply_gaussian_blur(paths: list[Path], radius: float) -> None:
    if radius <= 0:
        return
    for image_path in paths:
        with Image.open(image_path) as image:
            image.filter(ImageFilter.GaussianBlur(radius=radius)).save(image_path)


def build_output_paths(output_dir: Path, prompt: str, count: int, output: str | None, prefix: str | None) -> list[Path]:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    prompt_slug = slugify(prompt)
    if count == 1:
        if output:
            output_path = Path(output)
            if not output_path.is_absolute():
                output_path = output_dir / output_path
            return [output_path]
        return [output_dir / f"{timestamp}-{prompt_slug}.png"]

    name_prefix = prefix or prompt_slug
    return [output_dir / f"{name_prefix}-{timestamp}-{idx:03d}.png" for idx in range(1, count + 1)]


def run_generation(
    *,
    generator_path: Path,
    model: str,
    prompt: str,
    width: int,
    height: int,
    steps: int,
    guidance: float | None,
    seed: int | None,
    output_path: Path,
    env: dict[str, str],
) -> None:
    command = [
        str(generator_path),
        "--model",
        model,
        "--prompt",
        prompt,
        "--width",
        str(width),
        "--height",
        str(height),
        "--steps",
        str(steps),
        "--output",
        str(output_path),
    ]
    if guidance is not None:
        command.extend(["--guidance", str(guidance)])
    if seed is not None:
        command.extend(["--seed", str(seed)])

    subprocess.run(command, check=True, env=env)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate images with local Zimage model.")
    parser.add_argument("--config", default=str(CONFIG_PATH), help="Path to config json.")
    parser.add_argument("--prompt", required=True, help="Prompt text.")
    parser.add_argument("--aspect-ratio", choices=sorted(ASPECT_RATIOS.keys()), help="Aspect ratio, e.g. 1:1.")
    parser.add_argument("--resolution", help="Resolution profile: 1080p, 2k, 4k.")
    parser.add_argument("--count", type=int, help="How many images to generate.")
    parser.add_argument("--output", help="Output filename or absolute path for single image.")
    parser.add_argument("--prefix", help="Filename prefix for batch output.")
    parser.add_argument("--steps", type=int, help="Override steps.")
    parser.add_argument("--seed", type=int, help="Override seed.")
    parser.add_argument("--guidance", type=float, help="Override guidance.")
    parser.add_argument("--gaussian", type=float, help="Override gaussian blur post-process.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = Path(args.config).resolve()
    config = load_config(config_path)

    aspect_ratio = args.aspect_ratio or config.get("default_aspect_ratio") or "1:1"
    resolution = args.resolution or config.get("default_resolution") or "1080p"
    count = args.count if args.count is not None else int(config.get("default_count", 1))
    steps = args.steps if args.steps is not None else int(config.get("steps", 9))
    seed = args.seed if args.seed is not None else config.get("seed")
    guidance = args.guidance if args.guidance is not None else config.get("guidance")
    gaussian = args.gaussian if args.gaussian is not None else float(config.get("gaussian", 0.0))

    if count < 1:
        raise ValueError("count must be >= 1")

    width, height = compute_dimensions(aspect_ratio, resolution)
    output_dir = resolve_config_path(config_path, config.get("output_dir")) or (BASE_DIR / "output")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_paths = build_output_paths(output_dir, args.prompt, count, args.output, args.prefix)
    for output_path in output_paths:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    hf_home = resolve_config_path(config_path, config.get("hf_home"))
    hf_hub_cache = resolve_config_path(config_path, config.get("hf_hub_cache"))
    if hf_home:
        env["HF_HOME"] = str(hf_home)
    if hf_hub_cache:
        env["HF_HUB_CACHE"] = str(hf_hub_cache)

    prompt_text = args.prompt
    generator_path = resolve_config_path(config_path, config["generator_path"])
    if not generator_path.exists():
        print(f"Generator not found: {generator_path}", file=sys.stderr)
        return 1

    for output_path in output_paths:
        run_generation(
            generator_path=generator_path,
            model=config["model"],
            prompt=prompt_text,
            width=width,
            height=height,
            steps=steps,
            guidance=guidance,
            seed=seed,
            output_path=output_path,
            env=env,
        )

    apply_gaussian_blur(output_paths, gaussian)

    print(f"Prompt: {args.prompt}")
    print(f"Aspect ratio: {aspect_ratio}")
    print(f"Resolution: {resolution}")
    print(f"Size: {width}x{height}")
    print(f"Count: {count}")
    for output_path in output_paths:
        print(f"MEDIA: {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
