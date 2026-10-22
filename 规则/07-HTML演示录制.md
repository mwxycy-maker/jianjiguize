# 07 HTML 演示录制

来源：DeepSeek 三模型 PK 那期（2026-10）。三家模型各自生成的 three.js 网页（雷峰塔、便利店、赛车游戏、海岸），要录成角度、速度完全一致的视频素材。脚本：[工具/record_html.py](../工具/record_html.py)，配置例子：[工具/示例_record_config.json](../工具/示例_record_config.json)。

## 为什么不直接录屏

- 模型生成的网页各自有不同的相机、转速、入场动画，直接录出来三个角度都不一样，观众没有「同台比拼」的感觉。
- 云端机器没有 GPU，软件渲染很慢，实时录屏会掉帧、卡顿。
- 随机数每次都不同，重录一次结果就变了。

## 做法

1. **假时钟逐帧推进**：Playwright `clock.install` + `pause_at`，每帧 `run_for(1000/fps)`（必须是整数毫秒）。`Date`、`performance.now`、`requestAnimationFrame` 全由脚本推进，渲染再慢也不会掉帧。
2. **rAF 降到录制帧率**：网页默认每秒 60 次 rAF，录 24fps 就白算了一倍多。时钟装好之后再注入一段脚本，把 rAF 换成按录制帧率触发的（假）定时器。
3. **固定随机种子**：覆盖 `Math.random`，每次录出来一模一样。
4. **只留画布**：CSS 把网页上所有文字、按钮、面板藏掉，只留 `<canvas>`（需要保留时 `hide_ui: false`）。
5. **统一机位**：
   - 拦截 three.js 渲染器的 `render(scene, camera)`（r150+ 通过 `Object.prototype` 上的 `isWebGLRenderer` setter 拿到实例；r128 通过 `render` setter），找到主相机。
   - 主相机优先用配置里的 `cam` 表达式指定（网页暴露的调试对象，例如 `window.__leifeng.camera`），否则选渲染场景物体最多的那个相机（排除反射相机、立方体贴图相机、后期全屏四边形）。
   - **锁住主相机**：把它的 position / quaternion / lookAt 方法替换成只有我们能改，网页自己的 OrbitControls、镜头动画都改不动。
   - 每帧渲染前按环绕参数摆位：`{el 仰角, omega 每秒转几度, az0 起始方位, fov, target 看向哪, r 距离}`。
6. **游戏要按键**：`actions` 列表按时间按下、松开方向键，录制前的 `pre` 秒用来过开场动画和倒计时。
7. **CDN 走本地**：云端连不上 jsdelivr/unpkg，把对应版本的 three.js 用 `git clone --depth 1 --branch r128`（或 r160）放到本地，录制时把 CDN 请求改到本地文件。

## 配置怎么填

```json
"tower_ds": {
  "file": "DeepSeek V4.1-flash 1017/02-雷峰塔_夕照.html",
  "w": 540, "h": 810, "fps": 24,
  "pre": 1.5, "dur": 16,
  "cam": "window.__leifeng && window.__leifeng.camera",
  "orbit": {"el": 10, "omega": 6, "az0": 0, "fov": 35, "target": [0, 46, 0], "r": 155}
}
```

- **同一组的 `el`、`omega`、`az0`、`fov` 必须相同**，只调 `target`（看向物体中心）和 `r`（距离），让三个物体在画面里一样大。
- 竖条面板用竖版录（540×810），单个大窗口用横版录（1280×720）。
- 先用 `--probe` 拍一张看机位，满意了再正式录。

## 速度参考（云端软件渲染）

| 素材 | 尺寸 | 速度 |
|---|---|---|
| 雷峰塔、便利店 | 540×810 | 约 34 帧/分钟（16 秒素材约 11 分钟） |
| 赛车游戏 | 1280×720 | 约 20 帧/分钟（10 秒素材约 12 分钟，另加开场预跑） |

录制很慢，要放后台排队跑，录好一个接一个进工程；同时跑重的 CPU 任务会更慢。

## 网页里怎么用录好的素材

- 竖条里放竖版素材，用 `fillZoom(key, 时间, 放大倍数, 焦点x, 焦点y)` 放大到细节。
- 三者大小不一时加基础放大（`TOWER_BASE`、`STORE_BASE`），太暗的可以加 `filter: brightness(1.55)` 提亮。
- 无头 Chromium 不带 H.264 解码，审片时用 VP8 代理（[工具/proxies.py](../工具/proxies.py)），交付仍用 H.264。
