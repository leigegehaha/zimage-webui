# Zimage WebUI for Mac

<p align="center">
  <img src="./assets/screenshots/zimage-home.png" alt="Zimage WebUI Home" width="920" />
</p>

<p align="center">
  <a href="https://github.com/leigegehaha/zimage-webui/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-00d2a8.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-111827.svg" alt="Platform">
  <img src="https://img.shields.io/badge/python-3.11%2B-3776AB.svg" alt="Python">
  <img src="https://img.shields.io/badge/model-Zimage%20Turbo-ff4d8d.svg" alt="Model">
  <img src="https://img.shields.io/badge/ui-local%20webui-f6c945.svg" alt="Local WebUI">
</p>

> 中文 / English bilingual README

## 中文简介

这是一个把 `Zimage` 封装成网页应用的本地项目。

目标很直接：让用户下载项目后，就能在本地浏览器里直接运行 Zimage，不需要先学习复杂的 ComfyUI 节点工作流，也不需要自己拼装一整套推理界面。

这个项目适合：

- 想在 Mac 上本地跑 Zimage
- 想直接输入提示词并出图
- 想调尺寸、比例、分辨率、步数、种子等参数
- 想保留任务队列、历史记录、预览和下载能力
- 想在本地做边界更宽、偏成熟内容的私有探索, 没有审查，可以在本地生成色色内容。具体可以去 output 目录看看
- 不想折腾 ComfyUI 的用户

![Zimage WebUI Home](./output/job-aeb442b18645-20260409-150212-002.png)

## English Summary

This project turns `Zimage` into a local WebUI for macOS.

The goal is simple: download the repository, install dependencies, start the local server, and generate images in your browser without building complex ComfyUI workflows.

This project is for users who want:

- a local Zimage experience on Mac
- direct prompt-to-image generation in a browser
- adjustable size, aspect ratio, resolution, steps, seed, and guidance
- task queue, history, preview, and download support
- more permissive private experimentation for mature visual concepts
- a lighter workflow than ComfyUI

## Quick Start


### 中文

```bash
git clone https://github.com/leigegehaha/zimage-webui.git
cd zimage-webui
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
chmod +x start-webapp.sh
./start-webapp.sh
```

浏览器打开：

```text
http://127.0.0.1:8765
```

### English

```bash
git clone https://github.com/leigegehaha/zimage-webui.git
cd zimage-webui
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
chmod +x start-webapp.sh
./start-webapp.sh
```

Open:

```text
http://127.0.0.1:8765
```

## 项目亮点 | Highlights

- 本地优先 / Local first
  下载代码后即可本地运行，不依赖远程网页平台。
- 不需要 ComfyUI / No ComfyUI required
  直接网页交互，不需要节点编排。
- 模型不进仓库 / Model files are not committed
  首次运行自动下载，或通过 `download-model.sh` 一键预下载。
- 产品化交互 / Productized UX
  任务队列、进度条、历史记录、图片预览、下载、高级参数抽屉。
- 更自由的本地探索 / More permissive local exploration
  更适合私有、成熟内容方向的本地创作与实验，生成样例可查看 `output/`。
- 可扩展 / Extensible
  自带 `skill/` 目录，可继续接入更大的自动化流程。

## 页面预览 | Screenshots

### 主界面 / Main UI

![Zimage WebUI Home](./assets/screenshots/zimage-home.png)

### 高级参数 / Advanced Settings

![Zimage WebUI Settings](./assets/screenshots/zimage-settings.png)

## Zimage 是什么 | What Is Zimage

### 中文

`Zimage` 是一个先进的图像生成模型，适合本地文生图场景。当前项目基于 `mflux` 生态下的 `z-image-turbo` 变体进行封装，可以在 Apple Silicon 的本地环境中直接运行。

它的几个关键特征：

- 本地运行
- 出图速度较友好
- 适合配合 Prompt 和风格模板快速创作
- 内容限制相对更少，探索空间更大
- 更适合做私有环境下的成熟内容实验

需要说明的是，这个项目是本地工具，不内置线上平台那类强审核链路，因此在成熟内容方向上的边界通常会更宽。你可以直接查看本地 `output/` 目录里的生成样例。这里不展开描述具体内容，但请确保你的使用符合所在地法律法规与平台要求。

### English

`Zimage` is an advanced image generation model suited for local text-to-image workflows. This project currently wraps the `z-image-turbo` variant from the `mflux` ecosystem and runs locally on Apple Silicon.

Key characteristics:

- local execution
- relatively fast iteration
- prompt and style-template friendly
- fewer built-in restrictions compared to many hosted services
- better suited for private mature-content experimentation

This repository is a local tool, not a hosted platform with a heavy moderation pipeline. As a result, the boundary for mature content exploration is typically wider in private local use. You can review example outputs in the local `output/` directory. Make sure your usage complies with local laws and platform requirements.

## 功能特性 | Features

### WebUI

- 提示词输入 / Prompt input
- 风格模板输入与复用 / Style templates and reuse
- 自定义宽高 / Custom width and height
- 比例选择 / Aspect ratio selection
- 分辨率选择：`1080p` / `2K` / `4K`
- 批量生成 / Multi-image generation
- 非阻塞任务队列 / Non-blocking task queue
- 进度条与耗时统计 / Progress bar and elapsed time
- 历史记录 / History with generation parameters
- 图片预览和下载 / Preview and download
- 取消任务 / Cancel task

### 高级设置 | Advanced Controls

- `steps`
- `seed`
- `guidance`
- `gaussian`

### UI

- 单页应用 / Single-page app
- 像素风、高饱和界面 / Pixel-style, saturated UI
- 瀑布流结果布局 / Waterfall-style result stream
- 中英切换 / Chinese-English toggle
- 状态颜色区分 / Status-based color tags

### Skill

项目内置 `skill/` 目录，可作为独立 skill 使用：

- 按提示词生成图片
- 如果用户未指定比例，要求先问比例
- 默认 `1080p`
- 高级参数在 `skill/skim/config.json`
- 输出到 `skill/output/`

## 项目结构 | Project Structure

```text
zimage/
├── app/
│   └── server.py
├── web/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── skill/
│   ├── SKILL.md
│   ├── skim/
│   │   └── config.json
│   ├── scripts/
│   │   └── generate.py
│   └── output/
├── assets/
│   └── screenshots/
├── output/
├── download-model.sh
├── run-zimage.sh
├── start-webapp.sh
├── requirements.txt
└── README.md
```

## 安装与运行 | Install & Run

### 环境 | Environment

- macOS
- Apple Silicon
- Python 3.11+
- `mflux`
- `carsenk/z-image-turbo-mflux-8bit`

### 安装依赖 | Install Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 启动网页 | Start WebUI

```bash
chmod +x start-webapp.sh
./start-webapp.sh
```

### 命令行生成 | CLI Generation

```bash
chmod +x run-zimage.sh
./run-zimage.sh --prompt "一只橘猫坐在木桌上，窗边自然光，写实风格"
```

## 模型下载 | Model Download

仓库不上传模型文件本体，只上传代码。

The repository does not contain model weights. It only contains code.

### 方式 1 / Option 1: 首次运行自动下载 / Auto-download on first run

首次生成时，底层会自动把模型下载到：

- `hf-cache/`

### 方式 2 / Option 2: 一键预下载 / One-click pre-download

```bash
chmod +x download-model.sh
./download-model.sh
```

脚本验证通过后，会把模型缓存到本地 `hf-cache/`。

## Skill 用法 | Skill Usage

编辑配置：

- `skill/skim/config.json`

调用脚本：

```bash
python3 skill/scripts/generate.py \
  --prompt "测试图片，像素风格小机器人，霓虹背景，高饱和度" \
  --aspect-ratio 1:1
```

## Releases 打包说明 | Release Packaging Notes

### 中文

如果你要给客户发“可下载版本”，建议使用 GitHub Releases，而不是直接把模型缓存和本地输出一起提交进仓库。

建议规则：

- 不要把 `.venv/`、`hf-cache/`、`output/`、`skill/output/` 打进 release
- release 只包含源码、启动脚本、README、skill、前端和后端代码
- 模型通过首次运行自动下载，或客户手动执行 `download-model.sh`

推荐流程：

```bash
git tag v0.1.0
git push origin v0.1.0
```

然后在 GitHub Releases 页面发布一个新版本，并在 Release Notes 中说明：

- 支持的系统
- 首次运行会自动下载模型
- 如需提前下载可运行 `download-model.sh`
- 模型文件不包含在 release 包内

### English

For customer-facing downloadable builds, use GitHub Releases instead of committing model caches or local outputs.

Recommended rules:

- do not ship `.venv/`, `hf-cache/`, `output/`, or `skill/output/`
- releases should include source code, scripts, README, skill files, frontend, and backend
- model weights should be downloaded on first run or pre-downloaded with `download-model.sh`

Recommended flow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then publish a GitHub Release and mention:

- supported system requirements
- first run downloads the model automatically
- `download-model.sh` is available for prefetching
- model weights are not included in the release bundle

## 已知说明 | Notes

- `1080p` 是目标分辨率档位，不一定严格等于最终像素
- 底层模型可能把宽高自动调整为 `16` 的倍数
- 例如 `1080x1080` 可能最终落盘为 `1072x1072`
- 首次出图会较慢，因为需要下载模型
- `hf-cache/` 体积会比较大，不建议提交到 Git

## License

MIT. See [LICENSE](./LICENSE).
