"""把模型生成的 HTML 演示按虚拟时钟逐帧录成素材（原 HTML 不改动）。

- Playwright 假时钟：Date / performance.now / requestAnimationFrame 全部由我们推进，逐帧确定。
- Math.random 固定种子；网页里的标题、面板、按钮等小字全部隐藏，只留画布。
- 统一机位：three.js 页面在每次主相机渲染前，按同一套环绕参数（仰角、转速、方向）摆相机。
用法：python3 record_html.py <配置名> [--probe]
"""
import asyncio, json, os, re, sys, pathlib, subprocess, shutil, tempfile, time

HERE = pathlib.Path(__file__).resolve().parent
# —— 换项目时改这几行 ——
SRC = pathlib.Path(os.environ.get('REC_SRC', HERE.parent.parent / '素材'))        # HTML 素材根目录（配置里 file 相对它）
OUT = pathlib.Path(os.environ.get('REC_OUT', HERE.parent / 'media' / 'demo'))   # 录好的 mp4 放这里
FRAMES = pathlib.Path(os.environ.get('REC_FRAMES', pathlib.Path(tempfile.gettempdir()) / 'rec_frames'))
# 网页从 CDN 引 three.js 时改走本地副本（云端机器常常连不上 CDN）：git clone three.js 对应 tag 放到这里
THREE_DIR = pathlib.Path(os.environ.get('THREE_DIR', pathlib.Path.home() / 'tools'))
THREE = {'0.128.0': str(THREE_DIR / 'three-r128'), '0.160.0': str(THREE_DIR / 'three-r160')}
CFG = json.load(open(HERE / 'record_config.json'))

RAF = r"""
(() => {
  // 每个录制帧只渲染一次：rAF 改为按录制帧率的（假）定时器；每帧开头先摆好主相机
  const C = window.__REC; const FPS = window.__REC_FPS || 24;
  window.requestAnimationFrame = cb => setTimeout(() => { try { C && C.place && C.place(); } catch (e) {} cb(performance.now()); }, 1000 / FPS - 0.5);
  window.cancelAnimationFrame = id => clearTimeout(id);
})();
"""

INIT = r"""
(() => {
  // 固定随机种子
  let s = 0x9E3779B9 ^ (window.__SEED || 7);
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const C = window.__REC = window.__REC || {};
  C.first = null; C.locked = false; C.setting = false; C.allowOrtho = !!window.__ALLOW_ORTHO;
  function lockCam(cam) {
    // 主相机只接受我们的摆位：页面自己的相机控制（OrbitControls、自定义镜头）改不动它
    const P = cam.position, Q = cam.quaternion;
    for (const k of ['set', 'copy', 'add', 'sub', 'addVectors', 'lerp', 'setFromSpherical', 'setFromSphericalCoords', 'applyQuaternion', 'addScaledVector', 'setX', 'setY', 'setZ', 'multiplyScalar', 'applyMatrix4', 'fromArray'])
      if (typeof P[k] === 'function') { const f = P[k]; P[k] = function () { return C.setting ? f.apply(this, arguments) : this; }; }
    for (const k of ['set', 'copy', 'setFromRotationMatrix', 'setFromEuler', 'slerp', 'multiply', 'premultiply', 'setFromAxisAngle'])
      if (typeof Q[k] === 'function') { const f = Q[k]; Q[k] = function () { return C.setting ? f.apply(this, arguments) : this; }; }
    const la = cam.lookAt; cam.lookAt = function () { return C.setting ? la.apply(this, arguments) : this; };
  }
  function place(cam) {
    const o = C.orbit, t = performance.now() / 1000 - (o.tStart || 0);
    const az = (o.az0 + o.omega * t) * Math.PI / 180, el = (o.el + (o.del || 0) * t) * Math.PI / 180;
    const r = o.r + (o.dr || 0) * t;
    const [tx, ty0, tz] = o.target, ty = ty0 + (o.dy || 0) * t;
    C.setting = true;
    cam.position.set(tx + r * Math.cos(el) * Math.sin(az), ty + r * Math.sin(el), tz + r * Math.cos(el) * Math.cos(az));
    if (o.fov && cam.fov !== o.fov) { cam.fov = o.fov; cam.updateProjectionMatrix(); }
    cam.up && cam.up.set(0, 1, 0);
    cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(true);
    C.setting = false;
  }
  function hook(cam, renderer, scene) {
    if (!cam || !(cam.isPerspectiveCamera || cam.isOrthographicCamera)) return;
    if (cam.isOrthographicCamera && !C.allowOrtho) return;
    if (cam.isPerspectiveCamera && Math.abs(cam.fov - 90) < 0.01) return;
    // 主相机：渲染的场景物体最多的那个（排除后期处理的全屏四边形、立方体贴图相机）
    const n = scene && scene.children ? scene.children.length : 0;
    C.cand = C.cand || new Map(); C.calls = (C.calls || 0) + 1;
    C.cand.set(cam, Math.max(C.cand.get(cam) || 0, n));
    if (!C.first && window.__CAM_EXPR) { try { const c0 = (0, eval)(window.__CAM_EXPR); if (c0 && c0.isCamera) { C.first = c0; const p = c0.position; C.pose = {pos: [p.x, p.y, p.z], fov: c0.fov, viaApi: true}; } } catch (e) {} }
    if (!C.first && !window.__CAM_EXPR && C.calls >= 6) {
      let best = null, bn = -1; for (const [c, k] of C.cand) if (k > bn) { bn = k; best = c; }
      C.first = best; const p = best.position;
      const d = best.getWorldDirection ? best.getWorldDirection(p.clone()) : null;
      C.pose = {pos: [p.x, p.y, p.z], dir: d ? [d.x, d.y, d.z] : null, fov: best.fov, ortho: !!best.isOrthographicCamera, n: bn};
    }
    if (C.first && C.orbit && !C.locked) { lockCam(C.first); C.locked = true; }
    if (C.first && C.orbit && cam === C.first) place(C.first);
  }
  function wrap(obj) {
    if (!obj || obj.__recWrapped || typeof obj.render !== 'function') return;
    const orig = obj.render; obj.__recWrapped = true;
    obj.render = function (scene, camera) { try { hook(camera, this, scene); } catch (e) {} return orig.apply(this, arguments); };
  }
  C.wrap = wrap;
  C.place = () => { if (C.first && C.orbit) { if (!C.locked) { lockCam(C.first); C.locked = true; } place(C.first); } };
  // r150+：构造函数里 this.isWebGLRenderer = true —— 借原型上的 setter 拿到实例
  Object.defineProperty(Object.prototype, 'isWebGLRenderer', { configurable: true,
    set(v) { Object.defineProperty(this, 'isWebGLRenderer', {value: v, writable: true, configurable: true}); const self = this; queueMicrotask(() => wrap(self)); },
    get() { return undefined; } });
  // r128：this.render = function(...) 在构造函数里赋值
  Object.defineProperty(Object.prototype, 'render', { configurable: true,
    set(fn) {
      let f = fn;
      if (typeof fn === 'function') f = function (scene, camera) { if (this && this.domElement && this.getContext && camera) { try { hook(camera, this, scene); } catch (e) {} } return fn.apply(this, arguments); };
      Object.defineProperty(this, 'render', {value: f, writable: true, configurable: true, enumerable: true});
    },
    get() { return undefined; } });
  // 只留画布：其余网页文字、面板、按钮隐藏
  const css = document.createElement('style');
  css.textContent = (window.__HIDE_UI === false ? '' : '*{visibility:hidden !important;cursor:none !important} canvas{visibility:visible !important}') + (window.__EXTRA_CSS || '');
  const add = () => (document.head || document.documentElement).appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
"""


async def route_cdn(route):
    url = route.request.url
    m = re.search(r'three@([\d.]+)/(.*)$', url)
    if m and m.group(1) in THREE:
        p = pathlib.Path(THREE[m.group(1)]) / m.group(2).split('?')[0]
        if p.exists():
            return await route.fulfill(path=str(p), content_type='application/javascript')
    print('  MISSING', url)
    await route.fulfill(status=404, body='')


async def run(name, probe=False):
    from playwright.async_api import async_playwright
    c = CFG[name]
    w, h, fps = c.get('w', 720), c.get('h', 1080), c.get('fps', 24)
    pre, dur = c.get('pre', 0.0), c.get('dur', 12.0)
    fdir = FRAMES / name
    shutil.rmtree(fdir, ignore_errors=True); fdir.mkdir(parents=True)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        pg.set_default_timeout(180000)
        pg.on('pageerror', lambda e: print('  PAGEERR', str(e)[:160]))
        await pg.route(re.compile(r'https?://(cdn\.jsdelivr\.net|unpkg\.com)/.*'), route_cdn)
        await pg.route(re.compile(r'https?://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.fulfill(status=200, body=''))
        await pg.add_init_script('window.__HIDE_UI=%s;window.__EXTRA_CSS=%s;window.__ALLOW_ORTHO=%s;window.__CAM_EXPR=%s;window.__REC_FPS=%d;' % (json.dumps(c.get('hide_ui', True)), json.dumps(c.get('css', '')), json.dumps(c.get('ortho', False)), json.dumps(c.get('cam', '')), fps) + INIT)
        await pg.clock.install(time=1_700_000_000_000)
        await pg.clock.pause_at(1_700_000_000_050)
        await pg.add_init_script(RAF)
        import unicodedata
        fpath = next(p for p in SRC.glob('*/*.html') if unicodedata.normalize('NFC', str(p.relative_to(SRC))) == unicodedata.normalize('NFC', c['file']))
        await pg.goto(fpath.as_uri(), wait_until='load', timeout=120000)
        if c.get('orbit') and probe is False:
            await pg.evaluate('o => { window.__REC.orbit = o; }', c['orbit'])
        clock_ms = 0
        async def tick(frame_idx):
            nonlocal clock_ms
            target = int(round(frame_idx * 1000 / fps))
            if target > clock_ms:
                await pg.clock.run_for(target - clock_ms); clock_ms = target
        # 预跑：让页面完成加载动画（不取帧）
        for act in c.get('actions', []):
            pass
        t_ms, nxt_action = 0.0, 0
        actions = sorted(c.get('actions', []), key=lambda a: a['t'])
        async def do_actions(now):
            nonlocal nxt_action
            while nxt_action < len(actions) and actions[nxt_action]['t'] <= now:
                a = actions[nxt_action]; nxt_action += 1
                if a['type'] == 'keydown': await pg.keyboard.down(a['key'])
                elif a['type'] == 'keyup': await pg.keyboard.up(a['key'])
                elif a['type'] == 'press': await pg.keyboard.press(a['key'])
                elif a['type'] == 'click': await pg.mouse.click(a['x'], a['y'])
                elif a['type'] == 'js': await pg.evaluate(a['code'])
        pre_steps = int(round(pre * fps))
        t_pre0 = time.time()
        for k in range(pre_steps):
            await do_actions(k / fps)
            await tick(k + 1)
            if k % 30 == 0: await pg.wait_for_timeout(1)
        if probe == 'still':
            if c.get('orbit'): await pg.evaluate('o => { window.__REC.orbit = o; }', c['orbit'])
            for k2, extra in enumerate([0, c.get('still_gap', 6)]):
                await tick(pre_steps + 1 + int(extra * fps))
                await pg.screenshot(path=str(HERE.parent / f'_still_{name}_{k2}.jpg'), type='jpeg', quality=80)
            await b.close(); return
        if probe:
            await tick(pre_steps + 1)
            pose = await pg.evaluate('JSON.stringify(window.__REC.pose||null)')
            print('POSE', pose)
            await pg.screenshot(path=str(OUT.parent.parent / f'_probe_{name}.jpg'), type='jpeg', quality=80)
            await b.close(); return
        n = int(round(dur * fps))
        t1 = time.time()
        for k in range(n):
            await do_actions(pre + k / fps)
            await tick(pre_steps + k + 1)
            await pg.screenshot(path=str(fdir / f'{k:05d}.jpg'), type='jpeg', quality=92)
            if k % 60 == 0:
                print(f'  {name} frame {k}/{n}  {(time.time()-t1)/(k+1):.2f}s/f', flush=True)
        await b.close()
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f'{name}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', str(fdir / '%05d.jpg'),
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', str(c.get('crf', 22)), '-g', '15', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(out)], check=True)
    print('wrote', out, out.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    mode = 'still' if '--still' in sys.argv else ('--probe' in sys.argv)
    for nm in sys.argv[1].split(','):
        asyncio.run(run(nm, mode))
