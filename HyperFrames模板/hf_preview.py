"""HyperFrames 片段 → 可直接播放的 HTML 预览（不渲染）。阿亮的习惯：先看 HTML 呈现，没问题再输出成片。

用法：python3 hf_preview.py 片段目录 输出目录 [标题]
- 读片段的 index.html，去掉 doctype/html/head/body 外壳（发布成网页时外面会自动包一层），保留样式、脚本和画面；
- 加一条播放控件：播放 / 暂停、拖动进度、当前时间、循环；画面按窗口宽度等比缩放；
- 按每个 .clip 的 data-start / data-duration 显示或隐藏，视频、音频跟着时间走（和渲染器的逻辑一致）；
- 片段里引用的本地文件（gsap.min.js、图片、视频……）一起复制过去。
"""
import re, shutil, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
title = sys.argv[3] if len(sys.argv) > 3 else src.name
html = (src / 'index.html').read_text()
head = re.search(r'<head[^>]*>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)</body>', html, re.S).group(1)
head = re.sub(r'<meta[^>]*>', '', head)
head = re.sub(r'<title>.*?</title>', '', head, flags=re.S)

HARNESS = r'''
<style>
  html { background: #101114 !important; }
  html, body { width: auto !important; height: auto !important; overflow-x: hidden !important; overflow-y: auto !important; }
  #hfp-wrap { position: relative; overflow: hidden; margin: 0 auto; }
  #hfp-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
  #hfp-bar { position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; padding: 10px max(16px, env(safe-area-inset-right, 0px)) calc(10px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
             background: #1b1d22; color: #e8eaee; font: 14px/1.2 "Noto Sans SC", "PingFang SC", system-ui, sans-serif; border-top: 1px solid #2b2e35; z-index: 10; }
  #hfp-bar button { font: inherit; color: inherit; background: #2b2f37; border: 1px solid #3a3f49; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
  #hfp-bar button:focus-visible, #hfp-seek:focus-visible { outline: 2px solid #fb6547; outline-offset: 2px; }
  #hfp-seek { flex: 1; min-width: 0; accent-color: #fb6547; }
  #hfp-time { font-variant-numeric: tabular-nums; min-width: 8.5em; text-align: right; color: #aab0bb; }
  #hfp-bar label { display: flex; align-items: center; gap: 6px; color: #aab0bb; white-space: nowrap; }
</style>
<div id="hfp-bar" role="group" aria-label="预览控制">
  <button id="hfp-play" type="button">▶ 播放</button>
  <input id="hfp-seek" type="range" min="0" max="1" step="0.001" value="0" aria-label="进度">
  <span id="hfp-time">0.00 / 0.00 秒</span>
  <label><input id="hfp-loop" type="checkbox" checked> 循环</label>
</div>
<script>
(() => {
  const root = document.querySelector('[data-composition-id]');
  const W = +root.dataset.width || 1920, H = +root.dataset.height || 1080, id = root.dataset.compositionId;
  const wrap = document.createElement('div'); wrap.id = 'hfp-wrap';
  const stage = document.createElement('div'); stage.id = 'hfp-stage'; stage.style.width = W + 'px'; stage.style.height = H + 'px';
  wrap.style.background = getComputedStyle(document.body).backgroundColor;   // 片段的底色只铺在画面里
  document.body.style.setProperty('background', '#101114', 'important');
  root.parentNode.insertBefore(wrap, root); stage.appendChild(root); wrap.appendChild(stage);
  document.body.appendChild(document.getElementById('hfp-bar'));
  const fit = () => { const bar = document.getElementById('hfp-bar').offsetHeight; const k = Math.min(innerWidth / W, (innerHeight - bar) / H);
    wrap.style.width = W * k + 'px'; wrap.style.height = H * k + 'px'; stage.style.transform = `scale(${k})`; };
  addEventListener('resize', fit); fit();
  const clips = [...document.querySelectorAll('.clip')];
  const media = [...document.querySelectorAll('video, audio')];
  const tl = () => (window.__timelines || {})[id] || Object.values(window.__timelines || {})[0];
  const dur = () => +root.dataset.duration || (tl() && tl().duration()) || 1;
  const play = document.getElementById('hfp-play'), seek = document.getElementById('hfp-seek'), time = document.getElementById('hfp-time'), loop = document.getElementById('hfp-loop');
  let t = 0, playing = false, last = 0;
  function show(at) {
    const T = tl(); if (T) T.seek(at, false);
    for (const c of clips) { const a = +c.dataset.start || 0, d = +c.dataset.duration || dur(); c.style.visibility = at >= a && at < a + d ? 'visible' : 'hidden'; }
    for (const m of media) {
      const c = m.closest('.clip') || m, a = +c.dataset.start || 0, d = +c.dataset.duration || dur(), on = at >= a && at < a + d;
      if (m.dataset.volume) m.volume = Math.min(1, +m.dataset.volume);
      if (!on) { if (!m.paused) m.pause(); continue; }
      if (Math.abs(m.currentTime - (at - a)) > .2) m.currentTime = at - a;
      if (playing && m.paused) m.play().catch(() => {}); if (!playing && !m.paused) m.pause();
    }
    seek.value = at / dur(); time.textContent = `${at.toFixed(2)} / ${dur().toFixed(2)} 秒`;
  }
  function frame(now) {
    if (!playing) return;
    t += (now - last) / 1000; last = now;
    if (t >= dur()) { if (loop.checked) t = 0; else { t = dur() - 1e-3; setPlaying(false); } }
    show(t); requestAnimationFrame(frame);
  }
  function setPlaying(p) { playing = p; play.textContent = p ? '❚❚ 暂停' : '▶ 播放'; if (p) { if (t >= dur() - .01) t = 0; last = performance.now(); requestAnimationFrame(frame); } show(t); }
  play.addEventListener('click', () => setPlaying(!playing));
  seek.addEventListener('input', () => { t = +seek.value * dur(); show(t); });
  addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); setPlaying(!playing); } });
  const start = () => { show(0); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(start, 50));
})();
</script>
'''
out.mkdir(parents=True, exist_ok=True)
BOOT = '<script>window.__timelines = window.__timelines || {};</script>'   # 渲染器平时会先建好这个对象
page = f'<title>{title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n{BOOT}\n{head}\n{body}\n{HARNESS}'
(out / 'index.html').write_text(page)
for f in src.iterdir():   # 片段里的本地文件一起带上
    if f.name in ('index.html', 'node_modules', 'renders', '.hyperframes') or f.name.startswith('.') or f.suffix in ('.md', '.json'):
        continue
    if f.suffix == '.mp4' and f.parent == src and f.name.startswith('out'):
        continue   # 渲染结果不放进预览
    dst = out / f.name
    if f.is_dir(): shutil.copytree(f, dst, dirs_exist_ok=True)
    else: shutil.copy2(f, dst)
print('预览页 →', out / 'index.html')
