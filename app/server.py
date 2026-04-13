#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import signal
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from PIL import Image, ImageFilter
import psutil


BASE_DIR = Path(__file__).resolve().parents[1]
WEB_DIR = BASE_DIR / "web"
OUTPUT_DIR = BASE_DIR / "output"
UPLOAD_DIR = BASE_DIR / "uploads"
RUN_SCRIPT = BASE_DIR / "run-zimage.sh"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = int(os.environ.get("ZIMAGE_PORT", "8765"))
MODEL_CONFIGS = {
    "zimage": {
        "backend": "zimage",
        "label": "Z image",
        "model": "carsenk/z-image-turbo-mflux-8bit",
        "base_model": "",
        "low_ram": False,
        "mlx_cache_limit_gb": "",
    },
    "qimage": {
        "backend": "qimage",
        "label": "Qwen Image 2512",
        "model": str(BASE_DIR / "models" / "qwen-image-2512-4bit"),
        "base_model": "qwen",
        "low_ram": True,
        "mlx_cache_limit_gb": "8",
    },
}


def now_ms() -> int:
    return int(time.time() * 1000)


def safe_int(value: Any, default: int, minimum: int | None = None, maximum: int | None = None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    if minimum is not None:
        parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(maximum, parsed)
    return parsed


def safe_float(value: Any, default: float, minimum: float | None = None, maximum: float | None = None) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    if minimum is not None:
        parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(maximum, parsed)
    return parsed


def sanitize_filename(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-")
    return cleaned or "image"


@dataclass
class Job:
    job_id: str
    request: dict[str, Any]
    status: str = "queued"
    started_at: int | None = None
    finished_at: int | None = None
    elapsed_ms: int | None = None
    images: list[str] = field(default_factory=list)
    error: str | None = None
    notes: list[str] = field(default_factory=list)
    stdout: str = ""
    stderr: str = ""
    cancelled: bool = False

    def to_dict(self) -> dict[str, Any]:
        current_elapsed = self.elapsed_ms
        if current_elapsed is None and self.started_at is not None and self.status == "running":
            current_elapsed = now_ms() - self.started_at
        estimated_ms = estimate_duration_ms(self.request)
        progress = estimate_progress(self.status, current_elapsed, estimated_ms)
        return {
            "jobId": self.job_id,
            "status": self.status,
            "startedAt": self.started_at,
            "finishedAt": self.finished_at,
            "elapsedMs": current_elapsed,
            "estimatedMs": estimated_ms,
            "progress": progress,
            "images": self.images,
            "error": self.error,
            "notes": self.notes,
            "request": self.request,
        }


JOBS: dict[str, Job] = {}
JOBS_LOCK = threading.Lock()
JOB_PROCS: dict[str, subprocess.Popen[str]] = {}

psutil.cpu_percent(None)


def estimate_duration_ms(request: dict[str, Any]) -> int:
    pixels_factor = max(1.0, (request.get("width", 1024) * request.get("height", 1024)) / (1024 * 1024))
    count_factor = max(1, int(request.get("count", 1)))
    steps_factor = max(1, int(request.get("steps", 9)))
    backend_factor = 2.8 if request.get("modelType") == "qimage" else 1.0
    return int(1800 + (steps_factor * 260 * pixels_factor * count_factor * backend_factor))


def estimate_progress(status: str, elapsed_ms: int | None, estimated_ms: int) -> int:
    normalized = (status or "").lower()
    if normalized == "queued":
        return 4
    if normalized == "running":
        elapsed = elapsed_ms or 0
        return min(96, max(8, int((elapsed / max(estimated_ms, 1)) * 100)))
    if normalized == "completed":
        return 100
    if normalized == "failed":
        return 100
    return 0


def normalize_request(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("prompt is required")

    prompt_template = str(payload.get("promptTemplate") or "").strip()
    prompt_template_name = str(payload.get("promptTemplateName") or "").strip()
    model_type = str(payload.get("modelType") or "zimage").strip().lower()
    if model_type not in MODEL_CONFIGS:
        raise ValueError("unsupported model type")
    width = safe_int(payload.get("width"), 1024, minimum=64)
    height = safe_int(payload.get("height"), 1024, minimum=64)
    count = safe_int(payload.get("count"), 1, minimum=1, maximum=8)
    steps = safe_int(payload.get("steps"), 9, minimum=1, maximum=256)
    guidance = safe_float(payload.get("guidance"), 7.5, minimum=0.0, maximum=30.0)
    gaussian = safe_float(payload.get("gaussian"), 0.8, minimum=0.0, maximum=10.0)
    resolution = str(payload.get("resolution") or "standard")
    aspect_ratio = str(payload.get("aspectRatio") or "custom")
    seed_raw = payload.get("seed")
    seed = None if seed_raw in ("", None) else safe_int(seed_raw, 42, minimum=0)
    image_strength = safe_float(payload.get("imageStrength"), 0.4, minimum=0.0, maximum=1.0)
    edit_image_path = str(payload.get("editImagePath") or "").strip()
    edit_image_name = str(payload.get("editImageName") or "").strip()
    edit_image_data_url = str(payload.get("editImageDataUrl") or "").strip()

    return {
        "prompt": prompt,
        "promptTemplate": prompt_template,
        "promptTemplateName": prompt_template_name,
        "modelType": model_type,
        "modelLabel": MODEL_CONFIGS[model_type]["label"],
        "width": width,
        "height": height,
        "count": count,
        "steps": steps,
        "guidance": guidance,
        "gaussian": gaussian,
        "resolution": resolution,
        "aspectRatio": aspect_ratio,
        "seed": seed,
        "imageStrength": image_strength,
        "editImagePath": edit_image_path,
        "editImageName": edit_image_name,
        "editImageDataUrl": edit_image_data_url,
    }


def decode_data_url(data_url: str) -> tuple[bytes, str]:
    match = re.match(r"^data:(?P<mime>[-\w.+/]+);base64,(?P<data>.+)$", data_url)
    if not match:
        raise ValueError("invalid image data url")
    try:
        raw = base64.b64decode(match.group("data"), validate=True)
    except ValueError as exc:
        raise ValueError("invalid base64 image payload") from exc
    extension = mimetypes.guess_extension(match.group("mime")) or ".png"
    if extension == ".jpe":
        extension = ".jpg"
    return raw, extension


def resolve_edit_image(request: dict[str, Any], job_id: str) -> Path | None:
    edit_path = str(request.get("editImagePath") or "").strip()
    if edit_path:
        if edit_path.startswith("/api/images/"):
            candidate = OUTPUT_DIR / edit_path.rsplit("/", 1)[-1]
        elif edit_path.startswith("/api/uploads/"):
            candidate = UPLOAD_DIR / edit_path.rsplit("/", 1)[-1]
        else:
            candidate = Path(edit_path)
        candidate = candidate.resolve()
        allowed_roots = [OUTPUT_DIR.resolve(), UPLOAD_DIR.resolve()]
        if candidate.exists() and any(root == candidate.parent or root in candidate.parents for root in allowed_roots):
            return candidate
        raise ValueError("edit image not found")

    data_url = str(request.get("editImageDataUrl") or "").strip()
    if not data_url:
        return None

    raw, extension = decode_data_url(data_url)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    upload_path = UPLOAD_DIR / f"upload-{job_id}{extension}"
    upload_path.write_bytes(raw)
    request["editImagePath"] = f"/api/uploads/{upload_path.name}"
    request["editImageDataUrl"] = ""
    return upload_path


def build_command(job: Job) -> tuple[list[str], list[str]]:
    request = job.request
    model_config = MODEL_CONFIGS[request["modelType"]]
    prefix = sanitize_filename(f"job-{job.job_id}")
    single_output = OUTPUT_DIR / f"{prefix}.png"
    notes: list[str] = [f"Backend: {model_config['label']}"]
    prompt_text = request["prompt"]
    if request.get("promptTemplate"):
        prompt_text = f"{request['promptTemplate']}\n{prompt_text}"
    edit_image_path = resolve_edit_image(request, job.job_id)
    command = [
        str(RUN_SCRIPT),
        "--prompt",
        prompt_text,
        "--backend",
        str(model_config["backend"]),
        "--model",
        str(model_config["model"]),
        "--width",
        str(request["width"]),
        "--height",
        str(request["height"]),
        "--steps",
        str(request["steps"]),
        "--count",
        str(request["count"]),
        "--guidance",
        str(request["guidance"]),
        "--prefix",
        prefix,
    ]

    if model_config.get("base_model"):
        command.extend(["--base-model", str(model_config["base_model"])])

    if model_config.get("low_ram"):
        command.append("--low-ram")

    if model_config.get("mlx_cache_limit_gb"):
        command.extend(["--mlx-cache-limit-gb", str(model_config["mlx_cache_limit_gb"])])

    if request["seed"] is not None:
        command.extend(["--seed", str(request["seed"])])

    if request["count"] == 1:
        command.extend(["--output", str(single_output)])

    if edit_image_path is not None:
        command.extend(["--image-path", str(edit_image_path), "--image-strength", str(request["imageStrength"])])
        notes.append(f"Editing source image: {request.get('editImageName') or edit_image_path.name}")

    return command, notes


def collect_image_paths(job: Job) -> list[Path]:
    request = job.request
    prefix = sanitize_filename(f"job-{job.job_id}")
    if request["count"] == 1:
        image_path = OUTPUT_DIR / f"{prefix}.png"
        if image_path.exists():
            return [image_path]
        return []

    return sorted(OUTPUT_DIR.glob(f"{prefix}-*.png"))


def apply_gaussian_blur(image_paths: list[Path], radius: float) -> list[str]:
    notes: list[str] = []
    if radius <= 0 or not image_paths:
        return notes

    for image_path in image_paths:
        with Image.open(image_path) as image:
            blurred = image.filter(ImageFilter.GaussianBlur(radius=radius))
            blurred.save(image_path)

    notes.append(f"Applied Gaussian blur post-process with radius {radius:.1f}.")
    return notes


def readable_image_paths(image_paths: list[Path]) -> list[Path]:
    readable: list[Path] = []
    for image_path in image_paths:
        try:
            with Image.open(image_path) as image:
                image.verify()
            readable.append(image_path)
        except Exception:
            continue
    return readable


def run_job(job_id: str) -> None:
    with JOBS_LOCK:
        job = JOBS[job_id]
        job.status = "running"
        job.started_at = now_ms()

    command, notes = build_command(job)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        proc = subprocess.Popen(
            command,
            cwd=str(BASE_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
        with JOBS_LOCK:
            JOB_PROCS[job_id] = proc
        stdout, stderr = proc.communicate()
        finished_at = now_ms()
        image_paths = readable_image_paths(collect_image_paths(job))
        blur_notes = apply_gaussian_blur(image_paths, float(job.request.get("gaussian") or 0))
        images = [f"/api/images/{path.name}" for path in image_paths]

        with JOBS_LOCK:
            JOB_PROCS.pop(job_id, None)
            job.stdout = stdout
            job.stderr = stderr
            job.finished_at = finished_at
            job.elapsed_ms = finished_at - (job.started_at or finished_at)
            job.images = images
            job.notes.extend(notes)
            job.notes.extend(blur_notes)
            if job.cancelled:
                job.status = "cancelled"
                job.error = "任务已取消。"
            elif images:
                job.status = "completed"
                if proc.returncode != 0:
                    job.notes.append(f"Generator exited with code {proc.returncode} after writing image output.")
            elif proc.returncode == 0:
                job.status = "failed"
                job.error = "生成命令成功结束，但没有找到输出图片。"
            else:
                job.status = "failed"
                stderr = (stderr or "").strip()
                job.error = stderr or f"生成失败，退出码 {proc.returncode}"
    except Exception as exc:
        finished_at = now_ms()
        with JOBS_LOCK:
            JOB_PROCS.pop(job_id, None)
            job.status = "failed"
            job.finished_at = finished_at
            job.elapsed_ms = finished_at - (job.started_at or finished_at)
            job.error = str(exc)


def cancel_job(job_id: str) -> tuple[bool, str]:
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        proc = JOB_PROCS.get(job_id)
        if job is None:
            return False, "job not found"
        if job.status in {"completed", "failed", "cancelled"}:
            return False, f"job already {job.status}"
        job.cancelled = True
        job.status = "cancelling"
        if proc is None:
            return True, "cancel requested"
        pid = proc.pid

    try:
        os.killpg(pid, signal.SIGTERM)
        return True, "cancelled"
    except ProcessLookupError:
        return True, "process already exited"


def get_gpu_usage() -> str:
    try:
        output = subprocess.check_output(
            ["zsh", "-lc", "top -l 1 -stats gpu -n 1 2>/dev/null | sed -n '2p'"],
            text=True,
            timeout=2,
        ).strip()
        if output:
            return output
    except Exception:
        pass
    return "N/A"


def get_system_metrics() -> dict[str, Any]:
    vm = psutil.virtual_memory()
    return {
        "cpuPercent": round(psutil.cpu_percent(interval=None), 1),
        "memoryPercent": round(vm.percent, 1),
        "memoryUsedGb": round(vm.used / (1024 ** 3), 1),
        "memoryTotalGb": round(vm.total / (1024 ** 3), 1),
        "gpuPercent": get_gpu_usage(),
    }


class ZImageHandler(BaseHTTPRequestHandler):
    server_version = "ZImageServer/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, content_type: str) -> None:
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self._send_json({"ok": True})
            return

        if path == "/api/system":
            self._send_json(get_system_metrics())
            return

        if path.startswith("/api/jobs/"):
            job_id = path.rsplit("/", 1)[-1]
            with JOBS_LOCK:
                job = JOBS.get(job_id)
                payload = job.to_dict() if job else None
            if payload is None:
                self._send_json({"error": "job not found"}, status=404)
                return
            self._send_json(payload)
            return

        if path.startswith("/api/images/"):
            filename = path.rsplit("/", 1)[-1]
            image_path = OUTPUT_DIR / filename
            if not image_path.exists() or not image_path.is_file():
                self._send_json({"error": "image not found"}, status=404)
                return
            self._send_file(image_path, "image/png")
            return

        if path.startswith("/api/uploads/"):
            filename = path.rsplit("/", 1)[-1]
            upload_path = UPLOAD_DIR / filename
            if not upload_path.exists() or not upload_path.is_file():
                self._send_json({"error": "upload not found"}, status=404)
                return
            content_type = mimetypes.guess_type(upload_path.name)[0] or "application/octet-stream"
            self._send_file(upload_path, content_type)
            return

        static_path = WEB_DIR / ("index.html" if path in ("/", "") else path.lstrip("/"))
        if not static_path.exists() or not static_path.is_file():
            self._send_json({"error": "not found"}, status=404)
            return

        content_type = "text/plain; charset=utf-8"
        if static_path.suffix == ".html":
            content_type = "text/html; charset=utf-8"
        elif static_path.suffix == ".css":
            content_type = "text/css; charset=utf-8"
        elif static_path.suffix == ".js":
            content_type = "application/javascript; charset=utf-8"
        elif static_path.suffix == ".svg":
            content_type = "image/svg+xml"

        self._send_file(static_path, content_type)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.endswith("/cancel") and parsed.path.startswith("/api/jobs/"):
            job_id = parsed.path.split("/")[-2]
            ok, message = cancel_job(job_id)
            status = 200 if ok else 409
            if message == "job not found":
                status = 404
            self._send_json({"ok": ok, "message": message}, status=status)
            return

        if parsed.path != "/api/generate":
            self._send_json({"error": "not found"}, status=404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
            request = normalize_request(payload)
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=400)
            return
        except json.JSONDecodeError:
            self._send_json({"error": "invalid json"}, status=400)
            return

        job_id = uuid.uuid4().hex[:12]
        job = Job(job_id=job_id, request=request)
        with JOBS_LOCK:
            JOBS[job_id] = job

        thread = threading.Thread(target=run_job, args=(job_id,), daemon=True)
        thread.start()
        self._send_json({"jobId": job_id}, status=HTTPStatus.ACCEPTED)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((args.host, args.port), ZImageHandler)
    print(f"Z-Image app running at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
