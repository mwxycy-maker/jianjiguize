// 鹈鹕测试重剪（2026-10）那期的 common.js：差评君平面窗口卡片 + 秋芝主播圆窗（主播状态轨）+ 新闻纸片 + 批改符号。
// 跑在 video-workbench 公共播放器 1.0 上（全局 E 引擎、D 数据、window.VSRC 素材表）。用法见 组件/README.md。
// 本期公共组件：时间映射、秋芝式主播圆窗、差评君式窗口卡片、新闻纸片、徽章、批改符号、背景。
// 所有动画只由时间 t 决定（纯函数），任意拖动、逐帧取画面都一致。
'use strict';
const {W, H, clamp, lerp, seg, ease, easeOut, easeIn, backOut} = E;
const PRE = D.PRE, EV = D.EV, X = D.X || {}, VIS = {};
const S = Object.fromEntries(D.shots.map(s => [s.i, s]));
const shotAt = t => D.shots.find(s => s.start <= t && t < s.end) || D.shots[D.shots.length - 1];
E.setVideoSources(window.VSRC);

const C = {ink: '#141414', paper: '#fbfbf8', yel: '#FFC531', blue: '#2B59FF', red: '#FF3B30', green: '#22C55E'};
const YEL = [255, 197, 49], BLUE = [43, 89, 255], RED = [255, 59, 48];

// ------------------------------------------------------------------ 缓动
const eOut = (u, p = 4) => easeOut(clamp(u, 0, 1), p);            // 入场：快进慢停
const eIn = (u, p = 2.2) => easeIn(clamp(u, 0, 1), p);            // 退场
const eInOut = u => { u = clamp(u, 0, 1); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const bk = (u, k = 2) => backOut(clamp(u, 0, 1), k);
// 关键帧插值：keys = [[时刻, {k:v}], ...]，相邻关键帧之间用 eInOut 过渡 dur 秒
function keyed(t, keys, dur = .65) {
  let cur = {...keys[0][1]};
  for (let i = 1; i < keys.length; i++) {
    const [tk, v] = keys[i]; if (t < tk) break;
    const u = eInOut((t - tk) / dur); const nxt = {};
    for (const k in v) nxt[k] = lerp(cur[k], v[k], u);
    cur = {...cur, ...nxt};
  }
  return cur;
}

// ------------------------------------------------------------------ 口播：成片时间 → 口播源时间（插入段里冻结在上一段末尾）
function srcAt(t) {
  const P = X.pieces; let last = P[0][0];
  for (const [a, b, at] of P) { if (t < at) return last; if (t <= at + (b - a)) return a + (t - at); last = b; }
  return last;
}
const hostV = t => E.video('host', srcAt(t));
const HOST_SRC = [0, 0, 854, 480];
function aroll(ctx, t, zoom = 1, fx = .5, fy = .3) {
  const v = hostV(t); if (!E.ready(v)) return;
  const sw = HOST_SRC[2] / zoom, sh = HOST_SRC[3] / zoom;
  E.cover(ctx, v, 0, 0, W, H, .5, .5, [(HOST_SRC[2] - sw) * fx, (HOST_SRC[3] - sh) * fy, sw, sh]);
}

// ------------------------------------------------------------------ 秋芝式主播：全屏 ↔ 左下角圆窗（形状与裁切同时连续变化）
const HOST_CIRCLE = {cx: 196, cy: 870, r: 138};
const FACE = {cx: 440, cy: 182, s: 270};               // 口播画面里脸部正方形（源像素）
function hostMorph(ctx, t, u, scale = 1) {
  u = clamp(u, 0, 1); const c = HOST_CIRCLE, k = eInOut(u);
  const x = lerp(0, c.cx - c.r, k), y = lerp(0, c.cy - c.r, k), w = lerp(W, 2 * c.r, k), h = lerp(H, 2 * c.r, k), r = lerp(0, c.r, k);
  const v = hostV(t); if (!E.ready(v)) return;
  const cw = lerp(HOST_SRC[2], FACE.s, k), ch = lerp(HOST_SRC[3], FACE.s, k);
  const sx = lerp(HOST_SRC[2] / 2, FACE.cx, k), sy = lerp(HOST_SRC[3] / 2, FACE.cy, k);
  ctx.save();
  if (scale !== 1) { ctx.translate(c.cx, c.cy); ctx.scale(scale, scale); ctx.translate(-c.cx, -c.cy); }
  ctx.shadowColor = `rgba(0,0,0,${.4 * k})`; ctx.shadowBlur = 36 * k; ctx.shadowOffsetY = 14 * k;
  rr(ctx, x, y, w, h, r); ctx.fillStyle = '#111'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
  E.cover(ctx, v, x, y, w, h, .5, .5, [sx - cw / 2, sy - ch / 2, cw, ch]); ctx.restore();
  if (k > .02) {
    rr(ctx, x, y, w, h, r); ctx.lineWidth = 8 * k; ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.stroke();
    rr(ctx, x - 8 * k, y - 8 * k, w + 16 * k, h + 16 * k, r + 8 * k); ctx.lineWidth = 3.5 * k; ctx.strokeStyle = `rgba(255,197,49,${k})`; ctx.stroke();
  }
  ctx.restore();
}
// 主播状态轨：[时刻, 'full' | 'circle' | 'none']。变形 0.75s；圆窗弹入 0.5s、弹出 0.35s；全屏和 none 之间硬切。
const HOST_TRACK = [
  [0, 'full'], [EV.news, 'none'], [EV.paper, 'circle'], [EV.hello - .7, 'full'], [EV.svg2, 'circle'],
  [EV.chick - .7, 'full'], [EV.meme, 'none'], [EV.back, 'full'], [EV.db, 'circle'], [EV.part3 - .7, 'full'],
  [EV.v18, 'circle'], [EV.normal - .7, 'full'], [EV.grid6, 'none'], [EV.gift, 'full'], [EV.evo, 'circle'], [EV.dumb - .7, 'full'],
  [EV.how, 'circle'], [EV.fair - .7, 'full'], [EV.lol, 'circle'], [EV.rank, 'none'], [EV.first, 'full'], [EV.whole, 'circle'],
  [EV.cram, 'none'], [EV.old, 'circle'], [EV.mine - .7, 'full'], [EV.abstract, 'circle'], [EV.ask - .7, 'full'],
];
function hostState(t) {          // 返回 {u: 0 全屏 → 1 圆窗, s: 圆窗缩放, full: 是否整屏口播打底}
  let st = {u: 0, s: 1};
  for (let i = 1; i < HOST_TRACK.length; i++) {
    const [tk, m] = HOST_TRACK[i], prev = HOST_TRACK[i - 1][1]; if (t < tk) break;
    const d = t - tk;
    if (prev === 'full' && m === 'circle') st = {u: d / .75, s: 1};
    else if (prev === 'circle' && m === 'full') st = {u: 1 - d / .75, s: 1};
    else if (prev === 'none' && m === 'circle') st = {u: 1, s: bk(d / .5, 1.6)};
    else if (prev === 'circle' && m === 'none') st = {u: 1, s: 1 - eIn(d / .35)};
    else if (m === 'full') st = {u: 0, s: 1};
    else if (m === 'none') st = {u: 1, s: 0};
    else st = {u: 1, s: 1};
  }
  st.u = clamp(st.u, 0, 1); return st;
}

// ------------------------------------------------------------------ 背景：浅暖灰径向渐变 + 网点 + 两团漂移柔光；暗场炭黑
let _bgL = null, _bgD = null;
function bgLight(ctx, t) {
  if (!_bgL) {                                            // 底色渐变 + 网点是静态的：只画一次
    _bgL = document.createElement('canvas'); _bgL.width = W; _bgL.height = H; const g = _bgL.getContext('2d');
    const gr = g.createRadialGradient(W * .5, H * .42, 80, W * .5, H * .5, W * .78);
    gr.addColorStop(0, '#f6f4ef'); gr.addColorStop(.6, '#ecEAE4'); gr.addColorStop(1, '#d9d6cf'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    dotGrid(g, [150, 146, 138], .5);
  }
  ctx.drawImage(_bgL, 0, 0);
  for (const [k, cx, cy, r, col] of [[0, .2, .22, 640, [255, 214, 120]], [1, .82, .75, 720, [150, 180, 255]]]) {
    const ox = Math.sin(t * .23 + k * 2) * 70, oy = Math.cos(t * .19 + k) * 45, x = W * cx + ox, y = H * cy + oy;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, E.rgb(col, 1, .30)); rg.addColorStop(1, E.rgb(col, 1, 0)); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
function bgDark(ctx, t) {
  if (!_bgD) {
    _bgD = document.createElement('canvas'); _bgD.width = W; _bgD.height = H; const g = _bgD.getContext('2d');
    const gr = g.createRadialGradient(W * .5, H * .2, 60, W * .5, H * .5, W * .8);
    gr.addColorStop(0, '#34343a'); gr.addColorStop(.55, '#202024'); gr.addColorStop(1, '#141416'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    dotGrid(g, [80, 80, 88], .7);
  }
  ctx.drawImage(_bgD, 0, 0);
}
let _dots = null;
function dotGrid(ctx, col, a) {
  if (!_dots) {
    _dots = document.createElement('canvas'); _dots.width = W; _dots.height = H; const g = _dots.getContext('2d'); g.fillStyle = '#fff';
    for (let y = 18; y < H; y += 36) for (let x = 18 + (Math.floor(y / 36) % 2) * 18; x < W; x += 36) { g.beginPath(); g.arc(x, y, 1.7, 0, 7); g.fill(); }
  }
  const c = E.tmp('dots_col'); const g = c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.drawImage(_dots, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = E.rgb(col); g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(c, 0, 0); ctx.restore();
}
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ------------------------------------------------------------------ 差评君窗口卡片（平面）：9px 黑边 + 14px 白内框 + 30px 圆角 + 投影
// o: {cx, cy, w, h, t, a 进场时刻, b 退场时刻, scale, rot(度), dx, dy, blur, dim, alpha, content(g, x, y, w, h)}
// 进场：从 0.88 倍、下方 70px 轻放大上浮淡入（0.65s 强缓出）；退场：缩到 0.9、下沉 60px 淡出（0.45s 缓入）
function win(ctx, o) {
  const t = o.t, ui = o.a == null ? 1 : clamp((t - o.a) / (o.dIn || .65), 0, 1), uo = o.b == null ? 0 : clamp((t - o.b) / (o.dOut || .45), 0, 1);
  if (ui <= 0 || uo >= 1) return null;
  const ki = eOut(ui), ko = eIn(uo, 2);
  const pop = o.pop ? bk(ui, o.pop) : lerp(.88, 1, ki);
  const s = (o.scale || 1) * pop * lerp(1, .9, ko);
  const a = clamp(ui * 2.2, 0, 1) * (1 - ko) * (o.alpha == null ? 1 : o.alpha);
  const cx = o.cx + (o.dx || 0) + (o.fromX || 0) * (1 - ki), cy = o.cy + (o.dy || 0) + lerp(o.fromY == null ? 70 : o.fromY, 0, ki) + 60 * ko;
  const rot = (o.rot || 0) + (o.fromRot || 0) * (1 - ki);
  const w = o.w, h = o.h, B = 9, Z = 14, R = 30;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.30)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22;
  rr(ctx, -w / 2, -h / 2, w, h, R); ctx.fillStyle = C.ink; ctx.fill(); ctx.shadowColor = 'transparent';
  if (o.blur > .5) {                                      // 虚化：整张卡缩小画，再平滑放大回来
    const k = 1 / (1 + Math.round(o.blur) * .6), cw = Math.ceil(w * k), ch = Math.ceil(h * k), c = E.tmp('winblur_' + cw + 'x' + ch, cw, ch), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.scale(k, k); g.translate(w / 2, h / 2);
    cardBody(g, {...o, blur: 0, after: null}, w, h); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, -w / 2, -h / 2, w, h);
    ctx.restore(); return {cx, cy, s, rot};
  }
  cardBody(ctx, o, w, h);
  ctx.restore();
  return {cx, cy, s, rot};
}
function cardBody(ctx, o, w, h) {
  const B = 9, Z = 14, R = 30;
  rr(ctx, -w / 2, -h / 2, w, h, R); ctx.fillStyle = C.ink; ctx.fill();
  rr(ctx, -w / 2 + B, -h / 2 + B, w - 2 * B, h - 2 * B, R - B); ctx.fillStyle = '#fff'; ctx.fill();
  const ix = -w / 2 + B + Z, iy = -h / 2 + B + Z, iw = w - 2 * (B + Z), ih = h - 2 * (B + Z);
  ctx.save(); rr(ctx, ix, iy, iw, ih, R - B - Z + 6); ctx.clip(); ctx.fillStyle = o.fill || '#fff'; ctx.fillRect(ix, iy, iw, ih);
  if (o.content) o.content(ctx, ix, iy, iw, ih);
  if (o.dim) { ctx.fillStyle = `rgba(20,20,24,${o.dim})`; ctx.fillRect(ix, iy, iw, ih); }
  ctx.restore();
  if (o.after) o.after(ctx, ix, iy, iw, ih);           // 画在卡片坐标里、不被裁切的装饰（圈、叉）
}
// 内容：视频裁切后铺满（可推近：z 倍，焦点 fx fy 是裁切框内的相对位置）
const vid = (key, ts, crop, {rate = 1, z = 1, fx = .5, fy = .5} = {}) => (g, x, y, w, h) => {
  const pool = E._pool[key], d = pool && pool[0] && pool[0].el.duration;
  if (isFinite(d) && ts > d - .12) { ts = d - .12; rate = 0; }        // 素材放完：停在最后一帧
  const v = E.video(key, Math.max(0, ts), rate); if (!E.ready(v)) return;
  const [vw, vh] = E.sizeOf(v); const cr = crop || [0, 0, vw, vh];
  const sw = cr[2] / z, sh = cr[3] / z;
  E.cover(g, v, x, y, w, h, .5, .5, [cr[0] + (cr[2] - sw) * fx, cr[1] + (cr[3] - sh) * fy, sw, sh]);
};
const pic = (name, {fit = 'cover', bg = '#fff', pad = 0, crop = null} = {}) => (g, x, y, w, h) => {
  g.fillStyle = bg; g.fillRect(x, y, w, h); const im = E.img(name); if (!E.ready(im)) return;
  if (fit === 'cover') { E.cover(g, im, x, y, w, h, .5, .5, crop); return; }
  const [iw, ih] = crop ? [crop[2], crop[3]] : E.sizeOf(im); const s = Math.min((w - 2 * pad) / iw, (h - 2 * pad) / ih);
  const cr = crop || [0, 0, iw, ih];
  g.drawImage(im, cr[0], cr[1], cr[2], cr[3], x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
};

// ------------------------------------------------------------------ 新闻纸片（无黑框，白纸 + 投影 + 透视），关键词黄色马克笔扫过
// n: {img, crop:[sx,sy,sw,sh], kw:[x0,y0,x1,y1](源像素), w(屏幕宽)}
function newsPaper(ctx, n, t, {cx, cy, rot = 0, a, hl, out = null, ry = 0, rx = 0}) {
  const im = E.img(n.img); if (!E.ready(im) || t < a) return;
  const [sx, sy, sw, sh] = n.crop, w = n.w, h = w * sh / sw, k = w / sw;
  const c = E.tmp('news_' + n.img, Math.round(w), Math.round(h)), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const u = clamp((t - hl) / .38, 0, 1);
  if (u > 0) {
    const [x0, y0, x1, y1] = n.kw.map((v, i) => (v - (i % 2 ? sy : sx)) * k);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = C.yel;
    g.fillRect(x0 - 8, y0 - 2, (x1 - x0 + 16) * eOut(u, 3), y1 - y0 + 10); g.globalCompositeOperation = 'source-over';
  }
  // 飞入：从画面下方远处翻上来，减速落位；退场：翻落出画
  const ui = clamp((t - a) / .7, 0, 1), ki = eOut(ui, 4);
  const ko = out == null ? 0 : eIn(clamp((t - out) / .5, 0, 1), 2.4);
  const scale = lerp(.55, 1, ki) * lerp(1, .85, ko);
  E.persp(ctx, c, c.width, c.height, cx + lerp(0, 0, ki) - 300 * ko, cy + lerp(520, 0, ki) + 1100 * ko,
    {scale, rz: rot + lerp(rot > 0 ? 14 : -14, 0, ki) - 20 * ko, rx: rx + lerp(38, 0, ki) - 25 * ko, ry: ry + lerp(-12, 0, ki), a: clamp(ui * 3, 0, 1), radius: 6, shadowK: .75, n: 12});
}

// ------------------------------------------------------------------ 徽章：白色圆 + 品牌色描边 + 名字（深色描边）
function badge(ctx, x, y, r, {label = '', col = BLUE, img = null, imgCrop = null, contain = false, draw = null, name = null, s = 1, a = 1, fs = 0, sx = 1} = {}) {
  if (a <= .01 || s <= .01) return;
  ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(x, y); ctx.scale(s * sx, s);
  ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(4, r * .075); ctx.strokeStyle = E.rgb(col); ctx.stroke();
  if (draw) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * .86, 0, 7); ctx.clip(); draw(ctx, r); ctx.restore(); }
  else if (img) {
    const im = E.img(img);
    if (E.ready(im)) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * .86, 0, 7); ctx.clip();
      if (contain) { const [iw, ih] = E.sizeOf(im), k = r * 1.3 / Math.max(iw, ih); ctx.drawImage(im, -iw * k / 2, -ih * k / 2, iw * k, ih * k); }
      else E.cover(ctx, im, -r * .86, -r * .86, r * 1.72, r * 1.72, .5, .5, imgCrop);
      ctx.restore();
    }
  } else if (label) {
    const f = fs || Math.round(r * (label.length <= 4 ? .5 : label.length <= 7 ? .36 : .3));
    ctx.font = `${f}px Black`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = E.rgb(col); ctx.fillText(label, 0, r * .04);
  }
  if (name) {
    const f = Math.max(30, Math.round(r * .3)); ctx.font = `${f}px Black`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = f * .26; ctx.strokeStyle = C.ink; ctx.strokeText(name, 0, r + f * 1.05);
    ctx.fillStyle = '#fff'; ctx.fillText(name, 0, r + f * 1.05);
  }
  ctx.restore();
}
function badgePop(ctx, t, a, b, x, y, r, opt = {}) {
  const ui = clamp((t - a) / .45, 0, 1), uo = b == null ? 0 : clamp((t - b) / .3, 0, 1); if (ui <= 0 || uo >= 1) return;
  const hover = Math.sin((t - a) * 2.2) * 4 * clamp((t - a - .45) / .4, 0, 1);
  badge(ctx, x, y + hover, r, {...opt, s: bk(ui, 2.2) * (1 - eIn(uo, 2)) * (opt.s || 1), a: clamp(ui * 4, 0, 1) * (1 - uo)});
}

// ------------------------------------------------------------------ 质感：胶片颗粒、电视雪花、扫描线
function grain(g, x, y, w, h, t, k = .1) {
  const r = E.rng(Math.floor(t * 24) + 7); g.save();
  for (let i = 0; i < 260; i++) { g.fillStyle = r() > .5 ? `rgba(255,255,255,${k * r()})` : `rgba(0,0,0,${k * 1.4 * r()})`; g.fillRect(x + r() * w, y + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
  g.restore();
}
function snow(g, x, y, w, h, t) {           // 花屏：低分辨率随机灰度块放大 + 彩条错位
  const c = E.tmp('snow', 160, 90), s = c.getContext('2d'), im = s.createImageData(160, 90), r = E.rng(Math.floor(t * 30) + 3);
  for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  s.putImageData(im, 0, 0);
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(c, x, y, w, h); g.imageSmoothingEnabled = true;
  const bars = ['#ffffff', '#ffe600', '#00e5ff', '#00e046', '#ff2fd6', '#ff2a2a', '#1430ff'];
  if (r() > .45) { const by = y + r() * h * .8, bh = h * (.08 + r() * .12); bars.forEach((col, i) => { g.fillStyle = col; g.globalAlpha = .55; g.fillRect(x + i * w / 7 + (r() - .5) * 40, by, w / 7, bh); }); }
  g.restore();
}
function scanlines(g, x, y, w, h, k = .16) {
  g.save(); g.fillStyle = `rgba(0,0,0,${k})`; for (let yy = y; yy < y + h; yy += 4) g.fillRect(x, yy, w, 1.6);
  const v = g.createRadialGradient(x + w / 2, y + h / 2, h * .3, x + w / 2, y + h / 2, w * .62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = v; g.fillRect(x, y, w, h); g.restore();
}

// ------------------------------------------------------------------ 批改符号：手绘红叉、虚线圈、印章
function redX(ctx, x, y, r, u, w = 16) {
  u = clamp(u, 0, 1); if (u <= 0) return; const a = Math.min(u * 2, 1), b = Math.max(0, u * 2 - 1);
  ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x - r + 2 * r * eOut(a, 3), y - r + 1.92 * r * eOut(a, 3)); ctx.stroke();
  if (b > 0) { ctx.beginPath(); ctx.moveTo(x + r * .95, y - r * 1.04); ctx.lineTo(x + r * .95 - 1.88 * r * eOut(b, 3), y - r * 1.04 + 2.04 * r * eOut(b, 3)); ctx.stroke(); }
  ctx.restore();
}
function dashRing(ctx, x, y, r, u, t, col = C.red, w = 9, spin = 0) {
  u = clamp(u, 0, 1); if (u <= 0) return;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.setLineDash([r * .28, r * .2]); ctx.lineDashOffset = -spin * t * r;
  ctx.beginPath(); ctx.arc(x, y, r * (1.25 - .25 * eOut(u, 3)), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * eOut(u, 2)); ctx.globalAlpha *= clamp(u * 3, 0, 1); ctx.stroke(); ctx.restore();
}
// 印章：从 1.9 倍砸到 1 倍（0.32s），落地后 0.35s 内抖动
function stamp(ctx, text, x, y, t, a, {size = 170, rot = -10, col = C.red} = {}) {
  const u = clamp((t - a) / .32, 0, 1); if (u <= 0) return;
  const s = lerp(1.9, 1, eOut(u, 5)); const shk = t > a + .32 ? Math.max(0, 1 - (t - a - .32) / .35) : 0; const r = E.rng(Math.floor(t * 60));
  ctx.save(); ctx.globalAlpha *= clamp(u * 3, 0, 1) * .93; ctx.translate(x + (r() - .5) * 20 * shk, y + (r() - .5) * 20 * shk); ctx.rotate(rot * Math.PI / 180); ctx.scale(s, s);
  ctx.font = `${size}px Title`; const tw = ctx.measureText(text).width + size * .9, th = size * 1.5;
  ctx.strokeStyle = col; ctx.lineWidth = size * .075; rr(ctx, -tw / 2, -th / 2, tw, th, size * .12); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * .06); ctx.restore();
}

// ------------------------------------------------------------------ 整帧合成
function frame(ctx, outputTime, subtitles = true) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = 'transparent'; ctx.filter = 'none';
  const t = outputTime - PRE, shot = shotAt(t), hs = hostState(t);
  if (hs.u <= 0) { aroll(ctx, t, VIS_ZOOM(t)); if (VIS[shot.i] && VIS[shot.i].over) VIS[shot.i].over(ctx, t, shot); }
  else {
    if (VIS[shot.i]) VIS[shot.i](ctx, t, shot); else bgLight(ctx, t);
    if (hs.u < 1 || hs.s > .01) hostMorph(ctx, t, hs.u, hs.s);
  }
  const sub = D.subs.find(([a, , , b]) => a <= t && t < b);
  if (subtitles && sub) E.subtitle(ctx, sub[1]);
}
// 全屏口播时的缓慢推近：每次回到全屏从 1.0 推到约 1.05
function VIS_ZOOM(t) {
  let t0 = 0; for (const [tk, m] of HOST_TRACK) if (tk <= t && m === 'full') t0 = tk;
  return 1 + .05 * eOut((t - t0) / 6, 2);
}
