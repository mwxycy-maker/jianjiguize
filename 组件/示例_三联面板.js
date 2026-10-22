// ③ 3D 建模：雷峰塔三塔并列 → 点到谁谁上前（后景虚化压暗）→ 细节放大 → 便利店三店同时生长 → 第一名
// ⑤ 自反馈学习：文字片段特写
'use strict';

// 三个竖条画面：从左到右 GPT、Opus、DeepSeek（与第②段一致）。录制时三者机位、仰角、转速完全相同
const P3 = {w: 440, h: 760, xs: [620, 1100, 1580], y: 500, order: ['gpt', 'op', 'ds']};
const P3_STYLE = {border: 6, bezel: 8, radius: 26, col: '#16181d'};
const FOCUS = {x: 1060, y: 488, s: 1.2};
const TOWER_RATE = .86;                                  // 16 秒素材放满整段，三者同一速率 → 角度始终一致

// 关键帧插值：keys = [[时刻, 值对象], ...]，相邻关键帧之间用 eInOut 过渡 dur 秒
function keyed(t, keys, dur = .6) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, v] = keys[i]; if (t < tk) break;
    const u = eInOut(seg(t, tk, tk + dur)); const prev = cur;
    cur = Object.fromEntries(Object.keys(v).map(k => [k, lerp(prev[k], v[k], u)]));
  }
  return cur;
}
// 放大到素材某处：z 倍，焦点 (fx, fy)
function fillZoom(key, ts, z = 1, fx = .5, fy = .5, filter = '') {
  return (g, x, y, w, h) => {
    if (!(key in window.VSRC)) { g.fillStyle = '#1b1f29'; g.fillRect(x, y, w, h); return; }   // 素材还在录制
    const v = E.video(key, ts); if (!E.ready(v)) { g.fillStyle = '#1b1f29'; g.fillRect(x, y, w, h); return; }
    const [vw, vh] = E.sizeOf(v); const cw = vw / z, ch = vh / z;
    const cx = clamp(fx * vw - cw / 2, 0, vw - cw), cy = clamp(fy * vh - ch / 2, 0, vh - ch);
    if (filter) { g.save(); g.filter = filter; }
    E.cover(g, v, x, y, w, h, .5, .5, [cx, cy, cw, ch]);
    if (filter) g.restore();
  };
}
// focusOf(t) → {idx: 当前上前的画面, k: 0..1}
function focusState(t, spans) {
  for (const [i, a, b] of spans) {
    const k = eInOut(seg(t, a, a + .6)) * (1 - eInOut(seg(t, b, b + .6)));
    if (k > 0) return {idx: i, k};
  }
  return {idx: -1, k: 0};
}
// 一组三竖条：o = {kind, aIn, aOut, spans, content(i,t), mark, extra(ctx,i,cx,cy,s)}
function triPanels(ctx, t, o) {
  const F = focusState(t, o.spans || []);
  // 整组重新构图（例如出现提示词时缩小让位）：G = {dx, dy, s}
  const G = o.layout ? o.layout(t) : {dx: 0, dy: 0, s: 1};
  const PX = i => (P3.xs[i] - 960) * G.s + 960 + G.dx, PY = (P3.y - 540) * G.s + 540 + G.dy;
  const draw = (g, i, cx, cy, s, alpha) => {
    const m = P3.order[i];
    const a = o.aIn + i * .5;                       // 从左到右依次入场，间隔半秒
    const M = windowCard(g, {t, key: o.kind + i, cx, cy, w: P3.w, h: P3.h, scale: s, a, b: o.aOut == null ? null : o.aOut + i * .08, dIn: .75, flat: true,
      alpha, style: P3_STYLE, content: o.content(i, t), mark: o.mark ? o.mark[m] : null});
    if (!M) return;
    const ui = seg(t, a + .3, a + .8), uo = o.aOut == null ? 0 : seg(t, o.aOut, o.aOut + .4);
    const [bx, by] = E.mapPt(M, 62, 62);
    badge(g, m, bx, by, 40 * s, clamp(ui * 2, 0, 1) * (1 - uo) * alpha, {side: 'right', nameSize: 30, s: 1});
    if (o.extra) o.extra(g, i, M, s);
  };
  if (F.k > 0) {
    // 后景：其余两条画进图层，虚化 + 压暗
    const L = E.layer('tri_bg');
    P3.order.forEach((m, i) => { if (i !== F.idx) draw(L, i, PX(i), PY, G.s, 1); });
    ctx.save(); ctx.globalAlpha = 1 - F.k; ctx.drawImage(L.canvas, 0, 0); ctx.restore();
    if (F.k > .01) { const b = E.blurred(L.canvas, 18, 'tri_bl'); ctx.save(); ctx.globalAlpha = F.k; ctx.drawImage(b, 0, 0, W, H); ctx.restore(); }
    ctx.fillStyle = `rgba(14,16,24,${.38 * F.k})`; ctx.fillRect(0, 0, W, H);
    const i = F.idx;
    draw(ctx, i, lerp(PX(i), FOCUS.x, F.k), lerp(PY, FOCUS.y, F.k), lerp(G.s, FOCUS.s, F.k), 1);
  } else {
    P3.order.forEach((m, i) => draw(ctx, i, PX(i), PY, G.s, 1));
  }
}

// ---------------------------------------------------------------- 雷峰塔
const TOWER_KEY = {gpt: 'tower_gpt', op: 'tower_op', ds: 'tower_ds'};
// 三座塔在画面里的大小统一：录制时机位一致，这里按各自塔身占比补一个基础放大
const TOWER_BASE = {gpt: {z: 1.45, fy: .5}, op: {z: 1.4, fy: .46}, ds: {z: 1.05, fy: .52}};
function towerContent(i, t) {
  const m = P3.order[i], ts = .3 + Math.max(0, t - EV.towers) * TOWER_RATE;
  const B = TOWER_BASE[m];
  let z = {z: 1, fx: .5, fy: .5};
  if (m === 'gpt') z = keyed(t, [[0, {z: 1, fx: .5, fy: .5}], [EV.gpt_detail, {z: 1.7, fx: .5, fy: .42}], [EV.gpt_back - .2, {z: 1, fx: .5, fy: .5}]], .7);
  if (m === 'ds') z = keyed(t, [[0, {z: 1, fx: .5, fy: .5}], [EV.water, {z: 1.9, fx: .16, fy: .6}], [EV.fog, {z: 1.7, fx: .8, fy: .46}], [EV.mount, {z: 1.9, fx: .82, fy: .34}], [EV.whole, {z: 1, fx: .5, fy: .5}]], .55);
  return fillZoom(TOWER_KEY[m], ts, z.z * B.z, z.fx, z.z > 1.01 ? z.fy : B.fy);
}
function markOf(kind) { const d = X.data[kind]; return Object.fromEntries(Object.keys(d).map(m => [m, {time: d[m][0], tok: d[m][1], cost: d[m][2]}])); }

VIS[302] = (ctx, t, s) => {
  bgLight(ctx, t);
  const spans = [[0, EV.gpt_front, EV.gpt_back], [2, EV.ds_front3, EV.ds_back3], [1, EV.op_front, EV.op_back]];
  triPanels(ctx, t, {kind: 'tw', aIn: EV.towers, aOut: EV.towers_out, spans, content: towerContent, mark: markOf('tower'),
    extra: (g, i, M, sc) => {
      // Opus「敷衍」：画面褪色 + 轻轻一抖
      if (P3.order[i] === 'op' && t > EV.fuyan - .1 && t < EV.op_back + .6) {
        const k = seg(t, EV.fuyan - .1, EV.fuyan + .3) * (1 - seg(t, EV.op_back, EV.op_back + .6));
        const q = E.quadOf(M, [0, 0, P3.w, P3.h]); g.save(); E.pathPoly(g, q); g.clip();
        g.globalCompositeOperation = 'saturation'; g.globalAlpha = .75 * k; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); g.restore();
      }
    }});
  if (t > EV.fuyan && t < EV.fuyan + .45) E.shake(ctx, 1 - (t - EV.fuyan) / .45, Math.floor(t * 30));
  hostMorph(ctx, t, 1);
};

// ---------------------------------------------------------------- 便利店
const STORE_KEY = {gpt: 'store_gpt', op: 'store_op', ds: 'store_ds'};
// 三家店铺占比统一（Opus 的地块本身更大）
const STORE_BASE = {gpt: {z: 1.2, fx: .5, fy: .5}, op: {z: 1.0, fx: .5, fy: .5}, ds: {z: 1.25, fx: .5, fy: .5, filter: 'brightness(1.55) contrast(1.08) saturate(1.15)'}};
function storeTs(m, t) {
  let ts = Math.max(0, t - EV.stores);
  if (m === 'gpt' && t >= EV.gpt_replay) ts = t - EV.gpt_replay;   // 回放：凭空出现
  if (m === 'op' && t >= EV.op_replay) ts = t - EV.op_replay;      // 回放：生长做得很好
  return ts;
}
function storeContent(i, t) {
  const m = P3.order[i];
  let z = {z: 1, fx: .5, fy: .5};
  if (m === 'op') z = keyed(t, [[0, {z: 1, fx: .5, fy: .5}], [EV.op_lamp, {z: 1.8, fx: .5, fy: .52}], [EV.op_dark, {z: 2.4, fx: .5, fy: .54}], [EV.ds_front5 - .3, {z: 1, fx: .5, fy: .5}]], .6);
  const B = STORE_BASE[m];
  return fillZoom(STORE_KEY[m], storeTs(m, t), z.z * B.z, z.z > 1.01 ? z.fx : B.fx, z.z > 1.01 ? z.fy : B.fy, B.filter || '');
}
function storeScene(ctx, t) {
  const spans = [[2, EV.ds_front4, EV.gpt_front4 - .35], [0, EV.gpt_front4, EV.op_front4 - .35], [1, EV.op_front4, EV.ds_front5 - .35], [2, EV.ds_front5, EV.stores_out - .1]];
  triPanels(ctx, t, {kind: 'st', aIn: EV.stores - .5 * 0, aOut: EV.stores_out, spans, content: storeContent, mark: markOf('store'),
    extra: (g, i, M, sc) => {
      const m = P3.order[i];
      // 回放提示：短暂的倒带故障
      for (const [mm, tr] of [['gpt', EV.gpt_replay], ['op', EV.op_replay]]) {
        if (m === mm && t > tr - .25 && t < tr + .1) {
          const q = E.quadOf(M, [0, 0, P3.w, P3.h]); g.save(); E.pathPoly(g, q); g.clip(); E.glitch(g, 1 - Math.abs(t - tr + .07) / .2, Math.floor(t * 40)); g.restore();
        }
      }
      // Opus「里面啥都看不到」：画面压暗
      if (m === 'op' && t > EV.op_dark - .2 && t < EV.ds_front5) {
        const k = seg(t, EV.op_dark - .2, EV.op_dark + .3) * (1 - seg(t, EV.ds_front5 - .5, EV.ds_front5));
        const q = E.quadOf(M, [0, 0, P3.w, P3.h]); g.save(); E.pathPoly(g, q); g.clip(); g.fillStyle = `rgba(0,0,0,${.45 * k})`; g.fillRect(0, 0, W, H); g.restore();
      }
      // 第一名：DeepSeek 画面右上角金色奖牌
      if (m === 'ds' && t > EV.first - .1) {
        const u = seg(t, EV.first - .1, EV.first + .35), uo = seg(t, EV.stores_out, EV.stores_out + .3);
        const [mx, my] = E.mapPt(M, P3.w - 40, 200);
        medal(g, mx, my, 92 * sc * backOut(u, 2.2) * (1 - uo), t);
      }
    }});
}
function medal(g, x, y, r, t) {
  if (r <= 1) return;
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3) * .06);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
  const gr = g.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.6, '#f4c430'); gr.addColorStop(1, '#c8921a');
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = r * .1; g.strokeStyle = '#fff6d0'; g.stroke();
  g.font = `${Math.round(r * 1.25)}px Num`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#7a4d00'; g.fillText('1', 0, r * .08);
  g.restore();
}
VIS[306] = (ctx, t, s) => {
  bgLight(ctx, t);
  if (t < EV.towers_out + 1.2) {   // 塔从上一镜头延续，到「三渲二」前离场
    const spans = [[1, EV.op_front, EV.op_back]];
    triPanels(ctx, t, {kind: 'tw', aIn: EV.towers, aOut: EV.towers_out, spans, content: towerContent, mark: markOf('tower')});
  }
  storeScene(ctx, t);
  hostMorph(ctx, t, 1);
};

// ---------------------------------------------------------------- ⑤ 自反馈学习：文字特写（倾斜页面 + 高亮扫过）
const RL_IMG = {w: 749, h: 179};
// 高亮区域（截图像素坐标）：第一行「基于自反馈的强化学习（RL）训练技术」，第二行「3D 建模等方面从零开始构建完整项目的能力」
const RL_HL = [{ev: 'rl_hl1', box: [280, 66, 556, 90]}, {ev: 'rl_hl2', box: [556, 66, 712, 90]}, {ev: 'rl_hl3', box: [30, 94, 380, 118]}];
VIS[310] = (ctx, t, s) => {
  bgLight(ctx, t);
  const ui = seg(t, EV.rl_in, EV.rl_in + .8), uo = seg(t, EV.sec4 - .45, EV.sec4);
  if (ui > 0 && uo < 1) {
    const sc = 2.05, w = RL_IMG.w * sc, h = RL_IMG.h * sc + 120;
    const c = E.tmp('rl_card', Math.round(w), Math.round(h)), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    const im = E.img('自反馈学习');
    // 先画高亮（在字下面）
    for (const hl of RL_HL) {
      const u = seg(t, EV[hl.ev], EV[hl.ev] + .7); if (u <= 0) continue;
      const [x0, y0, x1, y1] = hl.box.map(v => v * sc);
      g.fillStyle = 'rgba(46,204,212,.55)'; g.fillRect(x0 - 6, 60 + y0 - 2, (x1 - x0 + 12) * eOut(u, 3), y1 - y0 + 6);
    }
    if (E.ready(im)) { g.globalCompositeOperation = 'multiply'; g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 60, w, RL_IMG.h * sc); g.globalCompositeOperation = 'source-over'; }
    // 镜头慢推 + 倾斜页面（参考图的拍屏特写）
    const push = lerp(1, 1.3, eInOut(seg(t, EV.rl_in, EV.sec4)));
    const k = eOut(ui, 4);
    E.persp(ctx, c, c.width, c.height, 1060, 470, {scale: lerp(.8, 1, k) * push * (1 - .1 * uo), ry: lerp(-24, -10, k), rx: lerp(18, 12, k), rz: -3, a: clamp(ui * 2, 0, 1) * (1 - uo), radius: 18, shadowK: .4, n: 14});
  }
  hostMorph(ctx, t, 1);
};
