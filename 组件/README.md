# 动效组件

[动效组件.js](动效组件.js) 是那期的 `common.js`，跑在 video-workbench 的公共播放器 1.0 上（依赖全局 `E` 引擎、`D` 数据、`window.VSRC` 素材表）。
[示例_三联面板.js](示例_三联面板.js) 是那期第③段的完整场景，演示三联面板、点名上前、关键帧推近、奖牌等怎么组合。
[示例_录屏演示与花字.js](示例_录屏演示与花字.js) 是那期第⑪–⑬段：教程录屏（跳切 + 高亮框 + 按倍速播放）、口播先行再进录屏、虚线从人身后穿过、人物后景花字、搜索 API 文字特写。
[线上预览加载.js](线上预览加载.js) 是项目自己的 `preview.js`：线上预览不一次性预载全部视频、网慢时多等、就绪后按出场顺序后台预热（解决「视频定位超时」）。

[鹈鹕测试组件.js](鹈鹕测试组件.js) 是鹈鹕测试重剪那期（2026-10）的 `common.js`：整套新视觉（见 [规则/03 六之二](../规则/03-动效与构图.md)）。
[示例_镜头接力与新闻散开.js](示例_镜头接力与新闻散开.js) 是那期 `scenes.js` 的节选：新闻散开、镜头接力、点到谁谁上前、鼓点顶一下、梗视频电视窗 + 花屏、开机线回主播、先定格再播放、全屏播放素材、时间变迁构图、正常收尾。

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

## 鹈鹕测试那期新增（[鹈鹕测试组件.js](鹈鹕测试组件.js)）

| 组件 | 说明 | 关键参数 |
|---|---|---|
| `HOST_TRACK` + `hostState(t)` | 主播状态轨：`[时刻, 'full' \| 'circle' \| 'none']`，全屏 ↔ 圆窗 0.75 秒变形，圆窗弹入 0.5 / 收起 0.35 秒，`none` ↔ 全屏硬切 | 回全屏的时刻写成 `EV.x - .7`，在上一镜内容上完成变形 |
| `frame(ctx, t)` | 整帧合成：全屏时先画口播再叠 `VIS[k].over`；否则先画场景再叠圆窗；最后画字幕 | |
| `VIS_ZOOM(t)` | 每次回到全屏口播，从 1.0 缓慢推到 1.05（6 秒） | |
| `win(ctx, o)` | 平面窗口卡片：9px 黑边 + 14px 白内框 + 30px 圆角 | `a b` 进退场时刻，`pop` 弹性，`rot` `fromX` `fromRot` 斜飞入，`blur` `dim` 退后景，`after` 不被裁切的装饰（圈、叉），`dx dy` 抖动 |
| `vid(key, ts, crop, {rate, z, fx, fy})` | 窗口内容：视频裁切 + 推近；素材放完自动停在最后一帧（`rate = 0`） | 定格时自己传 `rate: 0` |
| `pic(name, {fit, crop, bg, pad})` | 窗口内容：图片铺满或完整放下 | |
| `newsPaper(ctx, n, t, o)` | 新闻纸片：白纸 + 投影，从下方翻上来，关键词黄色马克笔扫过 | `n = {img, crop, kw, w}`，`a` 进场，`hl` 划亮时刻，`out` 退场 |
| `badge` / `badgePop` | 白圆徽章：logo / 文字 / 自绘，名字在下方；`sx` 做翻面 | `img imgCrop contain draw label name col` |
| `redX` / `dashRing` / `stamp` | 批改符号：两笔红叉；虚线圈（可旋转）；印章砸下 + 抖动 | `u` 进度；`col`；`spin` |
| `snow` / `scanlines` / `grain` | 花屏、扫描线 + 暗角、胶片颗粒 | |
| `bgLight` / `bgDark` | 背景（静态部分缓存成画布，只有柔光每帧画） | |
| `keyed(t, keys, dur)` | 关键帧插值（`eInOut` 过渡） | |
| `srcAt(t)` | 成片时间 → 口播源时间；插梗的那几秒冻结在上一段末尾 | 依赖 `D.X.pieces` |

换项目要改：`HOST_SRC`（口播画面尺寸）、`FACE`（脸部正方形在口播源里的位置）、`HOST_CIRCLE`、`HOST_TRACK` 里的事件名、`C` 色板。

