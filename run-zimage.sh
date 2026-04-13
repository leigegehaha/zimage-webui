#!/bin/zsh
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
Z_GENERATOR="$BASE_DIR/.venv/bin/mflux-generate-z-image-turbo"
Q_GENERATOR="$BASE_DIR/.venv/bin/mflux-generate-qwen"
DEFAULT_PROMPT="一只橘猫坐在木桌上，窗边自然光，写实风格"
DEFAULT_WIDTH=1024
DEFAULT_HEIGHT=1024
DEFAULT_STEPS=9
DEFAULT_COUNT=1
DEFAULT_PREFIX="image"
DEFAULT_BACKEND="zimage"
DEFAULT_MODEL=""
DEFAULT_BASE_MODEL=""
DEFAULT_HF_ENDPOINT=""
DEFAULT_LOW_RAM="0"
DEFAULT_MLX_CACHE_LIMIT_GB=""
DEFAULT_SEED=""
DEFAULT_GUIDANCE=""
DEFAULT_GAUSSIAN=""
DEFAULT_IMAGE_PATH=""
DEFAULT_IMAGE_STRENGTH=""

if [[ ! -x "$Z_GENERATOR" ]] || [[ ! -x "$Q_GENERATOR" ]]; then
  echo "mflux is not installed in $BASE_DIR/.venv"
  exit 1
fi

export HF_HOME="$BASE_DIR/hf-cache"
export HF_HUB_CACHE="$BASE_DIR/hf-cache/hub"

mkdir -p "$BASE_DIR/output"
mkdir -p "$HF_HUB_CACHE"

reuse_home_hf_cache() {
  local model_name="$1"
  local home_model_dir="$HOME/.cache/huggingface/hub/models--${model_name//\//--}"
  local local_model_dir="$HF_HUB_CACHE/models--${model_name//\//--}"

  if [[ ! -d "$home_model_dir" ]] || [[ -e "$local_model_dir" ]]; then
    return
  fi

  ln -s "$home_model_dir" "$local_model_dir"
}

usage() {
  cat <<'EOF'
Usage:
  ./run-zimage.sh [options]
  ./run-zimage.sh "prompt text"
  ./run-zimage.sh "prompt text" output.png

Options:
  --prompt TEXT       Prompt text
  --backend NAME      Backend name: zimage or qimage
  --model NAME        Explicit model repo/path for generic backend
  --base-model NAME   Base model family for generic backend, e.g. qwen
  --hf-endpoint URL   Optional Hugging Face endpoint or mirror
  --width N           Image width, default 1024
  --height N          Image height, default 1024
  --steps N           Inference steps, default 9
  --count N           Number of images to generate, default 1
  --seed N            Seed for entropy
  --guidance N        Guidance scale
  --low-ram           Enable mflux low RAM mode
  --mlx-cache-limit-gb N  Limit MLX cache size in GB
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
BACKEND="$DEFAULT_BACKEND"
MODEL="$DEFAULT_MODEL"
BASE_MODEL="$DEFAULT_BASE_MODEL"
HF_ENDPOINT_VALUE="$DEFAULT_HF_ENDPOINT"
LOW_RAM="$DEFAULT_LOW_RAM"
MLX_CACHE_LIMIT_GB="$DEFAULT_MLX_CACHE_LIMIT_GB"
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
    --backend)
      BACKEND="${2:-}"
      shift 2
      ;;
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --base-model)
      BASE_MODEL="${2:-}"
      shift 2
      ;;
    --hf-endpoint)
      HF_ENDPOINT_VALUE="${2:-}"
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
    --low-ram)
      LOW_RAM="1"
      shift
      ;;
    --mlx-cache-limit-gb)
      MLX_CACHE_LIMIT_GB="${2:-}"
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

if [[ -n "$MLX_CACHE_LIMIT_GB" ]] && ! [[ "$MLX_CACHE_LIMIT_GB" =~ '^[0-9]+([.][0-9]+)?$' ]]; then
  echo "mlx-cache-limit-gb must be a positive number" >&2
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
  local generator="$Z_GENERATOR"
  local model_name="carsenk/z-image-turbo-mflux-8bit"
  local cmd=()

  case "$BACKEND" in
    zimage)
      generator="$Z_GENERATOR"
      if [[ -n "$MODEL" ]]; then
        model_name="$MODEL"
      fi
      ;;
    qimage)
      generator="$Q_GENERATOR"
      if [[ -z "$MODEL" ]]; then
        echo "qimage backend requires --model" >&2
        exit 1
      fi
      model_name="$MODEL"
      if [[ -z "$HF_ENDPOINT_VALUE" ]]; then
        HF_ENDPOINT_VALUE="https://hf-mirror.com"
      fi
      ;;
    *)
      echo "unsupported backend: $BACKEND" >&2
      exit 1
      ;;
  esac

  reuse_home_hf_cache "$model_name"

  cmd=(
    "$generator"
    --model "$model_name"
    --prompt "$PROMPT"
    --width "$WIDTH"
    --height "$HEIGHT"
    --steps "$STEPS"
  )

  if [[ -n "$BASE_MODEL" ]]; then
    cmd+=(--base-model "$BASE_MODEL")
  fi

  if [[ "$LOW_RAM" == "1" ]]; then
    cmd+=(--low-ram)
  fi

  if [[ -n "$MLX_CACHE_LIMIT_GB" ]]; then
    cmd+=(--mlx-cache-limit-gb "$MLX_CACHE_LIMIT_GB")
  fi

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

  if [[ -n "$HF_ENDPOINT_VALUE" ]]; then
    HF_ENDPOINT="$HF_ENDPOINT_VALUE" "${cmd[@]}"
  else
    "${cmd[@]}"
  fi
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
