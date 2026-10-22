"""在 Openverse 里找音效（来源固定 Freesound），下载并登记到「音效/来源.md」。

  python3 openverse.py search whoosh                 # 列出候选（默认只看 CC0，按相关度）
  python3 openverse.py search "camera shutter" --any  # 也看 CC BY 等其他许可
  python3 openverse.py get 60007 whoosh_swipe         # 从上一次 search 的结果里按 Freesound 编号下载为 音效/whoosh_swipe.mp3 并登记
  python3 openverse.py get 60007 whoosh_swipe "swipe whoosh"   # 没有搜过时，带上能搜到它的关键词

说明：
- 接口 https://api.openverse.org/v1/audio/?q=...&source=freesound （匿名可用，有频率限制，每页最多 20 条）。
- 必须带浏览器 User-Agent，否则会 403；Freesound CDN 偶尔限流，脚本会自动重试。
- 下载的是 Freesound 的 hq 预览 mp3（128kbps），做视频音效足够。
- CC BY 的音效要在视频简介署名，来源表里会标出来。
"""
import json, os, subprocess, sys, time, urllib.parse
from pathlib import Path

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
API = 'https://api.openverse.org/v1/audio/'
OUT = Path(os.environ.get('SFX_DIR', '音效'))
CACHE = Path('.openverse_last.json')      # 上一次 search 的结果（get 从这里取下载地址）


def curl(url, out=None, tries=4):
    for k in range(tries):
        cmd = ['curl', '-sSfL', '-A', UA, url] + (['-o', str(out)] if out else [])
        p = subprocess.run(cmd, capture_output=True)
        if p.returncode == 0 and (out is None or Path(out).stat().st_size > 1000):
            return p.stdout
        time.sleep(2 + 3 * k)
    raise RuntimeError(f'下载失败：{url}')


def search(q, any_license=False, n=12):
    params = {'q': q, 'source': 'freesound', 'page_size': n}
    if not any_license: params['license'] = 'cc0'
    d = json.loads(curl(API + '?' + urllib.parse.urlencode(params)))
    CACHE.write_text(json.dumps(d['results'], ensure_ascii=False))
    print(f'共 {d["result_count"]} 条，显示前 {len(d["results"])} 条：')
    for r in d['results']:
        fid = r['foreign_landing_url'].rstrip('/').split('/')[-1]
        dur = (r.get('duration') or 0) / 1000
        print(f'  {fid:>7}  {dur:5.1f}s  {r["license"].upper():5} {r["creator"][:16]:16}  {r["title"][:60]}')
    return d['results']


def get(fid, name, q=None):
    pool = json.loads(CACHE.read_text()) if CACHE.exists() else []
    if q: pool = json.loads(curl(API + '?' + urllib.parse.urlencode({'q': q, 'source': 'freesound', 'page_size': 20})))['results'] + pool
    hit = next((r for r in pool if r['foreign_landing_url'].rstrip('/').endswith('/' + str(fid))), None)
    if not hit: sys.exit(f'没找到 Freesound #{fid}：先用 search 搜出它，或者在 get 后面带上能搜到它的关键词')
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f'{name}.mp3'
    curl(hit['url'], dst)
    lic = 'CC0' if hit['license'] == 'cc0' else hit['license'].upper()
    reg = OUT / '来源.md'
    if not reg.exists():
        reg.write_text('# 音效来源（Openverse，source = Freesound）\n\nCC BY 的需要在视频简介里署名。\n\n'
                       '| 文件 | 原名 | 作者 | 许可 | 链接 |\n|---|---|---|---|---|\n')
    with open(reg, 'a') as f:
        f.write(f'| {dst.name} | {hit["title"]} | {hit["creator"]} | {lic} | {hit["foreign_landing_url"]} |\n')
    print('已下载', dst, f'({dst.stat().st_size // 1024} KB, {lic})')


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == 'search': search(' '.join(x for x in a[1:] if x != '--any'), '--any' in a)
    elif a[0] == 'get': get(a[1], a[2], a[3] if len(a) > 3 else None)
    else: sys.exit(__doc__)
