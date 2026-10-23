// 「做不到 / 不行 / 出问题」标记组件（阿亮 2026-10-23：少用大红叉，不要看起来很 AI；按场景换不同的小图标 + 小动效）
// 风格：扁平线框 / 实心小图标（参考阿亮给的圆圈叉、警告三角），白色贴纸底 + 软投影，叠在任何背景上都看得清。
// 全部是时间的纯函数：mark*(ctx, t, a, x, y, size, {b}) —— a 出现时刻，b 消失时刻（可省略）。
'use strict';

const MARK = {warn: [251, 101, 71], gray: [139, 144, 153], ink: [43, 47, 54], ok: [24, 180, 107]};

// 通用进出：弹入（backOut）+ 淡出；返回 {s 缩放, al 透明度, ui 进场进度} 或 null
function markEnv(t, a, b, dIn = .35, dOut = .3) {
  const ui = seg(t, a, a + dIn), uo = b == null ? 0 : seg(t, b, b + dOut);
  if (ui <= 0 || uo >= 1) return null;
  return {s: backOut(ui, 2.2) * (1 - .15 * uo), al: clamp(ui * 3, 0, 1) * (1 - uo), ui};
}
// 白色圆形贴纸底
function stickerDisc(ctx, r) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = r * .5; ctx.shadowOffsetY = r * .14;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); ctx.restore();
}

// ① 圆圈叉（线框）：圆环一笔画出 → 叉两笔画出。用于「不推荐 / 不可用」
function markCircleX(ctx, t, a, x, y, r = 70, {b = null, col = MARK.warn} = {}) {
  const e = markEnv(t, a, b); if (!e) return;
  const ring = eOut(seg(t, a + .05, a + .4), 3), x1 = eOut(seg(t, a + .35, a + .55), 2), x2 = eOut(seg(t, a + .5, a + .7), 2);
  ctx.save(); ctx.globalAlpha *= e.al; ctx.translate(x, y); ctx.scale(e.s, e.s);
  stickerDisc(ctx, r * 1.12);
  ctx.lineCap = 'round'; ctx.strokeStyle = E.rgb(col); ctx.lineWidth = r * .13;
  ctx.beginPath(); ctx.arc(0, 0, r * .82, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); ctx.stroke();
  const d = r * .34;
  if (x1 > 0) { ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(lerp(-d, d, x1), lerp(-d, d, x1)); ctx.stroke(); }
  if (x2 > 0) { ctx.beginPath(); ctx.moveTo(d, -d); ctx.lineTo(lerp(d, -d, x2), lerp(-d, d, x2)); ctx.stroke(); }
  ctx.restore();
}

// ② 警告三角（实心橙 + 白色感叹号）：从上方落下弹一下，再左右摇两下。用于「有风险 / 不可靠」
function markWarn(ctx, t, a, x, y, s = 80, {b = null} = {}) {
  const e = markEnv(t, a, b, .4); if (!e) return;
  const drop = (1 - eOut(seg(t, a, a + .4), 3)) * -60;
  const wob = Math.sin((t - a - .35) * 14) * 9 * Math.max(0, 1 - (t - a - .35) / 1.1) * (t > a + .35 ? 1 : 0);
  ctx.save(); ctx.globalAlpha *= e.al; ctx.translate(x, y + drop); ctx.rotate(wob * Math.PI / 180); ctx.scale(e.s, e.s);
  const h = s * .9, w = s;
  const tri = () => { ctx.beginPath(); ctx.moveTo(0, -h * .62); ctx.lineTo(w * .58, h * .42); ctx.lineTo(-w * .58, h * .42); ctx.closePath(); };
  ctx.lineJoin = 'round';
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = s * .35; ctx.shadowOffsetY = s * .1;
  tri(); ctx.lineWidth = s * .26; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();       // 白边贴纸
  tri(); ctx.lineWidth = s * .12; ctx.strokeStyle = E.rgb(MARK.warn); ctx.stroke(); ctx.fillStyle = E.rgb(MARK.warn); ctx.fill();
  ctx.fillStyle = '#fff'; rr(ctx, -s * .055, -h * .3, s * .11, h * .42, s * .05); ctx.fill();
  ctx.beginPath(); ctx.arc(0, h * .25, s * .07, 0, 7); ctx.fill();
  ctx.restore();
}

// ③ 小虫子（出 bug）：沿路径爬过来（腿交替摆动、身体朝前进方向），到位后原地抖触角；out 时被弹飞（翻滚 + 飞出 + 淡出）
// path: [[x, y], ...] 屏幕坐标；a 开始爬，arrive 到达；out 被弹走（可省略）
function bugPos(path, u) {
  const L = []; let tot = 0;
  for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L.push(d); tot += d; }
  let s = u * tot;
  for (let i = 0; i < L.length; i++) {
    if (s <= L[i] || i === L.length - 1) { const f = L[i] ? clamp(s / L[i], 0, 1) : 0, [x0, y0] = path[i], [x1, y1] = path[i + 1];
      return [lerp(x0, x1, f), lerp(y0, y1, f), Math.atan2(y1 - y0, x1 - x0)]; }
    s -= L[i];
  }
  return [...path[path.length - 1], 0];
}
function drawBug(ctx, size, walk, t) {
  const S = size / 100;
  ctx.save(); ctx.scale(S, S); ctx.lineCap = 'round';
  // 腿：三对，左右交替摆动
  ctx.strokeStyle = E.rgb(MARK.ink); ctx.lineWidth = 7;
  for (const [i, by] of [[0, -18], [1, 4], [2, 24]]) {
    for (const side of [-1, 1]) {
      const ph = Math.sin(t * 26 + i * 2.1 + (side > 0 ? Math.PI : 0)) * 10 * walk;
      ctx.beginPath(); ctx.moveTo(side * 18, by); ctx.quadraticCurveTo(side * 40, by + ph * .4 - 4, side * 50, by + 10 + ph); ctx.stroke();
    }
  }
  // 触角
  ctx.lineWidth = 5; const tw = Math.sin(t * 9) * 5;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 8, -44); ctx.quadraticCurveTo(side * 20, -64, side * 30 + tw * side, -70); ctx.stroke(); }
  // 头 + 身体（橙色壳、中缝、两颗斑点）
  ctx.fillStyle = E.rgb(MARK.ink); ctx.beginPath(); ctx.ellipse(0, -38, 17, 14, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.beginPath(); ctx.ellipse(0, 4, 32, 40, 0, 0, 7); ctx.fillStyle = E.rgb(MARK.warn); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = E.rgb(MARK.ink); ctx.beginPath(); ctx.ellipse(0, 4, 32, 40, 0, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 44); ctx.stroke();
  ctx.fillStyle = E.rgb(MARK.ink);
  for (const [px, py, pr] of [[-15, -6, 7], [15, -6, 7], [-13, 20, 6], [13, 20, 6]]) { ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-12, -18, 6, 9, -.4, 0, 7); ctx.fill();   // 高光
  ctx.restore();
}
function markBug(ctx, t, a, arrive, path, {size = 70, out = null, b = null} = {}) {
  if (t < a) return;
  const u = eInOut(seg(t, a, arrive)), [x, y, ang] = bugPos(path, u);
  const walk = u < 1 ? 1 : .15;                       // 到位后只轻轻动
  let al = b == null ? 1 : 1 - seg(t, b, b + .3);
  ctx.save(); ctx.translate(x, y);
  if (out != null && t > out) {                        // 被弹飞
    const k = seg(t, out, out + .7); if (k >= 1) { ctx.restore(); return; }
    ctx.translate(260 * k, -320 * k + 380 * k * k); ctx.rotate(k * 9); al *= 1 - k;
  }
  ctx.globalAlpha *= al * clamp((t - a) * 5, 0, 1);
  ctx.rotate(ang + Math.PI / 2); drawBug(ctx, size, walk, t);
  ctx.restore();
}

// ④ 电池耗空：电量从绿色掉到红色见底，然后外框闪两下。用于「余额用尽 / 没电了」
function markBattery(ctx, t, a, x, y, s = 110, {b = null} = {}) {
  const e = markEnv(t, a, b); if (!e) return;
  const lv = 1 - eInOut(seg(t, a + .2, a + .8)), blink = t > a + .8 && Math.floor((t - a - .8) / .16) % 2 === 0 && t < a + 1.45;
  ctx.save(); ctx.globalAlpha *= e.al; ctx.translate(x, y); ctx.scale(e.s, e.s);
  stickerDisc(ctx, s * .78);
  const w = s * .86, h = s * .46;
  ctx.lineJoin = 'round'; ctx.lineWidth = s * .07; ctx.strokeStyle = blink ? E.rgb(MARK.warn) : E.rgb(MARK.ink);
  rr(ctx, -w / 2 - s * .04, -h / 2, w, h, s * .08); ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle; rr(ctx, w / 2 - s * .04 + s * .02, -h * .2, s * .07, h * .4, s * .02); ctx.fill();
  const col = lv > .5 ? MARK.ok : [Math.round(lerp(251, 24, lv * 2)), Math.round(lerp(101, 180, lv * 2)), Math.round(lerp(71, 107, lv * 2))];
  const iw = (w - s * .16) * Math.max(lv, .06);
  ctx.fillStyle = E.rgb(lv > .08 ? col : MARK.warn); rr(ctx, -w / 2 + s * .04, -h / 2 + s * .08, iw, h - s * .16, s * .03); ctx.fill();
  ctx.restore();
}

// ⑤ 断网：WiFi 三道弧 + 点先出现，斜杠划过，弧从外到内依次熄灭。用于「连不上网 / 没信号」
function markNoWifi(ctx, t, a, x, y, s = 110, {b = null} = {}) {
  const e = markEnv(t, a, b); if (!e) return;
  const cut = eOut(seg(t, a + .3, a + .55), 2);
  ctx.save(); ctx.globalAlpha *= e.al; ctx.translate(x, y); ctx.scale(e.s, e.s);
  stickerDisc(ctx, s * .78);
  ctx.lineCap = 'round'; ctx.lineWidth = s * .09;
  for (let i = 0; i < 3; i++) {
    const off = seg(t, a + .5 + (2 - i) * .12, a + .62 + (2 - i) * .12);      // 外圈先灭
    ctx.strokeStyle = E.rgb(off > .5 ? [205, 208, 214] : MARK.ink);
    ctx.beginPath(); ctx.arc(0, s * .24, s * (.18 + i * .16), -Math.PI * .75, -Math.PI * .25); ctx.stroke();
  }
  ctx.fillStyle = E.rgb(MARK.ink); ctx.beginPath(); ctx.arc(0, s * .24, s * .055, 0, 7); ctx.fill();
  if (cut > 0) {
    ctx.lineWidth = s * .1; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-s * .4, -s * .4); ctx.lineTo(lerp(-s * .4, s * .4, cut), lerp(-s * .4, s * .4, cut)); ctx.stroke();
    ctx.lineWidth = s * .065; ctx.strokeStyle = E.rgb(MARK.warn); ctx.stroke();
  }
  ctx.restore();
}

// ⑥ 失效胶囊：轻抖 → 变灰 → 裂纹划开 → 两半错开下沉 → 掉碎屑。用于「拿不到 / 用不了」的一组名字
// k 0 → 1（0–0.3 抖动 + 变灰；0.12–0.45 裂纹从上往下；0.45–1 错开下沉、碎屑掉落）
const CRACK = [[-8, -72], [10, -38], [-7, -10], [12, 18], [-3, 44], [6, 72]];
function brokenPill(ctx, text, x, y, sc, k, t, seed) {
  const W2 = 130, H2 = 70, PAD = 24;
  const c = E.tmp('pill_' + seed, 2 * (W2 + PAD), 2 * (H2 + PAD)), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.translate(W2 + PAD, H2 + PAD);
  const gray = eOut(seg(k, 0, .35), 2);
  const mix = (a, b) => a.map((v, j) => Math.round(lerp(v, b[j], gray)));
  rr(g, -W2, -H2, 2 * W2, 2 * H2, 36); g.fillStyle = E.rgb(mix([255, 255, 255], [200, 203, 209]), 1, .97); g.fill();
  g.font = '72px Black'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = E.rgb(mix([21, 23, 28], [120, 125, 134])); g.fillText(text, 0, 4);
  const cr = seg(k, .12, .45);
  if (cr > 0) {
    const segs = CRACK.length - 1, upto = cr * segs;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    for (const [col, lw, dx] of [['rgba(255,255,255,.85)', 3, 2], ['#4b5059', 4, 0]]) {
      g.beginPath(); g.moveTo(CRACK[0][0] + dx, CRACK[0][1]);
      for (let j = 1; j <= Math.ceil(upto); j++) {
        const f = Math.min(1, upto - (j - 1)), [px, py] = CRACK[j - 1], [qx, qy] = CRACK[j];
        g.lineTo(lerp(px, qx, f) + dx, lerp(py, qy, f));
      }
      g.strokeStyle = col; g.lineWidth = lw; g.stroke();
    }
    if (upto > 2) { g.beginPath(); g.moveTo(-7, -10); g.lineTo(-7 - 26 * Math.min(1, upto - 2), -22); g.strokeStyle = '#4b5059'; g.lineWidth = 2.5; g.stroke(); }
    if (upto > 3.5) { g.beginPath(); g.moveTo(12, 18); g.lineTo(12 + 30 * Math.min(1, (upto - 3.5) / 1.5), 30); g.stroke(); }
    g.restore();
  }
  const sh = (1 - seg(k, 0, .3)) * (k > 0 ? 1 : 0), dx = Math.sin(t * 70 + seed) * 7 * sh;
  const sp = eOut(seg(k, .45, 1), 3);
  ctx.save(); ctx.translate(x + dx, y); ctx.scale(sc, sc); ctx.globalAlpha *= 1 - .08 * gray;
  const half = (side) => {
    ctx.save();
    ctx.translate(side * 7 * sp, (side < 0 ? 3 : 9) * sp); ctx.rotate(side * .045 * sp);
    ctx.beginPath(); ctx.moveTo(side * (W2 + PAD), -H2 - PAD);
    for (const [px, py] of CRACK) ctx.lineTo(px, py);
    ctx.lineTo(CRACK[CRACK.length - 1][0], H2 + PAD); ctx.lineTo(side * (W2 + PAD), H2 + PAD); ctx.closePath(); ctx.clip();
    ctx.drawImage(c, -W2 - PAD, -H2 - PAD); ctx.restore();
  };
  if (sp <= 0) ctx.drawImage(c, -W2 - PAD, -H2 - PAD); else { half(-1); half(1); }
  if (sp > 0) {
    const r = E.rng(seed * 7 + 3);
    for (let j = 0; j < 4; j++) {
      const [px, py] = CRACK[1 + j], vx = (r() - .5) * 40, sz = 4 + r() * 5;
      ctx.save(); ctx.globalAlpha *= 1 - sp; ctx.translate(px + vx * sp, py + 160 * sp * sp + 20 * sp); ctx.rotate(r() * 3 + sp * 4);
      ctx.fillStyle = '#9aa0aa'; ctx.beginPath(); ctx.moveTo(-sz, -sz * .6); ctx.lineTo(sz, -sz * .3); ctx.lineTo(0, sz); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}
