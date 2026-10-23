// ⑪ 接入教程：DeepSeek Harness → 登录账号 / 添加 API Key / 创建 API Key 演示 → CC Switch 接入 Codex → 其他产品
// ⑫ 余额：余额高亮 → 余额用尽还让 Codex 分析
// ⑬ 搜索 API：文字特写 → 「拉」「狠拉」人物后景花字 → 数据源 → 优缺点 → 结尾
'use strict';

// ---------------------------------------------------------------- 录屏演示：跳切 + 放大 + 高亮（台词点到哪就切到哪）
// cuts: [{at, src, rate, z, fx, fy, hl:[x0,y0,x1,y1]（素材像素）}]
const DEMO = {vw: 738, vh: 480, cx: 1040, cy: 495, w: 1400};
DEMO.h = Math.round((DEMO.w - 46) * DEMO.vh / DEMO.vw) + 46;
function demoContent(key, t, cuts) {
  return (g, x, y, w, h) => {
    if (!(key in window.VSRC)) { g.fillStyle = '#1b1f29'; g.fillRect(x, y, w, h); return; }
    let i = 0; for (let k = 0; k < cuts.length; k++) if (t >= cuts[k].at) i = k;
    const c = cuts[i], p = cuts[Math.max(0, i - 1)];
    const ts = c.src + Math.max(0, t - c.at) * (c.rate == null ? 1 : c.rate);
    const v = E.video(key, ts, c.rate == null ? 1 : c.rate); if (!E.ready(v)) return;   // 倍速要传给播放器，否则网页预览时会被反复拉回（一闪一闪）
    // 放大位置在切点后 0.7 秒内平滑过渡（阿亮：运镜不要太快）
    const u = i === 0 ? 1 : eInOut(seg(t, c.at, c.at + .7));
    const z = lerp(p.z || 1, c.z || 1, u), fx = lerp(p.fx == null ? .5 : p.fx, c.fx == null ? .5 : c.fx, u), fy = lerp(p.fy == null ? .5 : p.fy, c.fy == null ? .5 : c.fy, u);
    const cw = DEMO.vw / z, ch = DEMO.vh / z;
    const sx = clamp(fx * DEMO.vw - cw / 2, 0, DEMO.vw - cw), sy = clamp(fy * DEMO.vh - ch / 2, 0, DEMO.vh - ch);
    g.drawImage(v, sx, sy, cw, ch, x, y, w, h);
    // 跳切不加白闪（阿亮：不要一闪一闪的）
    if (c.hl) {
      const k = seg(t, c.at + .25, c.at + .6) * (c.hlEnd == null ? 1 : 1 - seg(t, c.at + c.hlEnd, c.at + c.hlEnd + .25));
      if (k > 0) {
        const mx = px => x + (px - sx) * w / cw, my = py => y + (py - sy) * h / ch;
        const [x0, y0, x1, y1] = c.hl, pad = 8;
        const bx = mx(x0) - pad, by = my(y0) - pad, bw = mx(x1) - mx(x0) + 2 * pad, bh = my(y1) - my(y0) + 2 * pad;
        // 其余区域轻微压暗，框住的地方发光
        g.save(); g.fillStyle = `rgba(0,0,0,${.35 * k})`; g.beginPath(); g.rect(x, y, w, h); rr(g, bx, by, bw, bh, 12); g.fill('evenodd'); g.restore();
        g.save(); rr(g, bx, by, bw, bh, 12); g.lineWidth = 5; g.strokeStyle = `rgba(255,138,61,${k})`; g.shadowColor = 'rgba(255,138,61,.9)'; g.shadowBlur = 22; g.stroke(); g.restore();
        // 点击波纹
        const cr = seg(t, c.at + .45, c.at + 1.0);
        if (cr > 0 && cr < 1) { g.save(); g.globalAlpha = 1 - cr; g.lineWidth = 4; g.strokeStyle = '#ffb27a'; g.beginPath(); g.arc(bx + bw / 2, by + bh / 2, 14 + 50 * eOut(cr), 0, 7); g.stroke(); g.restore(); }
      }
    }
  };
}
function demoCard(ctx, t, key, cuts, o = {}) {
  return windowCard(ctx, {t, key: 'demo_' + key, cx: DEMO.cx, cy: DEMO.cy, w: DEMO.w, h: DEMO.h, flat: true, content: demoContent(key, t, cuts), ...o});
}

VIS[1101] = (ctx, t, s) => { bgLight(ctx, t); hostMorph(ctx, t, 1 - seg(t, s.start, s.start + .7)); };
// 推荐方案：DeepSeek → DeepSeek Harness（箭头连接）
VIS[1102] = (ctx, t, s) => {
  aroll(ctx, t);
  const ai = seg(t, EV.dsh_in - .2, EV.dsh_in + .3);
  if (ai > 0) {
    ctx.save(); ctx.globalAlpha = ai; ctx.setLineDash([18, 14]); ctx.lineDashOffset = -t * 60;
    E.line(ctx, [[420, 360], [lerp(420, 1460, eOut(ai)), 360]], [255, 255, 255], 1, 6); ctx.restore();
    personCut(ctx, t, 'person_c', 246.0);          // 虚线从人身后穿过（阿亮）：抠像人物盖回最上层
  }
  badgePop(ctx, t, 'ds', 300, 360, 96, EV.dsh_ds, null, {side: 'below', nameSize: 44});   // 徽章在人前面（两侧，不挡人）
  badgePop(ctx, t, 'dsh', 1600, 360, 110, EV.dsh_in, null, {side: 'below', nameSize: 46});
  const all = Math.max(0, 1 - Math.abs(t - EV.dsh_all - .3) / .5);
  if (all > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = all * .6; E.ring(ctx, 1600, 360, 140 + 30 * all, [140, 170, 255], 1, 8); ctx.restore(); }
};
// 登录账号：前 10 秒，鼠标移动跳过，点到的地方高亮
const LA_CUTS = () => [
  {at: EV.la_in, src: .2, rate: .25},
  {at: EV.la_1, src: 1.7, z: 1.9, fx: .1, fy: .9, hl: [8, 436, 62, 453]},
  {at: EV.la_2, src: 6.4, z: 1.7, fx: .55, fy: .55, hl: [428, 255, 464, 273]},
  {at: EV.la_3, src: 9.1, z: 1.7, fx: .6, fy: .55, hl: [443, 255, 472, 273]},
  {at: EV.la_4, src: 21.7, z: 1.6, fx: .7, fy: .5, hl: [480, 165, 652, 252]},
];
VIS[1103] = (ctx, t, s) => {
  bgLight(ctx, t);
  demoCard(ctx, t, 'login_acc', LA_CUTS(), {a: EV.la_in - .1});
  hostMorph(ctx, t, seg(t, EV.la_in - .35, EV.la_in + .35));     // 先纯 A-roll，说到「这里有两种接入方式」再缩到左下角
};
// 添加 API Key
const AP_CUTS = () => [
  {at: EV.ap_in, src: 2.6},
  {at: EV.ap_1, src: 4.4, z: 1.6, fx: .3, fy: .28, hl: [180, 107, 246, 124]},
  {at: EV.ap_2, src: 6.4, z: 1.6, fx: .62, fy: .3, hl: [520, 124, 553, 141]},
  {at: EV.ap_3, src: 8.3, z: 1.6, fx: .55, fy: .42, hl: [289, 180, 541, 198]},
];
VIS[1104] = (ctx, t, s) => {
  bgLight(ctx, t);
  demoCard(ctx, t, 'login_acc', LA_CUTS(), {b: s.start - .02, dOut: .35});
  demoCard(ctx, t, 'login_api', AP_CUTS(), {a: s.start + .05});
  hostMorph(ctx, t, 1);
};
VIS[1105] = (ctx, t, s) => {
  bgLight(ctx, t);
  demoCard(ctx, t, 'login_api', AP_CUTS(), {b: s.start - .02, dOut: .35});
  hostMorph(ctx, t, 1 - seg(t, s.start + .1, s.start + .8));
};
// 创建 API Key：从 14 秒开始
const CK_CUTS = () => [
  {at: EV.ck_1 - .3, src: 13.4, rate: 1},
  {at: EV.ck_1 + .1, src: 14.4, z: 1.7, fx: .12, fy: .3, hl: [10, 142, 120, 161]},
  {at: EV.ck_2, src: 16.0, z: 1.7, fx: .82, fy: .35, hl: [600, 163, 660, 182]},
  {at: EV.ck_3, src: 18.5, z: 1.7, fx: .5, fy: .55, hl: [286, 263, 451, 282]},
  {at: EV.ck_3 + .75, src: 20.3, z: 1.7, fx: .52, fy: .58, hl: [414, 291, 451, 309]},
  {at: EV.ck_4, src: 27.4, z: 1.6, fx: .55, fy: .42, hl: [289, 180, 541, 198]},
  {at: EV.ck_5, src: 31.8, z: 1.6, fx: .6, fy: .45, hl: [504, 225, 543, 244]},
];
VIS[1106] = (ctx, t, s) => {
  bgLight(ctx, t);
  demoCard(ctx, t, 'login_api', CK_CUTS(), {key: 'demo_api2', a: s.start - .05});
  hostMorph(ctx, t, seg(t, s.start, s.start + .7));
};
// Codex：先纯 A-roll，说到「配置起来也非常简单」再进录屏（阿亮）；不推近，只高亮（框已逐个对过素材帧）
const CX_CUTS = () => [
  {at: EV.cx_easy, src: 1.6, rate: 1},
  {at: EV.cx_gpt, src: 3.3, hl: [508, 151, 710, 191]},
  {at: EV.cx_key, src: 8.6, hl: [299, 152, 503, 189]},
  {at: EV.cx_paste, src: 13.4, hl: [164, 256, 715, 281]},
  {at: EV.cx_test, src: 16.6, hl: [654, 298, 717, 314]},
  {at: EV.cx_run, src: 20.2, hl: [625, 75, 698, 96]},
  {at: EV.cx_save, src: 22.6, hl: [661, 450, 721, 472]},
  {at: EV.cx_back, src: 27.2, hl: [626, 147, 661, 167]},
  {at: EV.cx_model, src: 35.2, hl: [466, 396, 644, 414], hlEnd: .95},   // 下拉框 1 秒后关掉，高亮跟着收
];
VIS[1107] = (ctx, t, s) => {
  bgLight(ctx, t);
  demoCard(ctx, t, 'login_api', CK_CUTS(), {key: 'demo_api2', b: s.start - .02, dOut: .35});
  demoCard(ctx, t, 'codex', CX_CUTS(), {a: EV.cx_easy + .05});
  // 头像：先放大回全屏口播，「配置起来也非常简单」时再缩回左下角
  hostMorph(ctx, t, Math.max(1 - seg(t, s.start + .05, s.start + .75), seg(t, EV.cx_easy - .15, EV.cx_easy + .55)));
};
// 其他产品：名字徽章（没有 logo），连到 DeepSeek
function namePill(ctx, text, x, y, a, s = 1, col = [77, 107, 254]) {
  if (a <= .01) return;
  ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = '64px Black'; const tw = ctx.measureText(text).width; const w = tw + 150, h = 120;
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  rr(ctx, -w / 2, -h / 2, w, h, 60); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 5; ctx.strokeStyle = E.rgb(col); ctx.stroke();
  ctx.beginPath(); ctx.arc(-w / 2 + 62, 0, 38, 0, 7); ctx.fillStyle = E.rgb(col); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '50px Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text[0], -w / 2 + 62, 2);
  ctx.font = '64px Black'; ctx.fillStyle = '#15171c'; ctx.textAlign = 'left'; ctx.fillText(text, -w / 2 + 116, 4);
  ctx.restore();
}
VIS[1108] = (ctx, t, s) => {
  bgLight(ctx, t);
  demoCard(ctx, t, 'codex', CX_CUTS(), {b: s.start - .02, dOut: .35});
  const bi = seg(t, EV.builtin - .1, EV.builtin + .4);
  if (bi > 0) {
    ctx.save(); ctx.globalAlpha = bi; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 50;
    E.line(ctx, [[760, 330], [1060, 540]], [140, 150, 170], 1, 5); E.line(ctx, [[1360, 330], [1060, 540]], [140, 150, 170], 1, 5); ctx.restore();
  }
  namePill(ctx, 'WorkBuddy', 760, 300, seg(t, EV.wb - .1, EV.wb + .25), backOut(seg(t, EV.wb - .1, EV.wb + .35), 2), [255, 140, 60]);
  namePill(ctx, 'Kimi Code', 1360, 300, seg(t, EV.kimi - .1, EV.kimi + .25), backOut(seg(t, EV.kimi - .1, EV.kimi + .35), 2), [30, 30, 36]);
  badgePop(ctx, t, 'ds', 1060, 600, 100, EV.builtin, null, {side: 'below', theme: 'light', nameSize: 46});
  hostMorph(ctx, t, 1);
};

// ---------------------------------------------------------------- ⑫ 余额
VIS[1201] = (ctx, t, s) => {
  bgLight(ctx, t);
  const w = 1420, h = Math.round(w * 1240 / 1838 * .62);   // 只取截图上半部分（余额卡片）
  const M = windowCard(ctx, {t, key: 'bal', cx: 1040, cy: 480, w, h: h + 46, a: EV.bal_in, flat: true,
    content: (g, x, y, ww, hh) => { const im = E.img('余额'); if (E.ready(im)) g.drawImage(im, 0, 0, 1838, 1240 * .62, x, y, ww, hh); }});
  if (M) {
    const k = seg(t, EV.bal_hl, EV.bal_hl + .4);
    if (k > 0) {
      const sx = (w - 46) / 1838, sy = h / (1240 * .62);
      const q = E.quadOf(M, [23 + 92 * sx, 23 + 308 * sy, 23 + lerp(92, 627, eOut(k, 3)) * sx, 23 + 490 * sy]);
      ctx.save(); E.pathPoly(ctx, q); ctx.lineWidth = 7; ctx.strokeStyle = '#ffb02e'; ctx.shadowColor = 'rgba(255,176,46,.9)'; ctx.shadowBlur = 26; ctx.stroke(); ctx.restore();
    }
  }
  hostMorph(ctx, t, 1);
};
VIS[1202] = (ctx, t, s) => {
  bgLight(ctx, t);
  const oops = Math.max(0, 1 - Math.abs(t - EV.oops - .2) / .35);
  const w = 1180, h = Math.round(w * 778 / 851 * .62);
  // 截图裁切：先看上半段，说到「还傻傻地」时推近到提问气泡（字够大）
  const zk = eInOut(seg(t, EV.fix_hl - .2, EV.fix_hl + .5));
  const cr = [lerp(0, 300, zk), lerp(0, 30, zk), lerp(851, 500, zk), lerp(778 * .62, 500 * h / (w - 46) * (851 / 851) * .56, zk)];
  cr[3] = cr[2] * h / (w - 46);
  const M = windowCard(ctx, {t, key: 'fix', cx: 1040, cy: 470, w, h: h + 46, a: EV.fix_in, flat: true,
    content: (g, x, y, ww, hh) => { g.fillStyle = '#fff'; g.fillRect(x, y, ww, hh); const im = E.img('修复dsh'); if (E.ready(im)) g.drawImage(im, cr[0], cr[1], cr[2], cr[3], x, y, ww, hh); }});
  windowCard(ctx, {t, key: 'bal', cx: 1040, cy: 480, w: 1420, h: Math.round(1420 * 1240 / 1838 * .62) + 46, b: s.start - .05, dOut: .4, flat: true,
    content: (g, x, y, ww, hh) => { const im = E.img('余额'); if (E.ready(im)) g.drawImage(im, 0, 0, 1838, 1240 * .62, x, y, ww, hh); }});
  if (M) {
    const k = seg(t, EV.fix_hl + .3, EV.fix_hl + .7);
    if (k > 0) {
      const sx = (w - 46) / cr[2], sy = h / cr[3];
      const q = E.quadOf(M, [23 + (350 - cr[0]) * sx, 23 + (66 - cr[1]) * sy, 23 + (lerp(350, 784, eOut(k, 3)) - cr[0]) * sx, 23 + (112 - cr[1]) * sy]);
      ctx.save(); E.pathPoly(ctx, q); ctx.lineWidth = 7; ctx.strokeStyle = '#ff5a5a'; ctx.shadowColor = 'rgba(255,90,90,.9)'; ctx.shadowBlur = 26; ctx.stroke(); ctx.restore();
    }
  }
  if (oops > 0) E.shake(ctx, oops * .7, Math.floor(t * 30));
  hostMorph(ctx, t, 1);
};

// ---------------------------------------------------------------- ⑬ 搜索 API
VIS[1301] = (ctx, t, s) => {
  bgLight(ctx, t);
  hostMorph(ctx, t, 1 - seg(t, s.start, s.start + .7));
  badgePop(ctx, t, 'ds', 1600, 330, 100, EV.pareto, null, {side: 'below', nameSize: 48});
};
// 文字特写：倾斜页面 + 标题高亮（和自反馈那段同一种处理）
VIS[1302] = (ctx, t, s) => {
  bgLight(ctx, t);
  const ui = seg(t, EV.api_in, EV.api_in + .8), uo = seg(t, s.end - .4, s.end);
  const iw = 730, ih = 473, sc = 2.0;
  const c = E.tmp('api_card', iw * sc, ih * sc), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  const u = seg(t, EV.api_hl, EV.api_hl + .6);
  if (u > 0) { g.fillStyle = 'rgba(46,204,212,.55)'; g.fillRect(28 * sc, 18 * sc, (160 * sc) * eOut(u, 3), 26 * sc); }
  const im = E.img('开放自研API'); if (E.ready(im)) { g.globalCompositeOperation = 'multiply'; g.drawImage(im, 0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
  const k = eOut(ui, 4), push = lerp(1, 1.1, eInOut(seg(t, EV.api_in, s.end)));
  E.persp(ctx, c, c.width, c.height, 1080, 545, {scale: lerp(.8, 1, k) * push, ry: lerp(-24, -10, k), rx: lerp(18, 12, k), rz: -3, a: clamp(ui * 2, 0, 1) * (1 - uo), radius: 18, shadowK: .4, n: 14});
  hostMorph(ctx, t, seg(t, s.start, s.start + .7));
};
// 人物后景花字：左边一个字，右边两个字（头在中间不挡字）
function behindWords(ctx, t, items, from = 335.0) {
  let kk = 0;
  for (const it of items) {
    const ui = seg(t, it.a - .05, it.a + .3), uo = seg(t, it.b, it.b + .4); if (ui <= 0 || uo >= 1) continue;
    kk = Math.max(kk, eOut(ui) * (1 - uo));
  }
  if (kk <= 0) return;
  ctx.fillStyle = `rgba(10,6,4,${.45 * kk})`; ctx.fillRect(0, 0, W, H);
  for (const it of items) {
    const ui = seg(t, it.a - .05, it.a + .3), uo = seg(t, it.b, it.b + .4); if (ui <= 0 || uo >= 1) continue;
    const sc = lerp(1.6, 1, eOut(ui, 5)) * (1 - .1 * eInOut(uo));
    ctx.save(); ctx.globalAlpha = clamp(ui * 3, 0, 1) * (1 - eInOut(uo)); ctx.translate(it.x, 360); ctx.scale(sc, sc); ctx.rotate(it.rot || 0);
    ctx.font = `${it.size || 330}px Black`; ctx.textAlign = it.align; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = '#2a0d05'; ctx.strokeText(it.text, 0, 0);
    const gr = ctx.createLinearGradient(0, -160, 0, 160); gr.addColorStop(0, '#ffd166'); gr.addColorStop(1, '#ff5a3c');
    ctx.shadowColor = 'rgba(255,90,60,.8)'; ctx.shadowBlur = 40; ctx.fillStyle = gr; ctx.fillText(it.text, 0, 0); ctx.restore();
  }
  personCut(ctx, t, 'person_b', from, Math.min(1, kk * 3));
}
VIS[1303] = (ctx, t, s) => {
  bgLight(ctx, t);
  const u = 1 - seg(t, s.start, s.start + .7);
  if (u > 0) hostMorph(ctx, t, u); else aroll(ctx, t);
  behindWords(ctx, t, [{text: '拉', a: EV.la_word, b: EV.la_out, x: 830, align: 'right', rot: -.06}, {text: '狠拉', a: EV.hen_la, b: EV.la_out, x: 1110, align: 'left', rot: .05}]);
};
// 数据源：「又少又拉」花字；某音 某书 某宝 某团 打叉
VIS[1304] = (ctx, t, s) => {
  aroll(ctx, t);
  behindWords(ctx, t, [{text: '又少', a: EV.src_in, b: EV.apps - .2, x: 830, align: 'right', size: 260}, {text: '又拉', a: EV.src_in + .35, b: EV.apps - .2, x: 1110, align: 'left', size: 260}]);
  const apps = ['某音', '某书', '某宝', '某团'], xs = [250, 560, 1360, 1670];
  apps.forEach((a, i) => {
    const ui = seg(t, EV.apps + i * .28, EV.apps + i * .28 + .35); if (ui <= 0) return;
    const sc = backOut(ui, 2);
    ctx.save(); ctx.translate(xs[i], 320); ctx.scale(sc, sc);
    rr(ctx, -130, -70, 260, 140, 36); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
    ctx.font = '72px Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#15171c'; ctx.fillText(a, 0, 4);
    const x = seg(t, EV.apps_x + i * .12, EV.apps_x + i * .12 + .25);
    if (x > 0) { ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = '#ff3b3b';
      ctx.beginPath(); ctx.moveTo(-90, -50); ctx.lineTo(lerp(-90, 90, eOut(x)), lerp(-50, 50, eOut(x))); ctx.stroke();
      if (x > .5) { const y2 = seg(x, .5, 1); ctx.beginPath(); ctx.moveTo(90, -50); ctx.lineTo(lerp(90, -90, y2), lerp(-50, 50, y2)); ctx.stroke(); } }
    ctx.restore();
  });
};
// 优缺点：不推荐 → 搜得快、没广告
VIS[1305] = (ctx, t, s) => {
  aroll(ctx, t);
  const pills = [['搜得快', EV.pro1, 330], ['没广告', EV.pro2, 1590]];
  for (const [txt, a, x] of pills) {
    const ui = seg(t, a - .1, a + .3); if (ui <= 0) continue;
    const sc = backOut(ui, 2);
    ctx.save(); ctx.translate(x, 330); ctx.scale(sc, sc);
    rr(ctx, -200, -75, 400, 150, 40); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#18b46b'; ctx.stroke();
    ctx.font = '76px Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#0e8a52'; ctx.fillText('✓ ' + txt, 0, 4);
    ctx.restore();
  }
};
// 结尾：口播 + DeepSeek 徽章，最后淡出
VIS[1306] = (ctx, t, s) => {
  aroll(ctx, t);
  badgePop(ctx, t, 'ds', 1600, 330, 100, EV.end + .4, null, {side: 'below', nameSize: 48});
  const fo = seg(t, s.end - .9, s.end);
  if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
};
