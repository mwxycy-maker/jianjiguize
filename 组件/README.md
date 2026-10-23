# 动效组件

[动效组件.js](动效组件.js) 是那期的 `common.js`，跑在 video-workbench 的公共播放器 1.0 上（依赖全局 `E` 引擎、`D` 数据、`window.VSRC` 素材表）。
[示例_三联面板.js](示例_三联面板.js) 是那期第③段的完整场景，演示三联面板、点名上前、关键帧推近、奖牌等怎么组合。
[示例_录屏演示与花字.js](示例_录屏演示与花字.js) 是那期第⑪–⑬段：教程录屏（跳切 + 高亮框 + 按倍速播放）、口播先行再进录屏、虚线从人身后穿过、人物后景花字、搜索 API 文字特写。
[线上预览加载.js](线上预览加载.js) 是项目自己的 `preview.js`：线上预览不一次性预载全部视频、网慢时多等、就绪后按出场顺序后台预热（解决「视频定位超时」）。

动画都是时间的纯函数：`f(ctx, t, ...)`，同一个 `t` 永远画出同一帧。

## 缓动

| 函数 | 用途 |
|---|---|
| `eOut(u, p=4)` | 入场：快进慢停（差评君） |
| `eInOut(u)` | 位置、大小的平滑过渡；重新构图 |
| `backOut(u, k)` | 小元素弹出（徽章 2.2、头像 1.6） |
| `spring(u)` | 带回弹的落位 |
| `env(t, a, b, dIn, dOut)` | 进出包络：返回 [进入进度, 退出进度] |
| `keyed(t, keys, dur)` | 关键帧插值（在示例_三联面板.js 里）：`[[时刻, {z, fx, fy}], ...]` |
| `fillZoom(key, ts, z, fx, fy, filter, rate)` | 视频推近 + 滤镜；**ts 不是 1 倍速推进时必须传 rate**，否则网页预览会抽搐 |

## 画面元素

| 组件 | 说明 | 关键参数 |
|---|---|---|
| `bgLight` / `bgDark` | 差评君背景：径向渐变 + 网点 + 漂移柔光 | `tint` 底色 |
| `hostMorph(ctx, t, u)` | 秋芝式：全屏口播 ↔ 左下角圆窗，形状和裁切同时连续变化 | `u` 0 全屏 → 1 圆窗；`HOST_CIRCLE` 位置；脸部裁切 `faceS/fcx/fcy` 按素材改 |
| `hostPop` | 圆窗弹出 / 收起 | |
| `windowCard(ctx, o)` | 差评君窗口卡片：粗黑边白内框大圆角，3D 飞入或平面进出 | `cx cy w h a b content flat mark scale alpha style` |
| `flyPose` / `exitPose` | 3D 飞入（右下远处倾斜飞来）/ 翻落退场 | `dir` 方向 |
| `flatPose` / `flatExit` | 平面进出（轻放大上浮淡入 / 缩小下沉淡出） | |
| `fillVideo` / `fillImage` / `fitImage` | 卡片内容：视频铺满、图片铺满、图片完整放下 | 焦点 `fx fy`、裁切 |
| `fillZoom`（示例里） | 视频推近到某处，可加滤镜 | `z fx fy filter` |
| `triPanels`（示例里） | 三联竖条：左到右间隔 0.5 秒入场；点名上前、其余虚化压暗；整组让位重排 | `spans layout content mark extra` |
| `dataMark` | 数据小水印（用时 · Token · 金额），跟着卡片透视，超宽自动缩字 | |
| `badge` / `badgePop` | 模型徽章：白圆 + logo + 品牌色描边 + 名字 | `side` 名字位置、`theme` |
| `bigTitle` | 大标题：1.9 倍砸下 + 落地抖动 | `size font col stroke glow` |
| `rollNum` | 数字滚动（缓出） | |
| `personCut` | 抠像人物层：花字、连线要放到人后面时，先画字/线，再把人盖回来 | 抠像素材键、对应口播源起点；每个用到的口播片段单独抠一段（`工具/matte.py`） |
| `demoContent` / `demoCard`（示例_录屏演示与花字.js） | 教程录屏：切点列表 `{at, src, rate, z, fx, fy, hl, hlEnd}`，跳切、推近、高亮框、点击涟漪 | 不加白闪；推近过渡 0.7 秒；高亮框要对过素材帧 |
| `srcAt` / `aroll` | 成片时间 → 口播源时间；口播画面（裁黑边、可推近） | `AR_CROP` 按素材改 |

## 换项目要改的

- `MODELS`：徽章的 logo 键、显示名、品牌色。
- `AR_CROP`、`HOST_CIRCLE`、`hostMorph` 里的脸部裁切位置：按本期口播画面改。
- `arollFrame`：那期口播拆成两个文件（175 秒处切分），单文件时直接 `E.video('aroll', s)`。
