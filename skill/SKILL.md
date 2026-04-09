---
name: zimage-generator
description: |
  使用本地 Zimage 模型根据用户提示词生成图片。默认输出 1080p，输出文件保存到 skill 目录下的 output 文件夹。
  当用户没有说明图片比例时，先询问用户比例，再开始生成。高级参数与默认参数保存在 skill 目录下的 skim/config.json 中，可直接修改。
  适用于：Zimage 生图、根据提示词生成图片、本地文生图、设置 Zimage 参数、批量生成图片。
---

# Zimage 本地生图

这个 skill 直接调用本机已有的 Zimage / mflux 环境，不依赖网页。

## 配置位置

- 配置文件：`skim/config.json`
- 输出目录：`output/`
- 生成脚本：`scripts/generate.py`

## 使用规则

1. 先读取 `skim/config.json`
2. 确认用户的提示词
3. 如果用户没有指定比例，先询问用户比例，再继续生成。可选：
   - `1:1`
   - `4:3`
   - `3:4`
   - `16:9`
   - `9:16`
4. 分辨率默认使用 `1080p`
5. 高级参数不要在对话里硬编码，优先让用户修改 `skim/config.json`
6. 生成完成后，告知输出文件路径；如当前环境支持，直接展示图片

## 推荐命令

单张：

```bash
python3 {baseDir}/scripts/generate.py \
  --prompt "一只橘猫坐在木桌上，窗边自然光，写实风格" \
  --aspect-ratio "1:1"
```

多张：

```bash
python3 {baseDir}/scripts/generate.py \
  --prompt "像素风格的未来城市夜景" \
  --aspect-ratio "16:9" \
  --count 4
```

覆盖输出文件名：

```bash
python3 {baseDir}/scripts/generate.py \
  --prompt "科幻产品海报" \
  --aspect-ratio "3:4" \
  --output poster.png
```

## 参数说明

- `--prompt`：必填，提示词
- `--aspect-ratio`：可选，宽高比；如果用户没说，先问
- `--resolution`：可选，默认 `1080p`
- `--count`：可选，默认读取配置
- `--output`：可选，单图时可指定文件名或绝对路径
- `--prefix`：可选，多图时输出文件名前缀
- `--steps` / `--seed` / `--guidance` / `--gaussian`：可选，覆盖配置文件中的高级设置

## 配置项

`skim/config.json` 内支持：

- `generator_path`
- `model`
- `hf_home`
- `hf_hub_cache`
- `output_dir`
- `default_resolution`
- `default_aspect_ratio`
- `default_count`
- `steps`
- `seed`
- `guidance`
- `gaussian`

## 注意事项

- 这个 skill 假设本机已有可执行的 Zimage 生成器
- 如果生成器路径失效，先检查 `skim/config.json` 里的 `generator_path`
- `gaussian` 在此 skill 中作为后处理高斯模糊应用到输出图像
