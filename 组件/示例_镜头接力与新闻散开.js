// 鹈鹕测试重剪那期 scenes.js 的节选（依赖 组件/鹈鹕测试组件.js）。
// 看点：镜头接力（每个 drawX 自带退场时刻 b，VIS[k] = 背景 + 上一镜退场 + 本镜）、新闻散开、点到谁谁上前、
// 鼓点顶一下、梗视频电视窗 + 花屏、开机线回主播、先定格再播放、全屏播放素材、当前的居中放大之前的缩到一边、正常结束。
// 素材键名、裁切框是那期的，换项目要改。

// ……（中略）……

// 鹈鹕测试 · 重剪：每个镜头怎么画。时间一律挂在口播事件 EV 上（工具/plan.py 生成），不手写秒数。
// 镜头函数 drawK(ctx, t) 只画本镜的窗口（含它在镜尾的退场），VIS[k] 负责背景 + 上一镜退场 + 本镜。
'use strict';

const PEL_CROP = [70, 0, 160, 150];
const POW_HIT1 = EV.news + 28.95 - 7.574, POW_HIT2 = EV.news + 48.45 - 7.574;   // 与 工具/cues.py 的 POW_SRC 一致

// ======================================================================== 镜 2 新闻散开（暗场，不出圆窗）
const NEWS = [
  {img: 'NEWS_KXB', crop: [30, 0, 1170, 420], kw: [566, 6, 722, 38], w: 1200, from: [960, 470], to: [590, 330], rot: 5},
  {img: 'NEWS_QBW', crop: [50, 30, 690, 300], kw: [180, 45, 402, 88], w: 1000, from: [960, 470], to: [1420, 320], rot: -6},
  {img: 'NEWS_NYT', crop: [20, 0, 1090, 560], kw: [548, 12, 775, 60], w: 1240, from: [1000, 620], to: [1000, 620], rot: -2},
];
function drawNews(ctx, t, out = null) {
  const a0 = EV.news, gap = .45;
  NEWS.forEach((n, k) => {
    const a = a0 + k * gap, next = a0 + (k + 1) * gap;
    const u = k < NEWS.length - 1 ? eInOut((t - next) / .7) : 0;        // 下一张来了就往两边散开
    const cx = lerp(n.from[0], n.to[0], u), cy = lerp(n.from[1], n.to[1], u);
    newsPaper(ctx, n, t, {cx, cy, rot: n.rot, a, hl: a + .5, out: out == null ? null : out + k * .06});
  });
}
VIS[2] = (ctx, t) => {
  bgDark(ctx, t);
  // 整体缓慢推近；最后一张落定、关键词划亮后，镜头推向「千禧年大奖难题」
  const push = eInOut((t - EV.news - 1.45) / .9), z = (1 + .04 * eOut((t - EV.news) / 2.6, 2)) * lerp(1, 1.42, push);
  const fx = lerp(W / 2, 1124, push), fy = lerp(H / 2, 345, push), tx = lerp(W / 2, 1000, push), ty = lerp(H / 2, 420, push);
  ctx.save(); ctx.translate(tx, ty); ctx.scale(z, z); ctx.translate(-fx, -fy);
  drawNews(ctx, t); ctx.restore();
};

// ======================================================================== 镜 3 小学生都能答对的测试：横格作业纸 + 红笔大问号
function drawPaper(ctx, t, b = null) {
  win(ctx, {t, a: EV.paper + .12, b, cx: 1090, cy: 470, w: 1180, h: 760, rot: -2, pop: 1.5, fill: '#fffdf6',
    content: (g, x, y, w, h) => {
      g.fillStyle = '#fffdf6'; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(80,130,220,.35)'; g.lineWidth = 3;
      for (let yy = y + 120; yy < y + h; yy += 62) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
      g.strokeStyle = 'rgba(255,59,48,.45)'; g.beginPath(); g.moveTo(x + 130, y); g.lineTo(x + 130, y + h); g.stroke();
      const u = clamp((t - EV.kid) / .45, 0, 1); if (u <= 0) return;      // 红笔问号自上而下写出来
      g.save(); g.beginPath(); g.rect(x, y, w, 130 + (h - 120) * eOut(u, 2)); g.clip();
      g.font = '460px Title'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.red; g.translate(x + w / 2 + 40, y + h / 2 + 20); g.rotate(.08); g.fillText('?', 0, 0); g.restore();
    }});
}
VIS[3] = (ctx, t) => { bgLight(ctx, t); drawNews(ctx, t, EV.paper); drawPaper(ctx, t, EV.svg - .05); };

// ======================================================================== 镜 4 AI 生成的鹈鹕 SVG 动画：单窗口铺满宽度
const BIG = {cx: 1090, cy: 468, w: 1640, h: 922, scale: .86};
function drawSvg(ctx, t, b = null) { win(ctx, {...BIG, t, a: EV.svg, b, content: vid('v03_01', t - EV.svg)}); }
VIS[4] = (ctx, t) => { bgLight(ctx, t); drawPaper(ctx, t, EV.svg - .05); drawSvg(ctx, t, EV.wheel - .05); };

// ======================================================================== 镜 5 车轮当暗器：推近到甩出去的曲柄，窗口跟着一震
function drawWheel(ctx, t, b = null) {
  const d = t - EV.wheel;
  const k = keyed(d, [[0, {z: 1, fx: .5, fy: .5}], [.75, {z: 1.45, fx: .45, fy: .9}], [2.95, {z: 1, fx: .5, fy: .5}]], .55);
  const hit = EV.wheel_fly + .1, sh = t > hit ? Math.max(0, 1 - (t - hit) / .35) : 0, r = E.rng(Math.floor(t * 60));
  win(ctx, {t, a: EV.wheel, b, cx: 1090, cy: 468, w: 1200, h: 782, dx: (r() - .5) * 26 * sh, dy: (r() - .5) * 18 * sh,
    content: vid('v04_02', d, [42, 58, 356, 232], k)});
}
VIS[5] = (ctx, t) => { bgLight(ctx, t); drawSvg(ctx, t, EV.wheel - .05); drawWheel(ctx, t, EV.feet - .05); };

// ======================================================================== 镜 6 先演示右边（脚不动轮动），再演示左边（脚动轮不动、只有脚蹬在转）
// 左半幅裁掉录屏鼠标（右边缘）和底部控件
const FEET_L = [12, 40, 396, 370], FEET_R = [445, 40, 423, 400];
function drawFeet(ctx, t, b = null) {
  const d = t - EV.feet;
  // 点到谁谁上前 1.1 倍，另一个虚化压暗；说到脚蹬时左窗移到中间放大并推近到脚蹬
  const R = keyed(t, [[0, {cx: 1450, s: 1, blur: 0, dim: 0}], [EV.feet + .6, {cx: 1440, s: 1.1, blur: 0, dim: 0}],
    [EV.feetR - .1, {cx: 1470, s: .9, blur: 6, dim: .38}], [EV.pedal - .1, {cx: 1640, s: .78, blur: 10, dim: .5}]]);
  const L = keyed(t, [[0, {cx: 700, s: 1, blur: 0, dim: 0, z: 1}], [EV.feet + .6, {cx: 690, s: .9, blur: 6, dim: .38, z: 1}],
    [EV.feetR - .1, {cx: 700, s: 1.1, blur: 0, dim: 0, z: 1}], [EV.pedal - .1, {cx: 980, s: 1.16, blur: 0, dim: 0, z: 2}]]);
  // 被压暗的那个画在下面，上前的那个画在上面
  const right = () => win(ctx, {t, a: EV.feet, b, cx: R.cx, cy: 460, w: 680, h: 648, scale: R.s, blur: R.blur, dim: R.dim, content: vid('v05_03', d, FEET_R)});
  const left = () => win(ctx, {t, a: EV.feet + .5, b, cx: L.cx, cy: 460, w: 680, h: 636, scale: L.s, blur: L.blur, dim: L.dim,
    content: vid('v05_03', d, FEET_L, {z: L.z, fx: .56, fy: .87}),
    after: (g, x, y, w, h) => dashRing(g, x + .56 * w, y + .87 * h, 80, (t - EV.pedal - .5) / .4, t, C.red, 8, .6)});
  if (t < EV.feetR - .1) { left(); right(); } else { right(); left(); }
  if (t > EV.quantum && t < EV.quantum + .3) E.glitch(ctx, .9 * (1 - (t - EV.quantum) / .3), Math.floor(t * 30));
}
VIS[6] = (ctx, t) => { bgLight(ctx, t); drawWheel(ctx, t, EV.feet - .05); drawFeet(ctx, t, EV.air - .05); };

// ======================================================================== 镜 7 空中开蹬：「跃上跃下」时窗口跟着弹两下（Pow 28.9s 的鼓落在入场）
function drawAir(ctx, t, b = null) {
  const u = clamp((t - EV.jump) / 1, 0, 1), hop = u > 0 && u < 1 ? -56 * Math.abs(Math.sin(u * Math.PI * 2)) * (1 - u * .5) : 0;
  const kick = POW_HIT1 < t ? .05 * Math.exp(-(t - POW_HIT1) * 9) : 0;      // Pow 28.95s 的大鼓：窗口跟着顶一下
  win(ctx, {t, a: EV.air, b, cx: 1090, cy: 470, w: 1460, h: 801, scale: .9 * (1 + kick), dy: hop, pop: 1.7, content: vid('v06', t - EV.air, [120, 45, 580, 318])});
}
VIS[7] = (ctx, t) => { bgLight(ctx, t); drawFeet(ctx, t, EV.air - .05); drawAir(ctx, t, EV.notbad - .05); };

// ======================================================================== 镜 8 这已经算不错的了
function drawNotbad(ctx, t, b = null) {
  win(ctx, {t, a: EV.notbad, b, cx: 1090, cy: 468, w: 1600, h: 760, scale: .9, content: vid('v07_05', t - EV.notbad, [100, 140, 648, 295])});
}
VIS[8] = (ctx, t) => { bgLight(ctx, t); drawAir(ctx, t, EV.notbad - .05); drawNotbad(ctx, t, EV.ugly - .05); };

// ======================================================================== 镜 9 歪瓜裂枣：2×2 四张丑图依次弹入，逐个打红叉
const UGLY = [['S1_crude_3', 780, 285, -2], ['S1_crude_4', 1420, 285, 2], ['S1_crude_7', 780, 712, 1.5], ['S1_crude_10', 1420, 712, -2.5]];
function drawUgly(ctx, t, b = null) {
  UGLY.forEach(([img, x, y, rot], k) => {
    win(ctx, {t, a: EV.ugly + k * .18, b: b == null ? null : b + k * .05, cx: x, cy: y, w: 600, h: 400, rot, pop: 2,
      content: pic(img, {fit: 'contain', crop: img.endsWith('_10') ? null : [300, 300, 1000, 1000]}), after: (g, ix, iy, iw, ih) => redX(g, 0, 0, 110, (t - EV.ugly_x - k * .14) / .3, 18)});
  });
}
VIS[9] = (ctx, t) => { bgLight(ctx, t); drawNotbad(ctx, t, EV.ugly - .05); drawUgly(ctx, t, EV.opus - .05); };


// ……（中略）……

// ======================================================================== 镜 19 烂得各有特色：四张 2024 年的丑图斜着飞入，红圈圈出离谱处
const FLOP = [['crude_2', -6], ['crude_6', 4], ['crude_8', -3], ['crude_9', 5]];
function drawFlop(ctx, t, b = null) {
  FLOP.forEach(([img, rot], k) => win(ctx, {t, a: EV.flop + k * .15, b: b == null ? null : b + k * .04, cx: 560 + k * 390, cy: 450, w: 370, h: 370, rot, fromX: 260, fromRot: 14, dIn: .7,
    content: pic(img, {fit: 'contain', crop: [300, 300, 1000, 1000]}),
    after: (g) => dashRing(g, 0, 10, 110, (t - EV.flop_hl - k * .12) / .4, t, C.red, 9, .4)}));
}
VIS[19] = (ctx, t) => { bgLight(ctx, t); drawStatic(ctx, t, EV.flop - .05); drawFlop(ctx, t); };

// ======================================================================== 镜 20 鹈鹕和自行车 → 鸡和篮球（主播全屏，两侧徽章翻面）
function ball(g, r) {
  g.fillStyle = '#f28a2e'; g.fillRect(-r, -r, 2 * r, 2 * r); g.strokeStyle = '#2b1a0e'; g.lineWidth = r * .07;
  g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
  g.beginPath(); g.arc(-r * 1.25, 0, r * .9, -1, 1); g.stroke(); g.beginPath(); g.arc(r * 1.25, 0, r * .9, Math.PI - 1, Math.PI + 1); g.stroke();
}
VIS[20] = (ctx, t) => { bgLight(ctx, t); drawFlop(ctx, t, EV.chick - .9); };
VIS[20].over = (ctx, t) => {
  const f = clamp((t - EV.chick_flip + .1) / .45, 0, 1), sx = Math.abs(Math.cos(f * Math.PI)), back = f > .5;
  badgePop(ctx, t, EV.chick + .25, EV.scratch - .05, 330, 400, 150, back ? {img: 'STK_2', contain: true, col: RED, sx} : {img: 'PEL_IMG', imgCrop: PEL_CROP, col: YEL, sx});
  badgePop(ctx, t, EV.chick + .55, EV.scratch - .05, 1590, 400, 150, back ? {draw: ball, col: [242, 138, 46], sx} : {img: 'BIKE', contain: true, col: BLUE, sx});
};

// ======================================================================== 镜 21 梗视频：复古电视窗口，只留「篮球和鸡」，结尾 0.5 秒花屏
function drawMeme(ctx, t) {
  const d = t - EV.meme;
  win(ctx, {t, a: EV.meme, cx: 960, cy: 470, w: 1320, h: 780, pop: 1.6, dIn: .4, fill: '#111', content: (g, x, y, w, h) => {
    if (t < EV.static_fx) vid('meme', X.meme[0] + d, [80, 20, 480, 280])(g, x, y, w, h); else snow(g, x, y, w, h, t);
    scanlines(g, x, y, w, h);
  }});
}
VIS[21] = (ctx, t) => { bgLight(ctx, t); drawMeme(ctx, t); };

// ======================================================================== 镜 22 西蒙老哥选择鹈鹕测试的原因：开机线展开回到主播，西蒙徽章从右边滑入
VIS[22] = (ctx, t) => bgLight(ctx, t);
VIS[22].over = (ctx, t) => {
  const u = clamp((t - EV.back) / .28, 0, 1);
  if (u < 1) {
    const hh = H * eOut(u, 3) / 2; ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, 0, W, H / 2 - hh); ctx.fillRect(0, H / 2 + hh, W, H / 2 - hh + 1);
    ctx.fillStyle = `rgba(255,255,255,${1 - u})`; ctx.fillRect(0, H / 2 - 3, W, 6);
  }
  const ui = clamp((t - EV.back - .3) / .6, 0, 1); if (ui <= 0) return;
  const uo = clamp((t - EV.db + .1) / .35, 0, 1);
  badge(ctx, 1600 + 420 * (1 - eOut(ui)), 410, 150, {img: 'PORT', col: YEL, name: 'Simon Willison', a: clamp(ui * 3, 0, 1) * (1 - uo)});
};


// ……（中略）……

// ################################################################################ ③ 正式内容
// ======================================================================== 镜 26 不只要画对，还要动起来：鸟怎么坐、脚蹬怎么蹬
const V18 = [0, 0, 427, 195];
function drawV18(ctx, t, b = null) {
  const play = A4('真正动起来'), k = keyed(t, [[0, {z: 1, fx: .5, fy: .5}], [EV.seat - .25, {z: 1.75, fx: .36, fy: .55}], [EV.crank - .2, {z: 1.9, fx: .37, fy: .94}]], .6);
  win(ctx, {...BIG, t, a: EV.v18, b, content: vid('v18_20', t < play ? .2 : .2 + (t - play), V18, {...k, rate: t < play ? 0 : 1}),
    after: (g, x, y, w, h) => {
      if (t < EV.seat - .3) return;
      if (t < EV.crank - .2) dashRing(g, x + .36 * w, y + .55 * h, 150, (t - EV.seat) / .4, t, C.yel, 10, .5);
      else dashRing(g, x + .37 * w, y + .94 * h - 40, 130, (t - EV.crank) / .4, t, C.red, 10, 1.2);
    }});
}
// 句内的词：用字幕起点附近的粗略锚点（第 4 句没有单独事件的位置）
function A4(word) { return {'真正动起来': EV.seat - 1.6, '鹈鹕和自行车': EV.v18 + .9}[word]; }
VIS[26] = (ctx, t) => { bgLight(ctx, t); drawReal(ctx, t, EV.part3 - .4); drawV18(ctx, t, EV.bubble - .05); };

// ……（中略）……

// ======================================================================== 镜 28–29 发布会大吹特吹：舞台追光 + 彩纸；+37%；SOTA 连砸四下
function beams(ctx, t) {
  [320, 1600, 960].forEach((x, k) => {
    const a = Math.sin(t * .9 + k * 1.7) * .35; ctx.save(); ctx.translate(x, -40); ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, 1200); g.addColorStop(0, 'rgba(255,240,190,.55)'); g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(260, 1200); ctx.lineTo(-260, 1200); ctx.closePath(); ctx.fill(); ctx.restore();
  });
}
function confetti(ctx, t, t0, seed = 3) {
  if (t < t0) return; const d = t - t0, r = E.rng(seed), cols = [C.yel, C.red, C.blue, C.green, '#ff7ab6'];
  for (let i = 0; i < 70; i++) {
    const x = r() * W, v = 200 + r() * 260, y = -40 + v * d + 30 * Math.sin(d * 3 + i), rot = d * (2 + r() * 4) + i;
    if (y > H + 40) continue; ctx.save(); ctx.translate(x + 40 * Math.sin(d * 2 + i), y); ctx.rotate(rot); ctx.fillStyle = cols[i % 5]; ctx.fillRect(-7, -4, 14, 8); ctx.restore();
  }
}
function drawLaunch(ctx, t, b = null) {
  const dim = keyed(t, [[0, {d: 0}], [EV.up - .1, {d: .25}], [EV.sota - .1, {d: .45}]]).d;
  const ui = clamp((t - EV.launch) / .35, 0, 1), uo0 = b == null ? 0 : clamp((t - b) / .35, 0, 1);
  if (ui > 0 && uo0 < 1) {                                  // 全屏播放：轻微推进入场，结尾淡出
    const z = lerp(1.08, 1, eOut(ui)) + .03 * clamp((t - EV.launch) / 5, 0, 1);
    ctx.save(); ctx.globalAlpha *= clamp(ui * 2, 0, 1) * (1 - eIn(uo0)); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    vid('v19_21', 2.6 + t - EV.launch, [40, 20, 560, 300])(ctx, 0, 0, W, H); ctx.fillStyle = `rgba(10,10,14,${dim})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  confetti(ctx, t, EV.launch + .6);
  const n = clamp((t - EV.up + .1) / .7, 0, 1), uo = b == null ? 0 : clamp((t - b) / .3, 0, 1);
  if (n > 0 && uo < 1 && t < EV.sota + .1) {
    ctx.save(); ctx.globalAlpha *= clamp(n * 3, 0, 1) * (1 - uo) * (1 - clamp((t - EV.sota + .1) / .2, 0, 1)); ctx.translate(1420, 300); ctx.rotate(-.08);
    ctx.font = '230px Num'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = C.ink;
    const v = '+' + Math.round(37 * eOut(n, 2.2)) + '%'; ctx.strokeText(v, 0, 0); ctx.fillStyle = C.yel; ctx.fillText(v, 0, 0); ctx.restore();
  }
  if (b == null || t < b + .3) { ctx.save(); ctx.globalAlpha *= b == null ? 1 : 1 - clamp((t - b) / .3, 0, 1);
    [[560, 380, -10], [960, 560, 8], [1360, 360, -6], [1680, 600, 10]].forEach(([x, y, r], k) => stamp(ctx, 'SOTA', x, y, t, EV.sota + .05 + k * .18, {size: 120, rot: r}));
    ctx.restore(); }
}
VIS[28] = (ctx, t) => { bgLight(ctx, t); drawLaunch(ctx, t); };
VIS[29] = VIS[28];
VIS[30] = (ctx, t) => { bgLight(ctx, t); drawLaunch(ctx, t, EV.normal - .3); };

// ……（中略）……

// ======================================================================== 镜 51 两年前只能画一张图 → 跑动画 → 3D：当前的在中间放大，之前的缩到左边
function drawTwo(ctx, t, b = null) {
  const items = [[EV.two, pic('STILL', {fit: 'contain'})], [EV.anim, vid('v29_31', (t - EV.anim) % 2.3)], [EV.d3, vid('v29_32', (t - EV.d3) % 2.8)]];
  const act = t < EV.anim ? 0 : t < EV.d3 ? 1 : 2;
  items.forEach(([a, content], k) => {
    const back = act - k;                                       // 0 当前；1 上一个；2 更早
    const p = keyed(t, [[0, {x: 1150, y: 470, s: 1.12, dim: 0, blur: 0}], [EV.anim - .1, k === 0 ? {x: 500, y: 300, s: .55, dim: .35, blur: 3} : {x: 1150, y: 470, s: 1.12, dim: 0, blur: 0}],
      [EV.d3 - .1, k === 0 ? {x: 500, y: 600, s: .5, dim: .45, blur: 4} : k === 1 ? {x: 500, y: 300, s: .55, dim: .35, blur: 3} : {x: 1150, y: 470, s: 1.12, dim: 0, blur: 0}]]);
    if (back < 0) return;
    win(ctx, {t, a: a - .05, b, cx: p.x, cy: p.y, w: 760, h: 470, scale: p.s, dim: p.dim, blur: p.blur, content});
  });
}
VIS[51] = (ctx, t) => { bgLight(ctx, t); drawOld(ctx, t, EV.two - .05); drawTwo(ctx, t); };
VIS[52] = (ctx, t) => { bgLight(ctx, t); drawTwo(ctx, t, EV.mine - .5); };

// ……（中略）……

// ======================================================================== 镜 55 你在用什么模型，评论区一起欣赏：主播全屏，右侧评论气泡冒出；正常结束
VIS[55] = (ctx, t) => { bgLight(ctx, t); drawSmooth(ctx, t, EV.ask - .5); };
VIS[55].over = (ctx, t) => {
  [[1520, 260, 0], [1640, 470, 1], [1500, 680, 2]].forEach(([x, y, k]) => {
    const u = clamp((t - EV.comment + .6 - k * .25) / .45, 0, 1); if (u <= 0) return; const s = bk(u, 2);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#fff'; rr(ctx, -200, -70, 400, 140, 60); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-120, 66); ctx.lineTo(-150, 110); ctx.lineTo(-80, 66); ctx.fillStyle = '#fff'; ctx.fill();
    [C.yel, C.blue, C.red].forEach((c, j) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-60 + j * 60, 0, 18 + 4 * Math.sin(t * 6 + j), 0, 7); ctx.fill(); }); ctx.restore();
  });
};
