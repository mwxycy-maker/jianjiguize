// 本期通用组件：时间映射、口播画面、秋芝式人像、差评君式窗口卡片、徽章、大标题、数据水印。
// 所有动画只由时间 t 决定（纯函数），可任意拖动、逐帧导出。
'use strict';
const {W, H, clamp, lerp, seg, ease, easeOut, easeIn, backOut} = E;
const PRE = D.PRE, EV = D.EV, X = D.X || {}, VIS = {};
const S = Object.fromEntries(D.shots.map(s => [s.i, s]));
const shotAt = t => D.shots.find(s => s.start <= t && t < s.end);
E.setVideoSources(window.VSRC);

// ------------------------------------------------------------------ 缓动
const eOut = (u, p = 4) => easeOut(u, p);                  // 差评君：快进慢停
const eInOut = u => { u = clamp(u, 0, 1); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const spring = (u, k = 1.2) => { u = clamp(u, 0, 1); return 1 - Math.exp(-6 * u) * Math.cos(k * 6.3 * u) * (1 - u * .2); };
// 进出包络：a 开始进入（dIn 秒），b 开始退出（dOut 秒）。返回 [进入进度, 退出进度]
const env = (t, a, b, dIn = .55, dOut = .45) => [seg(t, a, a + dIn), b == null ? 0 : seg(t, b, b + dOut)];

// ------------------------------------------------------------------ 口播时间映射（成片时间 → 口播源时间）
// X.pieces: [源入, 源出, 成片入]；落在插入段（MV、停顿）里时冻结在上一段末尾
function srcAt(t) {
  const P = X.pieces; let last = P[0][0];
  for (const [a, b, at] of P) {
    if (t < at) return last;
    if (t <= at + (b - a)) return a + (t - at);
    last = b;
  }
  return last;
}
// 口播画面：分两段文件，175 秒前用 a，之后用 b（b 从源 170 秒开始）
function arollFrame(t) {
  const s = srcAt(t);
  return s < 175 ? E.video('aroll_a', s) : E.video('aroll_b', s - 170);
}
const AR_CROP = [0, 10, 854, 462];                          // 裁掉源片上下黑边
function aroll(ctx, t, {x = 0, y = 0, w = W, h = H, zoom = 1, fx = .5, fy = .3} = {}) {
  const v = arollFrame(t); if (!E.ready(v)) return;
  const [sw, sh] = [AR_CROP[2] / zoom, AR_CROP[3] / zoom];
  const crop = [AR_CROP[0] + (AR_CROP[2] - sw) * fx, AR_CROP[1] + (AR_CROP[3] - sh) * fy, sw, sh];
  E.cover(ctx, v, x, y, w, h, .5, .5, crop);
}

// 人物抠像层：并排视频（左原画 | 右遮罩），把字放到人物后面时，最后再盖上这一层
// key: 抠像素材，from: 该素材对应的口播源起点
function personCut(ctx, t, key, from, a = 1) {
  const s = srcAt(t); const v = E.video(key, Math.max(0, s - from)); if (!E.ready(v) || a <= 0) return;
  const [vw, vh] = E.sizeOf(v); const w = vw / 2;
  const c = E.tmp('pcut', w, vh), g = c.getContext('2d', {willReadFrequently: true});
  g.globalCompositeOperation = 'copy'; g.drawImage(v, 0, 0, w, vh, 0, 0, w, vh);
  const im = g.getImageData(0, 0, w, vh);
  const m = E.tmp('pmask', w, vh), gm = m.getContext('2d', {willReadFrequently: true});
  gm.globalCompositeOperation = 'copy'; gm.drawImage(v, w, 0, w, vh, 0, 0, w, vh);
  const mk = gm.getImageData(0, 0, w, vh).data, px = im.data;
  for (let i = 3; i < px.length; i += 4) px[i] = mk[i - 3];
  g.putImageData(im, 0, 0);
  ctx.save(); ctx.globalAlpha *= a; E.cover(ctx, c, 0, 0, W, H, .5, .5, AR_CROP); ctx.restore();
}

// ------------------------------------------------------------------ 背景：差评君浅灰渐变 + 网点 + 柔光（不平涂）
function bgLight(ctx, t, tint = [236, 238, 242]) {
  const g = ctx.createRadialGradient(W * .5, H * .38, 80, W * .5, H * .5, W * .75);
  g.addColorStop(0, E.rgb(tint, 1.04)); g.addColorStop(.55, E.rgb(tint, .97)); g.addColorStop(1, E.rgb(tint, .80));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 缓慢漂移的两团柔光
  for (const [k, cx, cy, r, col] of [[0, .22, .25, 620, [255, 255, 255]], [1, .8, .72, 700, [214, 222, 236]]]) {
    const ox = Math.sin(t * .23 + k * 2) * 60, oy = Math.cos(t * .19 + k) * 40;
    const rg = ctx.createRadialGradient(W * cx + ox, H * cy + oy, 0, W * cx + ox, H * cy + oy, r);
    rg.addColorStop(0, E.rgb(col, 1, .55)); rg.addColorStop(1, E.rgb(col, 1, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  dotGrid(ctx, [120, 128, 140], .13);
}
function bgDark(ctx, t, c1 = [14, 20, 38], c2 = [6, 9, 18], glow = [60, 110, 255]) {
  const g = ctx.createRadialGradient(W * .5, H * .45, 60, W * .5, H * .5, W * .8);
  g.addColorStop(0, E.rgb(c1)); g.addColorStop(1, E.rgb(c2)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const ox = Math.sin(t * .2) * 80;
  const rg = ctx.createRadialGradient(W * .5 + ox, H * .55, 0, W * .5 + ox, H * .55, 900);
  rg.addColorStop(0, E.rgb(glow, 1, .22)); rg.addColorStop(1, E.rgb(glow, 1, 0)); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  dotGrid(ctx, [140, 160, 210], .10);
}
let _dots = null;
function dotGrid(ctx, col, a) {
  if (!_dots) {
    _dots = document.createElement('canvas'); _dots.width = W; _dots.height = H; const g = _dots.getContext('2d');
    g.fillStyle = '#fff';
    for (let y = 18; y < H; y += 36) for (let x = 18; x < W; x += 36) { g.beginPath(); g.arc(x, y, 1.7, 0, 7); g.fill(); }
  }
  const c = E.tmp('dots_col'); const g = c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.drawImage(_dots, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = E.rgb(col); g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = a; ctx.drawImage(c, 0, 0); ctx.restore();
}
function vignette(ctx, k = .35) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ 圆角路径
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ------------------------------------------------------------------ 秋芝式人像：全屏 ↔ 左下角圆形头像（形状连续变形）
const HOST_CIRCLE = {cx: 196, cy: 870, r: 138};
// u: 0 = 全屏口播，1 = 左下角圆窗。中间是圆角矩形连续收缩。
function hostMorph(ctx, t, u, {c = HOST_CIRCLE, ring = true} = {}) {
  u = clamp(u, 0, 1); if (u <= 0) { aroll(ctx, t); return; }
  const k = eInOut(u);
  const x = lerp(0, c.cx - c.r, k), y = lerp(0, c.cy - c.r, k), w = lerp(W, 2 * c.r, k), h = lerp(H, 2 * c.r, k), r = lerp(0, c.r, k);
  // 源画面裁切：从整帧过渡到脸部正方形
  const v = arollFrame(t); if (!E.ready(v)) return;
  const faceS = 250, fcx = 436, fcy = 150;
  const cw = lerp(AR_CROP[2], faceS, k), ch = lerp(AR_CROP[3], faceS, k);
  const cx0 = lerp(AR_CROP[0] + AR_CROP[2] / 2, fcx, k), cy0 = lerp(AR_CROP[1] + AR_CROP[3] / 2, fcy, k);
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${.45 * k})`; ctx.shadowBlur = 40 * k; ctx.shadowOffsetY = 14 * k;
  rr(ctx, x, y, w, h, r); ctx.fillStyle = '#111'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.clip(); E.cover(ctx, v, x, y, w, h, .5, .5, [cx0 - cw / 2, cy0 - ch / 2, cw, ch]);
  ctx.restore();
  if (ring && k > .02) {
    ctx.save(); rr(ctx, x, y, w, h, r); ctx.lineWidth = 8 * k; ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.stroke();
    rr(ctx, x - 7 * k, y - 7 * k, w + 14 * k, h + 14 * k, r + 7 * k); ctx.lineWidth = 3 * k; ctx.strokeStyle = `rgba(77,107,254,${.85 * k})`; ctx.stroke(); ctx.restore();
  }
}
// 圆形头像弹出（不从全屏变形时用）：a = 出现时刻，b = 消失时刻
function hostPop(ctx, t, a, b, c = HOST_CIRCLE) {
  const [ui, uo] = env(t, a, b, .5, .35); if (ui <= 0 || uo >= 1) return;
  const s = backOut(ui, 1.6) * (1 - eInOut(uo));
  if (s <= .01) return;
  ctx.save(); ctx.translate(c.cx, c.cy); ctx.scale(s, s); ctx.translate(-c.cx, -c.cy);
  hostMorph(ctx, t, 1, {c}); ctx.restore();
}

// ------------------------------------------------------------------ 差评君式窗口卡片（白边粗黑框 + 透视 + 甩进场）
// 把内容画进离屏卡片，再整体透视贴到屏幕；所有窗口统一角度和进场方向 → 横屏一致感
const CARD_STYLE = {border: 9, bezel: 14, radius: 30, col: '#16181d'};
function cardCanvas(key, w, h, drawContent, style = CARD_STYLE) {
  const c = E.tmp('card_' + key, w, h), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
  const {border: b, bezel: z, radius: r} = style;
  rr(g, 0, 0, w, h, r); g.fillStyle = style.col; g.fill();
  rr(g, b, b, w - 2 * b, h - 2 * b, r - b); g.fillStyle = '#fbfbfc'; g.fill();
  const ix = b + z, iy = b + z, iw = w - 2 * (b + z), ih = h - 2 * (b + z);
  g.save(); rr(g, ix, iy, iw, ih, Math.max(6, r - b - z)); g.clip(); g.fillStyle = '#0d0f14'; g.fillRect(ix, iy, iw, ih);
  drawContent(g, ix, iy, iw, ih); g.restore();
  return c;
}
// 统一的入场：从远处小、倾斜状态飞来，减速落位（差评君）。dir=1 从右下来，-1 从左下来
function flyPose(u, dir = 1) {
  const k = eOut(u, 4);
  return {s: lerp(.32, 1, k), ry: lerp(-38 * dir, 0, k), rx: lerp(22, 0, k), rz: lerp(7 * dir, 0, k), dx: lerp(380 * dir, 0, k), dy: lerp(260, 0, k), a: clamp(u * 3, 0, 1)};
}
// 统一的退场：带旋转甩出画面下方（差评君卡片翻落）
function exitPose(u, dir = 1) {
  const k = easeIn(u, 2.4);
  return {s: lerp(1, .82, k), ry: lerp(0, 18 * dir, k), rx: lerp(0, -28, k), rz: lerp(0, -16 * dir, k), dx: lerp(0, -260 * dir, k), dy: lerp(0, 1100, k), a: 1};
}
// 平面进出场（第②段起演示不用 3D 视角）：轻微放大 + 上浮 + 淡入；退场缩小下沉淡出
function flatPose(u) { const k = eOut(u, 4); return {s: lerp(.88, 1, k), ry: 0, rx: 0, rz: 0, dx: 0, dy: lerp(70, 0, k), a: clamp(u * 2.2, 0, 1)}; }
function flatExit(u) { const k = easeIn(u, 2); return {s: lerp(1, .9, k), ry: 0, rx: 0, rz: 0, dx: 0, dy: lerp(0, 60, k), a: 1 - k}; }
// 画一张窗口卡片。o: {cx, cy, w, h, t, a(进场时刻), b(退场时刻), dir, ry, rx, rz, scale, content(g,x,y,w,h), key, mark, flat}
function windowCard(ctx, o) {
  const t = o.t; const ui = o.a == null ? 1 : seg(t, o.a, o.a + (o.dIn || .7)); const uo = o.b == null ? 0 : seg(t, o.b, o.b + (o.dOut || .55));
  if (ui <= 0 || uo >= 1) return null;
  const p1 = o.flat ? flatPose(ui) : flyPose(ui, o.dir || 1), p2 = o.flat ? flatExit(uo) : exitPose(uo, o.exitDir || o.dir || 1);
  const scale = (o.scale || 1) * p1.s * p2.s;
  const ry = (o.ry || 0) + p1.ry + p2.ry, rx = (o.rx || 0) + p1.rx + p2.rx, rz = (o.rz || 0) + p1.rz + p2.rz;
  const cx = o.cx + p1.dx + p2.dx, cy = o.cy + p1.dy + p2.dy;
  const c = cardCanvas(o.key, o.w, o.h, o.content, o.style || CARD_STYLE);
  const M = E.persp(ctx, c, o.w, o.h, cx, cy, {scale, ry, rx, rz, a: p1.a * (p2.a == null ? 1 : p2.a) * (o.alpha == null ? 1 : o.alpha), radius: (o.style || CARD_STYLE).radius, shadowK: o.shadowK == null ? .55 : o.shadowK, n: 12});
  if (o.mark && ui > .6) dataMark(ctx, M, o.w, o.h, o.mark, clamp((ui - .6) / .4, 0, 1) * (1 - uo) * (o.alpha == null ? 1 : o.alpha));
  return M;
}
// 内容：视频 / 图片铺满窗口
const fillVideo = (key, ts, rate = 1, fx = .5, fy = .5, crop = null) => (g, x, y, w, h) => {
  if (!(key in window.VSRC)) { g.fillStyle = '#1b1f29'; g.fillRect(x, y, w, h); return; }
  const v = E.video(key, ts, rate); if (E.ready(v)) E.cover(g, v, x, y, w, h, fx, fy, crop);
};
const fillImage = (name, fx = .5, fy = .5, crop = null, bg = '#fff') => (g, x, y, w, h) => {
  g.fillStyle = bg; g.fillRect(x, y, w, h); const im = E.img(name); if (E.ready(im)) E.cover(g, im, x, y, w, h, fx, fy, crop);
};
const fitImage = (name, bg = '#fff', pad = 0) => (g, x, y, w, h) => {
  g.fillStyle = bg; g.fillRect(x, y, w, h); const im = E.img(name); if (!E.ready(im)) return;
  const [iw, ih] = E.sizeOf(im); const s = Math.min((w - 2 * pad) / iw, (h - 2 * pad) / ih);
  g.drawImage(im, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
};

// ------------------------------------------------------------------ 数据小水印（文档里的用时 / Token / 金额）
// 贴在窗口卡片右下角，跟着透视一起动；半透明深色胶囊
function dataMark(ctx, M, w, h, d, a = 1) {
  if (a <= .01 || !d) return;
  const txt = `${d.time}  ·  ${d.tok}M Token  ·  ¥${d.cost}`;
  const [px, py] = E.mapPt(M, w - 40, h - 40);
  const [qx, qy] = E.mapPt(M, w - 40 - 100, h - 40);
  const sc = clamp(Math.hypot(px - qx, py - qy) / 100, .35, 1.2);
  ctx.save(); ctx.globalAlpha *= a * .92; ctx.translate(px, py); ctx.scale(sc, sc);
  ctx.font = '25px Black'; let fs = 25, tw = ctx.measureText(txt).width;
  const maxW = w - 80 - 28; if (tw > maxW) { fs = Math.max(14, 25 * maxW / tw); ctx.font = `${fs.toFixed(1)}px Black`; tw = ctx.measureText(txt).width; }
  rr(ctx, -tw - 28, -46, tw + 28, 42, 21); ctx.fillStyle = 'rgba(10,12,18,.58)'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(txt, -14, -25);
  ctx.restore();
}

// ------------------------------------------------------------------ 模型徽章：白色圆 + logo + 名字
const MODELS = {
  ds: {logo: 'logo_ds', name: 'DeepSeek V4.1 Flash', col: [77, 107, 254]},
  gpt: {logo: 'logo_gpt', name: 'GPT-6.1 Sol', col: [16, 163, 127]},
  astra: {logo: 'logo_gpt', name: 'GPT-6 Astra', col: [16, 163, 127]},
  op: {logo: 'logo_claude', name: 'Claude Opus 5.5', col: [217, 119, 87]},
  dsh: {logo: 'logo_dsh', name: 'DeepSeek Harness', col: [40, 40, 46]},
};
// side: 名字放在徽章哪边（'right' | 'left' | 'below' | 'none'）；theme: 'dark' 字白，'light' 字黑
function badge(ctx, m, x, y, r, a = 1, {side = 'right', theme = 'dark', s = 1, rot = 0, nameSize = 0, name = null} = {}) {
  if (a <= .01 || s <= .01) return;
  const M = MODELS[m]; const im = E.img(M.logo);
  ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(x, y); ctx.scale(s, s); if (rot) ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(3, r * .06); ctx.strokeStyle = E.rgb(M.col); ctx.stroke();
  if (E.ready(im)) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * .9, 0, 7); ctx.clip(); const q = r * 1.52; ctx.drawImage(im, -q / 2, -q / 2, q, q); ctx.restore(); }
  if (side !== 'none') {
    const fs = nameSize || Math.round(r * .5); ctx.font = `${fs}px Black`; ctx.textBaseline = 'middle';
    const label = name || M.name;
    let tx = 0, ty = 0;
    if (side === 'right') { ctx.textAlign = 'left'; tx = r + 24; }
    else if (side === 'left') { ctx.textAlign = 'right'; tx = -r - 24; }
    else { ctx.textAlign = 'center'; ty = r + fs * .95; }
    ctx.lineJoin = 'round'; ctx.lineWidth = fs * .2;
    ctx.strokeStyle = theme === 'dark' ? 'rgba(8,10,16,.85)' : 'rgba(255,255,255,.9)'; ctx.strokeText(label, tx, ty);
    ctx.fillStyle = theme === 'dark' ? '#fff' : '#15171c'; ctx.fillText(label, tx, ty);
  }
  ctx.restore();
}
// 徽章弹出：a 出现、b 消失，带弹性
function badgePop(ctx, t, m, x, y, r, a, b, opt = {}) {
  const [ui, uo] = env(t, a, b, .45, .3); if (ui <= 0 || uo >= 1) return;
  const s = backOut(ui, 2.2) * (1 - easeIn(uo, 2));
  badge(ctx, m, x, y, r, clamp(ui * 4, 0, 1) * (1 - uo), {...opt, s: s * (opt.s || 1)});
}

// ------------------------------------------------------------------ 大标题：单独出场，砸下来 + 震动
function bigTitle(ctx, text, t, a, b, {y = H * .46, size = 230, col = '#15171c', stroke = '#fff', font = 'Title', sub = null, glow = null} = {}) {
  const [ui, uo] = env(t, a, b, .32, .3); if (ui <= 0 || uo >= 1) return;
  const k = eOut(ui, 5); const s = lerp(1.9, 1, k) * (1 + .04 * easeIn(uo)); const al = clamp(ui * 3, 0, 1) * (1 - uo);
  const shakeK = Math.max(0, 1 - (t - a - .3) / .35) * (t > a + .3 ? 1 : 0);
  const r = E.rng(Math.floor(t * 60)); const sx = (r() - .5) * 26 * shakeK, sy = (r() - .5) * 26 * shakeK;
  ctx.save(); ctx.globalAlpha *= al; ctx.translate(W / 2 + sx, y + sy); ctx.scale(s, s);
  ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${size * .04}px`; } catch (e) {}
  ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  ctx.lineWidth = size * .14; ctx.strokeStyle = stroke; ctx.strokeText(text, 0, 0); ctx.shadowColor = 'transparent';
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 50; }
  ctx.fillStyle = col; ctx.fillText(text, 0, 0); ctx.restore();
}

// ------------------------------------------------------------------ 数字滚动
function rollNum(v, u, dec = 0) { const x = v * eOut(u, 3); return dec ? x.toFixed(dec) : Math.round(x).toLocaleString('en-US'); }

// ------------------------------------------------------------------ 整帧合成
function frame(ctx, outputTime, subtitles = true) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = 'transparent'; ctx.filter = 'none';
  ctx.fillStyle = '#10131c'; ctx.fillRect(0, 0, W, H);
  const t = outputTime - PRE, shot = shotAt(t);
  if (shot && VIS[shot.i]) VIS[shot.i](ctx, t, shot);
  else aroll(ctx, t);
  const sub = D.subs.find(([a, , , b]) => a <= t && t < b);
  if (subtitles && sub) E.subtitle(ctx, sub[1]);
}
