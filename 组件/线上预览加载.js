// Project-owned adapter. draw(ctx, seconds, subtitles) must be deterministic.
window.VIDEO_PROJECT={
 id:D.id,title:D.title,duration:D.DUR,fps:D.FPS,audio:D.audio,
 shots:D.shots.map(s=>({start:s.start+D.PRE,end:s.end+D.PRE,name:s.text})),
 captions:D.subs.map(([start,text,,end])=>[start+D.PRE,end+D.PRE,text]),
 images:window.ASSETS||[],fonts:D.fonts||[],draw:frame
};

// ---- 线上预览加载策略（本地审片 127.0.0.1 不受影响）--------------------------------------
// 问题：播放器启动时会同时预载全部视频（24 个约 90MB），网速一般时开头那段口播被挤占带宽，
// 15 秒内定位不到就整页报「视频定位超时」。这里改成：
// 1) 启动时不一次性预载全部视频；2) 定位时网慢就多等（最多 2 分钟），不报错中断；
// 3) 就绪后按出场顺序逐个在后台预热其余视频。
(function () {
  if (location.protocol === 'file:' || /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return;
  E.probeVideos = async () => [];
  const settle = E.videosSettled;
  E.videosSettled = async (ms) => {
    const t0 = performance.now();
    for (;;) {
      try { return await settle(Math.max(ms || 0, 20000)); }
      catch (e) { if (performance.now() - t0 > 120000) throw e; }
    }
  };
  const ORDER = ['aroll_a', 'person_a', 'tower_op', 'game_op', 'mv_op', 'xuanyun', 'mv_gpt', 'mv_ds', 'tower_gpt', 'tower_ds',
    'store_ds', 'store_gpt', 'store_op', 'coast_gpt', 'coast_op', 'coast_ds', 'game_ds', 'game_gpt', 'aroll_b',
    'login_acc', 'login_api', 'codex', 'person_b'];
  const keys = ORDER.filter(k => k in window.VSRC).concat(Object.keys(window.VSRC).filter(k => !ORDER.includes(k)));
  const warm = async () => {
    for (const k of keys) {
      const url = new URL(window.VSRC[k], location.href).href;
      if (E.allVideos().some(v => v.src === url && v.readyState >= 3)) continue;
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = url;
      await new Promise(r => { const done = () => r(); v.addEventListener('canplaythrough', done, {once: true}); v.addEventListener('error', done, {once: true}); setTimeout(done, 25000); });
    }
  };
  const wait = () => window.READY ? warm() : setTimeout(wait, 500);
  setTimeout(wait, 500);
})();
