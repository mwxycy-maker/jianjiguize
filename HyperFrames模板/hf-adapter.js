// HyperFrames 片段 → 工作台播放器 1.0 的适配层（hf_preview.py 生成的预览页用）。
// 片段原样放在 clip/ 里，用 iframe 叠在播放器画布 #c 上；播放器的时钟（#mix 音轨）走到哪，
// 就把片段的 GSAP 时间线 seek 到哪，并按 data-start / data-duration 显示或隐藏 .clip、对齐视频。
'use strict';
(() => {
  const C = window.HF_CLIP;   // {id, title, duration, fps, width, height, audio, shots, captions}
  const W = C.width, H = C.height;
  let frame, doc, win, root, clips = [], media = [], sub, loaded;

  const stage = () => document.getElementById('stage');
  function mount() {
    frame = document.createElement('iframe');
    frame.id = 'hf-frame'; frame.src = 'clip/index.html'; frame.title = '动画片段'; frame.tabIndex = -1;
    frame.setAttribute('scrolling', 'no');
    frame.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;border:0;transform-origin:0 0;pointer-events:none;background:transparent`;
    sub = document.createElement('div'); sub.id = 'hf-sub';
    sub.style.cssText = 'position:absolute;left:0;right:0;text-align:center;pointer-events:none;color:#fff;font-weight:600;text-shadow:0 2px 6px #000,0 0 2px #000;display:none';
    const c = document.getElementById('c');
    c.after(frame); frame.after(sub);       // 在画布之上、载入遮罩和中间播放键之下
    loaded = new Promise(r => frame.addEventListener('load', r, { once: true })).then(async () => {
      win = frame.contentWindow; doc = frame.contentDocument;
      if (doc.fonts) await doc.fonts.ready;
      for (let i = 0; i < 100 && !tl(); i++) await new Promise(r => setTimeout(r, 50));
      if (!tl()) throw new Error('片段没有注册 window.__timelines');
      root = doc.querySelector('[data-composition-id]');
      clips = [...doc.querySelectorAll('.clip')];
      media = [...doc.querySelectorAll('video, audio')];
      for (const m of media) { m.muted = true; m.preload = 'auto'; m.playsInline = true; }   // 声音都混进 mix 音轨了
    });
    fit(); new ResizeObserver(fit).observe(c); new ResizeObserver(fit).observe(stage());
    addEventListener('resize', fit); document.addEventListener('fullscreenchange', () => requestAnimationFrame(fit));
  }
  function fit() {   // iframe 和画布实际显示出来的画面严丝合缝（全屏时画布是 object-fit: contain）
    const c = document.getElementById('c'), s = stage(); if (!frame || !c || !s) return;
    const r = c.getBoundingClientRect(), R = s.getBoundingClientRect();
    const k = Math.min(r.width / W, r.height / H), x = r.left - R.left + (r.width - W * k) / 2, y = r.top - R.top + (r.height - H * k) / 2;
    frame.style.transform = `translate(${x}px,${y}px) scale(${k})`;
    sub.style.left = x + 'px'; sub.style.width = W * k + 'px'; sub.style.right = 'auto';
    sub.style.top = y + H * k * .86 + 'px'; sub.style.fontSize = Math.max(12, 44 * k) + 'px';
  }
  const tl = () => { const T = win && win.__timelines; return T && (T[C.id] || Object.values(T)[0]); };
  const playing = () => { const a = document.getElementById('mix'); return a && !a.paused; };
  const rate = () => { const a = document.getElementById('mix'); return a ? a.playbackRate : 1; };

  function show(t) {
    const T = tl(); if (!T) return;
    T.seek(t, false);
    for (const c of clips) {
      const a = +c.dataset.start || 0, d = +c.dataset.duration || C.duration;
      c.style.visibility = t >= a && t < a + d ? 'visible' : 'hidden';
    }
    for (const m of media) {
      const c = m.closest('.clip') || m, a = +c.dataset.start || 0, d = +c.dataset.duration || C.duration;
      const want = t - a + (+(m.dataset.mediaStart || c.dataset.mediaStart) || 0), on = t >= a && t < a + d;
      if (!on) { if (!m.paused) m.pause(); continue; }
      if (playing()) {
        if (Math.abs(m.playbackRate - rate()) > 1e-3) m.playbackRate = rate();
        if (m.paused) { m.currentTime = want; m.play().catch(() => {}); }
        else if (Math.abs(m.currentTime - want) > .2 && !m.seeking) m.currentTime = want;
      } else {
        if (!m.paused) m.pause();
        if (Math.abs(m.currentTime - want) > .02 && !m.seeking) m.currentTime = want;
      }
    }
  }
  function captionAt(t) { const c = (C.captions || []).find(s => s[0] <= t && t < s[1]); return c ? c[2] : ''; }

  // 播放器在「定位」后会等素材到位；片段里的视频也一起等
  const settled = E.videosSettled;
  E.videosSettled = async ms => {
    await settled(ms);
    const ps = media.filter(m => (m.seeking || m.readyState < 2) && (m.closest('.clip') || m).style.visibility !== 'hidden')
      .map(m => new Promise(r => { const done = () => r(); m.addEventListener('seeked', done, { once: true }); m.addEventListener('loadeddata', done, { once: true }); setTimeout(done, 3000); }));
    await Promise.all(ps);
  };
  const probe = E.probeVideos;
  E.probeVideos = async ms => { await loaded; return probe(ms); };   // 播放器载入时等片段就绪
  const busy = E.busy;
  E.busy = () => busy() || media.some(m => m.seeking);

  window.VIDEO_PROJECT = {
    id: 'hf-' + C.id, title: C.title, subtitle: 'HYPERFRAMES 动画片段 · HTML 预览', mark: 'HF',
    note: '片段在 clip/ 里，和渲染器看到的是同一份 HTML。确认没问题后再 npx hyperframes render 出成片。',
    duration: C.duration, fps: C.fps, audio: C.audio, shots: C.shots, captions: C.captions || [], images: [], fonts: [],
    draw(ctx, t, showSubs) {
      if (!frame) mount();
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      show(t);
      const s = showSubs && captionAt(t); sub.textContent = s || ''; sub.style.display = s ? 'block' : 'none';
    },
  };
  // 播放器外壳一插进页面就挂上 iframe（不用等第一次 draw）
  const ready = () => document.getElementById('c') ? mount() : requestAnimationFrame(ready);
  window.HF_MOUNT = () => { if (!frame) ready(); };
})();
