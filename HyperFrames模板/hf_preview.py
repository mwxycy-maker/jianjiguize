"""HyperFrames 片段 → 用工作台播放器 1.0 播放的 HTML 预览（不渲染）。
阿亮的习惯：先看 HTML 呈现，没问题再输出成片；播放器和整片预览用同一个（分段进度条、▶ 播放、逐帧、倍速、逐字稿栏）。

用法：python3 hf_preview.py 片段目录 输出目录 [标题] [--player 播放器目录]
- 播放器目录默认找 ../../DeepSeekv1-flash/剪辑工程，也可以用环境变量 HF_PLAYER 指定；
  里面要有 engine.js / player.js / player-ui.js / style.css（player-lock.json 锁定的 1.0 版，原样复制，不改）。
- 片段原样复制到 输出目录/clip/（只在 <head> 开头补一行 window.__timelines 初始化，渲染器平时会先建好它），
  由 hf-adapter.js 用 iframe 叠在播放器画布上，跟着播放器的时钟 seek。
- 声音：片段里所有 <audio>/<video> 的声音按 data-start、data-volume 混成 mix.mp3 当播放器的音轨；没有声音就生成同样长的静音轨。
- 分段：片段目录里有 shots.json（[{start,end,name}]）就用它；否则用根节点下带 data-label 的 .clip；都没有就整段算一镜。
- 逐字稿：片段目录里有 captions.json（[[start,end,"台词"]]）就显示，没有就空着。
"""
import json, re, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
args = [a for a in sys.argv[1:]]
player = None
if '--player' in args:
    i = args.index('--player'); player = Path(args[i + 1]); del args[i:i + 2]
src, out = Path(args[0]), Path(args[1])
title = args[2] if len(args) > 2 else src.name
import os
player = player or Path(os.environ.get('HF_PLAYER', HERE.parent.parent / 'DeepSeekv1-flash' / '剪辑工程'))
PLAYER_FILES = ['engine.js', 'player.js', 'player-ui.js', 'style.css']
for f in PLAYER_FILES:
    if not (player / f).exists():
        sys.exit(f'找不到播放器文件 {player / f}；用 --player 指定工作台播放器目录')

html = (src / 'index.html').read_text()
attr = lambda name, default=None: (re.search(rf'data-{name}="([^"]*)"', html) or [None, default])[1]
root_tag = re.search(r'<[^>]*data-composition-id="[^"]*"[^>]*>', html).group(0)
ra = lambda name, default=None: (re.search(rf'data-{name}="([^"]*)"', root_tag) or [None, default])[1]
cid, dur = ra('composition-id'), float(ra('duration'))
W, H = int(ra('width', 1920)), int(ra('height', 1080))
FPS = 30

out.mkdir(parents=True, exist_ok=True)
clip = out / 'clip'
if clip.exists(): shutil.rmtree(clip)
clip.mkdir()
for f in src.iterdir():   # 片段里的本地文件一起带上（渲染结果、说明文件不带）
    if f.name in ('index.html', 'node_modules', 'renders', '.hyperframes', 'shots.json', 'captions.json', 'package.json', 'package-lock.json', 'hyperframes.json', 'meta.json') or f.name.startswith('.') or f.suffix == '.md':
        continue
    if f.suffix == '.mp4' and f.name.startswith('out'):
        continue
    dst = clip / f.name
    if f.is_dir(): shutil.copytree(f, dst, dirs_exist_ok=True)
    else: shutil.copy2(f, dst)
BOOT = '<script>window.__timelines = window.__timelines || {};</script>'
(clip / 'index.html').write_text(re.sub(r'(<head[^>]*>)', r'\1\n    ' + BOOT, html, count=1))

for f in PLAYER_FILES: shutil.copy2(player / f, out / f)
shutil.copy2(HERE / 'hf-adapter.js', out / 'hf-adapter.js')
(out / 'hf-mount.js').write_text('HF_MOUNT();  // 播放器外壳插进页面之后、player.js 之前，把片段 iframe 挂到画布上\n')

# ---- 音轨：片段里的声音混在一起；没有就静音
inputs, filters = [], []
for m in re.finditer(r'<(audio|video)\b([^>]*)>', html):
    a = m.group(2)
    s = re.search(r'\bsrc="([^"]+)"', a)
    if not s or s.group(1).startswith(('http:', 'https:', 'data:')): continue
    p = src / s.group(1)
    if not p.exists(): continue
    has_audio = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', str(p)],
                               capture_output=True, text=True).stdout.strip()
    if not has_audio or re.search(r'\bmuted\b', a): continue
    g = lambda k, d: float((re.search(rf'data-{k}="([^"]*)"', a) or [None, d])[1])
    st, vol, ms = g('start', 0), g('volume', 1), g('media-start', 0)
    k = len(inputs); inputs += ['-i', str(p)]
    filters.append(f'[{k}:a]atrim=start={ms},asetpts=PTS-STARTPTS,volume={vol},adelay={int(st * 1000)}:all=1[a{k}]')
cmd = ['ffmpeg', '-y', '-v', 'error'] + inputs
if inputs:
    n = len(inputs) // 2
    fc = ';'.join(filters) + ';' + ''.join(f'[a{k}]' for k in range(n)) + f'amix=inputs={n}:normalize=0,apad,atrim=0:{dur}[o]'
    cmd += ['-filter_complex', fc, '-map', '[o]']
else:
    cmd += ['-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=stereo', '-t', str(dur)]
subprocess.run(cmd + ['-ac', '2', '-ar', '44100', '-b:a', '128k', str(out / 'mix.mp3')], check=True)

# ---- 分段 / 逐字稿
if (src / 'shots.json').exists():
    shots = json.loads((src / 'shots.json').read_text())
else:
    shots = []
    for m in re.finditer(r'<[^>]*class="[^"]*\bclip\b[^"]*"[^>]*>', html):
        t = m.group(0); lab = re.search(r'data-label="([^"]+)"', t)
        if not lab: continue
        s = float((re.search(r'data-start="([^"]*)"', t) or [0, 0])[1]); d = float((re.search(r'data-duration="([^"]*)"', t) or [0, dur])[1])
        shots.append({'start': s, 'end': min(dur, s + d), 'name': lab.group(1)})
    shots = sorted(shots, key=lambda s: s['start']) or [{'start': 0, 'end': dur, 'name': title}]
captions = json.loads((src / 'captions.json').read_text()) if (src / 'captions.json').exists() else []

cfg = dict(id=cid, title=title, duration=dur, fps=FPS, width=W, height=H, audio='mix.mp3', shots=shots, captions=captions)
(out / 'hf-clip.js').write_text(f'window.HF_CLIP = {json.dumps(cfg, ensure_ascii=False, indent=1)};\n')
page = f'''<meta charset="utf-8">
<title>{title}</title>
<link rel="stylesheet" href="style.css">
<script defer charset="utf-8" src="hf-clip.js"></script>
<script defer charset="utf-8" src="engine.js"></script>
<script defer charset="utf-8" src="hf-adapter.js"></script>
<script defer charset="utf-8" src="player-ui.js"></script>
<script defer charset="utf-8" src="hf-mount.js"></script>
<script defer charset="utf-8" src="player.js"></script>
'''
(out / 'index.html').write_text(page)
print('预览页 →', out / 'index.html')
