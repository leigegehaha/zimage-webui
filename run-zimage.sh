#!/bin/zsh
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
GENERATOR="$BASE_DIR/.venv/bin/mflux-generate-z-image-turbo"
DEFAULT_PROMPT="一只橘猫坐在木桌上，窗边自然光，写实风格"
DEFAULT_WIDTH=1024
DEFAULT_HEIGHT=1024
DEFAULT_STEPS=9
DEFAULT_COUNT=1
DEFAULT_PREFIX="image"
DEFAULT_SEED=""
DEFAULT_GUIDANCE=""
DEFAULT_GAUSSIAN=""
DEFAULT_IMAGE_PATH=""
DEFAULT_IMAGE_STRENGTH=""

if [[ ! -x "$GENERATOR" ]]; then
  echo "mflux is not installed in $BASE_DIR/.venv"
  exit 1
fi

export HF_HOME="$BASE_DIR/hf-cache"
export HF_HUB_CACHE="$BASE_DIR/hf-cache/hub"

mkdir -p "$BASE_DIR/output"

usage() {
  cat <<'EOF'
Usage:
  ./run-zimage.sh [options]
  ./run-zimage.sh "prompt text"
  ./run-zimage.sh "prompt text" output.png

Options:
  --prompt TEXT       Prompt text
  --width N           Image width, default 1024
  --height N          Image height, default 1024
  --steps N           Inference steps, default 9
  --count N           Number of images to generate, default 1
  --seed N            Seed for entropy
  --guidance N        Guidance scale
  --output PATH       Output file path, only valid when --count 1
  --prefix NAME       Output filename prefix for batch mode, default image
  --gaussian VALUE    Gaussian noise setting (accepted but not supported in CLI)
  --image-path PATH   Reference image path for image editing
  --image-strength N  Image edit strength, usually between 0 and 1
  --help              Show this help

Examples:
  ./run-zimage.sh --prompt "cinematic mountain lake"
  ./run-zimage.sh --prompt "poster design" --width 768 --height 1344 --output poster.png
  ./run-zimage.sh --prompt "orange cat" --count 4 --prefix cat
EOF
}

PROMPT="$DEFAULT_PROMPT"
WIDTH="$DEFAULT_WIDTH"
HEIGHT="$DEFAULT_HEIGHT"
STEPS="$DEFAULT_STEPS"
COUNT="$DEFAULT_COUNT"
OUTPUT=""
PREFIX="$DEFAULT_PREFIX"
SEED="$DEFAULT_SEED"
GUIDANCE="$DEFAULT_GUIDANCE"
GAUSSIAN="$DEFAULT_GAUSSIAN"
IMAGE_PATH="$DEFAULT_IMAGE_PATH"
IMAGE_STRENGTH="$DEFAULT_IMAGE_STRENGTH"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      PROMPT="${2:-}"
      shift 2
      ;;
    --width)
      WIDTH="${2:-}"
      shift 2
      ;;
    --height)
      HEIGHT="${2:-}"
      shift 2
      ;;
    --steps)
      STEPS="${2:-}"
      shift 2
      ;;
    --seed)
      SEED="${2:-}"
      shift 2
      ;;
    --guidance)
      GUIDANCE="${2:-}"
      shift 2
      ;;
    --count)
      COUNT="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT="${2:-}"
      shift 2
      ;;
    --prefix)
      PREFIX="${2:-}"
      shift 2
      ;;
    --gaussian)
      GAUSSIAN="${2:-}"
      shift 2
      ;;
    --image-path)
      IMAGE_PATH="${2:-}"
      shift 2
      ;;
    --image-strength)
      IMAGE_STRENGTH="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
    *)
      if [[ "$PROMPT" == "$DEFAULT_PROMPT" ]]; then
        PROMPT="$1"
      elif [[ -z "$OUTPUT" ]]; then
        OUTPUT="$1"
      else
        echo "Unexpected argument: $1" >&2
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

if ! [[ "$WIDTH" =~ '^[0-9]+$' ]] || ! [[ "$HEIGHT" =~ '^[0-9]+$' ]] || ! [[ "$STEPS" =~ '^[0-9]+$' ]] || ! [[ "$COUNT" =~ '^[0-9]+$' ]]; then
  echo "width, height, steps, and count must be positive integers" >&2
  exit 1
fi

if [[ -n "$SEED" ]] && ! [[ "$SEED" =~ '^[0-9]+$' ]]; then
  echo "seed must be a positive integer" >&2
  exit 1
fi

if [[ -n "$GUIDANCE" ]] && ! [[ "$GUIDANCE" =~ '^[0-9]+([.][0-9]+)?$' ]]; then
  echo "guidance must be a positive number" >&2
  exit 1
fi

if [[ -n "$IMAGE_STRENGTH" ]] && ! [[ "$IMAGE_STRENGTH" =~ '^[0-9]+([.][0-9]+)?$' ]]; then
  echo "image-strength must be a positive number" >&2
  exit 1
fi

if (( COUNT < 1 )); then
  echo "count must be at least 1" >&2
  exit 1
fi

if (( COUNT > 1 )) && [[ -n "$OUTPUT" ]]; then
  echo "--output can only be used when --count 1" >&2
  exit 1
fi

if [[ -n "$GAUSSIAN" ]]; then
  echo "gaussian parameter is accepted but not supported; ignoring" >&2
fi

run_generation() {
  local output_path="$1"
  local cmd=(
    "$GENERATOR"
    --model carsenk/z-image-turbo-mflux-8bit
    --prompt "$PROMPT"
    --width "$WIDTH"
    --height "$HEIGHT"
    --steps "$STEPS"
  )

  if [[ -n "$SEED" ]]; then
    cmd+=(--seed "$SEED")
  fi

  if [[ -n "$GUIDANCE" ]]; then
    cmd+=(--guidance "$GUIDANCE")
  fi

  if [[ -n "$IMAGE_PATH" ]]; then
    cmd+=(--image-path "$IMAGE_PATH")
  fi

  if [[ -n "$IMAGE_STRENGTH" ]]; then
    cmd+=(--image-strength "$IMAGE_STRENGTH")
  fi

  # gaussian is accepted but not used by the CLI
  cmd+=(--output "$output_path")

  "${cmd[@]}"
}

if (( COUNT == 1 )); then
  if [[ -z "$OUTPUT" ]]; then
    OUTPUT="$BASE_DIR/output/$(date +%Y%m%d-%H%M%S).png"
  elif [[ "$OUTPUT" != /* ]]; then
    OUTPUT="$BASE_DIR/output/$OUTPUT"
  fi

  run_generation "$OUTPUT"
  exit 0
fi

timestamp="$(date +%Y%m%d-%H%M%S)"

for i in $(seq 1 "$COUNT"); do
  printf -v index "%03d" "$i"
  output_path="$BASE_DIR/output/${PREFIX}-${timestamp}-${index}.png"
  run_generation "$output_path"
done
