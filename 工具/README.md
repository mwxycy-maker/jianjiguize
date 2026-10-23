# 工具

从 DeepSeek 三模型 PK 那期整理出来的脚本。默认目录约定（和那期一样）：

```
视频仓库/
  素材/            口播、模型生成的 HTML、截图等原始素材
  剪辑工程/
    工具/          这些脚本 + lines.py、cues.py、plan.py（本期专用）
    音乐/  音效/   本期用到的歌和音效
    media/         处理好的视频素材（demo/ 下是 HTML 录制结果）
```

换项目时，脚本开头标了「←」或「换项目时改这几行」的常量要改成本期的文件。

| 脚本 | 做什么 | 用法 |
|---|---|---|
| [transcribe.py](transcribe.py) | 口播转写：VAD 分句、逐字时间戳、停顿表 | `python3 transcribe.py 口播.mp4 工具/` |
| [timeline.py](timeline.py) | 压缩 >0.5 秒停顿、插入停留、校对稿对齐出字幕；提供 `A(句, 词)` 事件锚点 | 被 plan.py 引用；需要本期的 `lines.py` |
| [beats.py](beats.py) | 歌曲 BPM、强拍、每 0.5 秒响度，用来卡鼓点 | `python3 beats.py 歌.mp3 起 止` |
| [示例_cues.py](示例_cues.py) | 那期完整的配乐表 + 音效表，照着写本期的 `cues.py` | 参考 |
| [示例_cues_鹈鹕测试.py](示例_cues_鹈鹕测试.py) | 鹈鹕测试重剪那期的配乐表 + 音效表：一首歌卡两记大鼓、有人声的歌只拼无人声段、梗视频原声不闪避、安静前奏从 drop 进、同一首歌首尾复用 | 参考 |
| [示例_plan.py](示例_plan.py) | 那期的分镜表：镜头切点、事件锚点（`A(句, 词)`）、素材表、数据水印 | 参考 |
| [mix.py](mix.py) | 混音：人声 -16、音乐闪避、混响收尾、音效、整片 -14 LUFS；配乐表里的相对路径（`音乐/xx.mp3`、`media/xx.mp4`）按工程根目录解析 | `python3 mix.py` |
| [openverse.py](openverse.py) | 在 Openverse（Freesound）搜音效、下载、登记来源 | `python3 openverse.py search whoosh` / `get 编号 文件名` |
| [record_html.py](record_html.py) | 把模型生成的 three.js 网页按统一机位逐帧录成视频 | `python3 record_html.py 名字1,名字2 [--probe]` |
| [示例_record_config.json](示例_record_config.json) | 那期 12 个 HTML 的录制配置（塔、店、游戏按键、海岸） | 参考 |
| [截图高清重排.py](截图高清重排.py) | 低清网页截图「高清重置」：按原图量出每行字的位置、字号、颜色，用网页重新排版，再按 2–4 倍分辨率渲染；字的位置和原图误差 1–2 像素，原来的高亮坐标照用 | 改脚本里每张图的行列表后运行 |
| [fixblack.py](fixblack.py) | 把录像里偶发的整帧黑帧换成前后帧平均（帧数、时长不变） | `python3 fixblack.py 输入.mp4 输出.mp4` |
| [matte.py](matte.py) | 人物抠像（Robust Video Matting），输出原画 \| 遮罩并排视频 | `python3 matte.py 源起 源止 输出名` |
| [make_fonts.py](make_fonts.py) | 按本期用到的字做字体子集 | `python3 make_fonts.py` |
| [stills.py](stills.py) | 打开网页预览，按时间截几张静帧拼成一张图，自查用 | `python3 stills.py 输出.jpg 12.5 30 61.2 --cols 3` |
| [proxies.py](proxies.py) | 给无头 Chromium 做 VP8/Opus 审片代理 | `python3 proxies.py` |
| [preview_build.py](preview_build.py) | 截取前 N 秒打包成独立网页预览，发给阿亮；大于 4MB 的视频自动重压（发布单文件 15MB、单次 64MB 上限），结果缓存 | `python3 preview_build.py 输出目录 秒数 标题` |

## 依赖

- ffmpeg、Python 3（numpy、Pillow、fontTools、onnxruntime、playwright）
- 转写：sherpa-onnx v1.13.8 + SenseVoice int8 模型 + Silero VAD（离线）
- 抠像：rvm_mobilenetv3_fp32.onnx
- 录制：Playwright 自带的 Chromium；three.js 本地副本（r128 / r160）
- 播放器引擎在 [video-workbench/网页引擎](https://github.com/AndroidOne-io/video-workbench/tree/main/网页引擎)
