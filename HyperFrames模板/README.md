# HyperFrames 模板

阿亮 2026-10-23：**以后的动画片段都用 HyperFrames 做。**

[HyperFrames](https://github.com/heygen-com/hyperframes)（HeyGen 开源，Apache 2.0）：用 HTML + CSS + GSAP 写动画，逐帧定位渲染成 MP4 / 带透明通道的 WebM、MOV，同一个时间点永远渲染出同一帧。

## 默认流程：先看 HTML，确认后再渲染（阿亮 2026-10-23）

阿亮：「可以先不渲染吗，我的需求往往是先看 HTML 呈现，没问题我再输出成片」。

1. 写好片段（HTML + GSAP）后**不渲染**，用 `hf_preview.py` 生成带播放控件的预览页（播放 / 暂停、拖进度、循环），发布成网页给阿亮看。
2. 阿亮提修改 → 改 HTML → 重新生成预览页、更新同一个链接。
3. 阿亮说没问题、要出成片时，才运行 `npx hyperframes render`。

```bash
python3 HyperFrames模板/hf_preview.py 片段目录 预览输出目录 "片段名"   # 生成可播放的 HTML 预览（不渲染）
```

预览页按每个 `.clip` 的 `data-start` / `data-duration` 显示、隐藏，视频音频跟着时间走，和渲染器的逻辑一致；画面按窗口等比缩放，手机上也能看。

## 在云端环境开工（已实测，hyperframes 0.8.186）

```bash
source HyperFrames模板/hf_env.sh                        # npm 走代理、用本机 Chromium 渲染
npx -y hyperframes init 片段名 --non-interactive --example=blank --resolution=1080p
hf_gsap 片段名                                          # GSAP 下到本地，index.html 里改成 <script src="gsap.min.js">
cd 片段名 && npx -y hyperframes check                    # 检查
npx -y hyperframes render --output out.mp4               # 阿亮确认后才渲染 MP4
npx -y hyperframes render --format webm --output out.webm   # 需要叠在画面上的（透明背景）
```

速度参考：2.5 秒、1080p、两个 SVG 图标的片段，云端软件渲染约 15 秒。

## 写法要点

- 根元素：`data-composition-id`、`data-start`、`data-duration`、`data-width`、`data-height`。
- 每个元素是一个片段：`class="clip"` + `data-start`、`data-duration`、`data-track-index`（图层）。
- 动画用 **暂停的 GSAP 时间线**，注册到 `window.__timelines["<composition-id>"]`，不要用 `setTimeout` / 自动播放的 CSS 动画（渲染器靠逐帧定位时间线取帧）。
- 视频 `<video src muted playsinline>`、音频 `<audio src data-volume>` 也可以直接放进片段。
- 图形优先用 SVG（线框描边动画用 `strokeDasharray` / `strokeDashoffset`），字体用本地文件或子集，不依赖外网。
- 风格规则照旧：动效节奏、构图、失败标记（[规则/03](../规则/03-动效与构图.md)）都按规则库来，只是实现换成 HyperFrames。

## 和网页剪辑工程怎么配合

- 口播剪辑、字幕、混音仍按原来的工程流程；**动画片段（花字、图标动效、信息图、转场、标题）用 HyperFrames 单独做成 composition，先发 HTML 预览给阿亮看；确认后再渲染成 MP4 / 透明 WebM 放进 `media/`，在工程里当素材播放。**
- 片段时长按口播事件算好再写进 `data-duration`；片段内部的关键动作时刻也写成相对片段开头的秒数，方便和口播对齐。
- 每个片段的 HTML 源文件和渲染结果一起提交到当期视频仓库（`剪辑工程/动画片段/`），以后改动直接改 HTML 重渲染。

## 示例

[示例_圆圈叉与警告三角.html](示例_圆圈叉与警告三角.html)：「失败标记」里的线框圆圈叉（圆环一笔画出、叉两笔画出）和警告三角（落下弹一下、再摇两下），HyperFrames + GSAP 版。
