"""把四张网页截图按原排版高清重排（同样的文字、颜色、位置），浏览器按 DPR 倍率渲染（分镜表第 15、25、35、37 行的图）。
用法：python3 build.py 输出目录 [dpr倍率覆盖]
每行：{x, yc（原图墨迹中心）, f, html, right（满行两端对齐到的右边界，可选）, cls}
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
ASSETS = Path('/home/claude/repos/DeepSeekv1-flash/剪辑工程/assets')

SEARCH_ICON = '<svg class="sicon" viewBox="0 0 10 10"><circle cx="4" cy="4" r="2.8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6.1 6.1 8.6 8.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'

def L(x, yc, f, html, right=None, cls=''):
    return dict(x=x, yc=yc, f=f, html=html, right=right, cls=cls)

# ---------------------------------------------------------------- 1 自反馈学习 749×179
RL = dict(name='自反馈学习', w=749, h=179, dpr=4, dy=1.2, bg='#ffffff', css='''
  .t{color:#3a3a3a} .h{color:#1a1a1a;font-weight:700} .lk{color:#3c5a99}
  .sicon{width:.55em;height:.55em;vertical-align:.65em;margin:0 .05em 0 .1em;color:#3c5a99}
''', lines=[
    L(35, 29.5, 18.25, '从零开始的完整项目开发', cls='h'),
    L(35, 74.5, 15.5, 'DeepSeek V4.1 Flash 1017 通过基于自反馈的强化学习（RL）训练技术，提升了在游戏开发、', right=694, cls='t'),
    L(35, 101.5, 15.5, f'3D 建模等方面从零开始构建完整项目的能力，能够支持实现更多“<span class="lk">许愿式</span>”<span class="lk">编程</span>{SEARCH_ICON}任务及项目开', right=694, cls='t'),
    L(35, 128.5, 15.5, '发请求。以下案例展示了新版本模型在较少的提示词与素材参考条件下，在 DeepSeek Harness', right=694, cls='t'),
    L(35, 155.5, 15.5, '框架环境内通过极短的交互轮次直接实现的项目效果：', cls='t'),
])

# ---------------------------------------------------------------- 2 开放自研API 730×473
DASH = 'u'
API = dict(name='开放自研API', w=730, h=473, dpr=4, dy=0.8, bg='#ffffff', css='''
  .t{color:#3a3a3a} .h{color:#1a1a1a;font-weight:700} .b{color:#1f1f1f;font-weight:700} .lk{color:#3c5a99}
  .u{background-image:linear-gradient(90deg,#b0e9c7 0 4px,transparent 4px 7px);background-size:7px 2px;background-repeat:repeat-x;background-position:0 calc(100% - 1px);padding-bottom:3px}
  .sicon{width:.55em;height:.55em;vertical-align:.65em;margin:0 .05em 0 .1em;color:#3c5a99}
''', lines=[
    L(33, 31.5, 18.75, '开放自研搜索 API', cls='h'),
    L(33, 77, 15.5, '长期以来，DeepSeek 网页端与 API 端的搜索能力均由自研 DeepSeek 搜索引擎提供底层支', right=692, cls='t'),
    L(33, 103.5, 15.5, '持，稳定处理每天来自全球各地的数亿次搜索请求。', cls='t'),
    L(33, 154.5, 15.5, '<span class="u">DeepSeek 搜索是 AI 原生的通用搜索引擎，索引了全球千亿级网页，支持多语言搜索，实时返</span>', right=692, cls='t'),
    L(33, 181.5, 15.5, '<span class="u">回高相关、高权威、高时效的优质结果。针对 SEO 作弊、GEO 操纵和低质 AIGC，我们通过严</span>', right=692, cls='t'),
    L(33, 208.5, 15.5, '<span class="u">格的识别机制对其进行过滤，确保向用户与 LLM 呈现权威可信的信息。</span>', cls='t'),
    L(33, 260.5, 15.5, f'本次新版本发布 DeepSeek API 新增对 Search 与 <span class="lk">Fetch</span>{SEARCH_ICON} 接口的支持，相关能力正式向公众', right=692, cls='t'),
    L(33, 287.5, 15.5, '开放。两个接口价格均为 5 元 / 千次，<span class="b">详细使用方法请参考官方 API 文档：API 指南 – 网页搜</span>', right=692, cls='t'),
    L(33, 314.5, 15.5, '<span class="b">索与抓取。</span>', cls='t'),
    L(33, 366, 15.5, '请注意，当前用户在 DeepSeek Harness / Claude Code / Codex 中使用 DeepSeek API', right=692, cls='t'),
    L(33, 392.5, 15.5, '时，已经会通过 Server 端工具调用访问到 Search/Fetch 接口，<span class="b u">这部分 Search/Fetch 接口调</span>', right=692, cls='t'),
    L(33, 419.5, 15.5, '<span class="b u">用目前未计费，并将在两周后（北京时间 2026 年 11 月 1 日 00:00）开始按次收取调用费</span>', right=692, cls='t'),
    L(33, 446.5, 15.5, '<span class="b u">用。</span>', cls='t'),
])

# ---------------------------------------------------------------- 3 修复dsh 851×778
WRENCH = '<svg class="ic" viewBox="0 0 16 16"><path d="M10.6 2.2a3.6 3.6 0 0 0-3.9 4.7L2.4 11.2a1.3 1.3 0 0 0 1.8 1.9l4.3-4.3a3.6 3.6 0 0 0 4.7-3.9l-2 2-1.6-.4-.4-1.6z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'
DSICON = '<img class="ds" src="LOGO">'
FIX = dict(name='修复dsh', w=851, h=778, dpr=4, bg='#ffffff', css='''
  .t{color:#1d1f23} .g{color:#808183} .ts{color:#999a9b} .ub{color:#0b264a}
  .ic{width:1.05em;height:1.05em;vertical-align:-.17em;margin-right:.45em;color:#8a8b8d}
  .ds{width:1.05em;height:1.05em;vertical-align:-.17em;margin-right:.45em;filter:grayscale(1) brightness(.75) contrast(1.2);border-radius:50%}
  code{font-family:"DejaVu Sans Mono",monospace;font-size:.92em;background:#f2f2f3;border-radius:4px;padding:1px 5px;color:#2b2b2b}
''', shapes='''
  <div style="position:absolute;left:352px;top:68px;width:430px;height:43px;border-radius:21px;background:#e8f3fe"></div>
  <div style="position:absolute;left:46px;top:186px;width:736px;height:1px;background:#efefef"></div>
  <svg style="position:absolute;left:730px;top:121px;width:14px;height:14px" viewBox="0 0 14 14"><rect x="4" y="1.5" width="8.5" height="8.5" rx="1.8" fill="none" stroke="#8a8b8d" stroke-width="1.2"/><path d="M2.5 4.5v6.2a1.8 1.8 0 0 0 1.8 1.8h6.2" fill="none" stroke="#8a8b8d" stroke-width="1.2"/></svg>
  <svg style="position:absolute;left:758px;top:121px;width:14px;height:14px" viewBox="0 0 14 14"><path d="M2 12l.6-2.8 7-7a1.4 1.4 0 0 1 2 2l-7 7z" fill="none" stroke="#8a8b8d" stroke-width="1.2" stroke-linejoin="round"/></svg>
''', lines=[
    L(377, 42.5, 13, '星期一 16:14', cls='ts'),
    L(368, 89.5, 14, '我的桌面端DeepSeekharness连不上网了，你看这个给解决一下', cls='ub'),
    L(46, 168, 14, '活动', cls='g'),
    L(46, 214, 14, '我先检查 DeepSeekharness 的本机配置、进程和报错，定位是哪一段连接出了问题，再直接修复。', cls='t'),
    L(46, 252.5, 14, WRENCH + '加载了工具读取文件运行了命令', cls='g'),
    L(46, 290.5, 14, '已找到正在运行的 DeepSeek Harness。系统当前没有启用 HTTP/SOCKS 代理，我会结合它自己的日志和连接方式判', right=772, cls='t'),
    L(46, 312, 14, '断原因；联网检测会按 <code>web-access</code> 技能执行。', cls='t'),
    L(46, 351.5, 14, DSICON + '已使用 DeepSeek Harness 集成读取文件运行了命令', cls='g'),
    L(46, 389, 14, '界面上的具体错误是「API 密钥无效（AUTH）」。这表明请求已经到达服务端，但登录凭证被拒绝了。我继续检查凭证刷', right=782, cls='t'),
    L(46, 412, 14, '新和账号状态，优先恢复现有登录。', cls='t'),
    L(46, 450.5, 14, DSICON + '已使用 DeepSeek Harness 集成读取文件运行了命令', cls='g'),
    L(46, 488.5, 14, '已复测确认：DeepSeek 官方接口约 0.7 秒就返回了响应，当前保存的 API Key 被明确判定为无效，返回 HTTP 401。', cls='t'),
    L(46, 510, 14, '接下来我检查能否通过桌面端的账号登录恢复使用。', cls='t'),
    L(46, 548.5, 14, DSICON + '已使用 DeepSeek Harness和Chrome 集成读取文件运行了命令', cls='g'),
    L(46, 586.5, 14, '已通过浏览器现有登录恢复了 DeepSeek 账号，余额读取正常。当前会话仍选着失效的 API Key 连接，我会把它切换到', right=778, cls='t'),
    L(46, 609, 14, '已登录的账号连接，再做一次最小请求验证。', cls='t'),
    L(46, 647.5, 14, DSICON + '已使用 DeepSeek Harness 集成运行了命令', cls='g'),
])

# ---------------------------------------------------------------- 4 雷峰塔思考 1866×1322（深色）
TERM = '<svg class="ic" viewBox="0 0 16 16"><path d="M3 4.5l3.5 3.5L3 11.5M8 12h5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
EDIT = '<svg class="ic" viewBox="0 0 16 16"><path d="M8.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h8a1.5 1.5 0 0 0 1.5-1.5V7.5M6.5 9.5l.4-1.9 5.4-5.4a1 1 0 0 1 1.5 1.5L8.4 9.1z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'
DOC = '<svg class="ic" viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 6h6M5 8.5h6M5 11h3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
THINK = dict(name='雷峰塔思考', w=1866, h=1322, dpr=2, bg='#151517', css='''
  .t{color:#f3f4f5} .g{color:#a8adb4}
  .ic{width:1em;height:1em;vertical-align:-.14em;margin-right:.5em;color:#a8adb4}
  code{font-family:"DejaVu Sans Mono",monospace;font-size:.86em;background:#292929;border:1px solid #333;border-radius:8px;padding:2px 10px;color:#e8e8e8}
''', shapes='''
  <div style="position:absolute;left:1367px;top:5px;width:357px;height:84px;border-radius:30px;background:#2c2c2e"></div>
  <div style="position:absolute;left:147px;top:254px;width:1577px;height:1px;background:#313133"></div>
  <div style="position:absolute;left:1658px;top:1290px;width:64px;height:64px;border-radius:50%;background:#2c2c2e"></div>
''', lines=[
    L(1400, 47, 28, '给我搭建一个 3d 雷峰塔', cls='t'),
    L(150, 213, 28, '已完成，用时 43 分 50 秒 <svg class="ic" style="margin-left:.15em;width:.8em" viewBox="0 0 16 16"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', cls='g'),
    L(150, 307.5, 28, TERM + '执行了命令，已访问网页，已调用工具等', cls='g'),
    L(148, 375.5, 28, '我先确认了环境，现在建一个独立的 3D 项目：程序化建模的八角五层雷峰塔、西湖水面倒影、可拖动的「时辰」光照，界面按', right=1712, cls='t'),
    L(148, 423, 28, '宋画册页的竖排题跋来做。先搭好工程骨架。', cls='t'),
    L(150, 491.5, 28, EDIT + '已写入文件，执行了命令，已读取图片', cls='g'),
    L(148, 560, 28, '第一版已跑起来，有 54fps。但光照太暗、岛体发黑、标题顺序反了。接下来我调光、调整天空与构图，并修正竖排标题和右侧', right=1714, cls='t'),
    L(148, 607, 28, '取景栏。', cls='t'),
    L(150, 675, 28, TERM + '执行了命令并已读取图片', cls='g'),
    L(148, 743.5, 28, '找到根因了：颜色被做了两次 sRGB→线性转换（<code>THREE.Color(hex)</code> 本身已转换，我又调用了 <code>convertSRGBToLinear</code>），整', right=1709, cls='t'),
    L(148, 791, 28, '个场景因此被压暗并偏红。修正后重新看。', cls='t'),
    L(150, 859, 28, TERM + '执行了命令并已读取图片', cls='g'),
    L(148, 927.5, 28, '水面倒影的镜面相机方向取错了：相机是仰视，镜像相机不应再翻转朝向。我改成“水下同位、同朝向”，让反射真正投到水面', right=1685, cls='t'),
    L(148, 975, 28, '上。', cls='t'),
    L(150, 1043, 28, DOC + '已读取图片并执行了命令', cls='g'),
    L(148, 1111, 28, '模型细节和夜景已经能看了，但光照、树、星点、水面、取景都还需要一轮精修。现在集中改材质亮度、夜间泛光、星点形状和', right=1715, cls='t'),
    L(148, 1159, 28, '山林。', cls='t'),
    L(150, 1227.5, 28, DOC + '已读取图片，执行了命令，已调用工具', cls='g'),
    L(148, 1295.5, 28, '雷峰塔搭好了：一个可以直接双击打开的单文件 3D 场景，程序化建模，不依赖外部图片或模型。', cls='t'),
])

PAGES = [RL, API, FIX, THINK]

PAGE = '''<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:BG}
body{width:Wpx;height:Hpx;position:relative;overflow:hidden;font-family:"Noto Sans CJK SC",sans-serif;-webkit-font-smoothing:antialiased}
.ln{position:absolute;white-space:nowrap}
.jf{}
CSS
</style><body>SHAPES</body>
<script>
const LINES = JSONLINES;
const cv = document.createElement('canvas').getContext('2d');
for (const l of LINES) {
  const d = document.createElement('div'); d.className = 'ln ' + l.cls + (l.right ? ' jf' : '');
  d.innerHTML = l.html; d.style.fontSize = l.f + 'px'; d.style.lineHeight = (l.f * 1.5) + 'px'; d.style.left = l.x + 'px';
  document.body.appendChild(d);
  if (l.right) {   // 满行：把需要补的宽度平均分到每个字上（正负都可以），不换行
    const n = [...d.textContent].length, w0 = d.getBoundingClientRect().width, W = l.right - l.x;
    d.style.letterSpacing = ((W - w0) / n) + 'px';
  }
  // 让 CJK 字的墨迹中心落在原图的 yc：行盒中线 → 基线 → 「国」字墨迹中心
  cv.font = `${getComputedStyle(d).fontWeight} ${l.f}px "Noto Sans CJK SC"`;
  const m = cv.measureText('国');
  const ink = (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;            // 墨迹中心相对基线
  const base = l.f * 1.5 / 2 + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2; // 基线相对行盒顶
  d.style.top = (l.yc - base - ink + DY) + 'px';
}
document.querySelectorAll('img').forEach(i => i.src = 'LOGO');
window.DONE = true;
</script>'''


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for P in PAGES:
            dpr = int(sys.argv[2]) if len(sys.argv) > 2 else P['dpr']
            html = (PAGE.replace('BG', P['bg']).replace('Wpx', f"{P['w']}px").replace('Hpx', f"{P['h']}px")
                    .replace('CSS', P['css']).replace('SHAPES', P.get('shapes', ''))
                    .replace('DY', str(P.get('dy', 0))).replace('JSONLINES', json.dumps(P['lines'], ensure_ascii=False))
                    .replace('LOGO', (ASSETS / 'logo_ds.png').as_uri()))
            f = OUT / f"{P['name']}.html"; f.write_text(html)
            pg = await b.new_page(viewport={'width': P['w'], 'height': P['h']}, device_scale_factor=dpr)
            await pg.goto(f.as_uri()); await pg.wait_for_function('window.DONE === true'); await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(OUT / f"{P['name']}.png"), full_page=False)
            await pg.close()
            print(P['name'], P['w'] * dpr, 'x', P['h'] * dpr)
        await b.close()

asyncio.run(main())
