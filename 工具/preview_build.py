"""把工程截取成一个独立的网页预览（只含指定段落），用于发给阿亮在浏览器里看。不编码视频。

python3 工具/preview_build.py 输出目录 截止秒数 标题
- 复制公共播放器、本期场景、字体与用到的素材
- data.js 只保留截止前的镜头和字幕；mix.m4a 截到同一时长（末尾 0.8 秒淡出）
"""
import json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]); cut = float(sys.argv[2]); title = sys.argv[3] if len(sys.argv) > 3 else '剪辑预览'
if out.exists(): shutil.rmtree(out)
(out / 'media').mkdir(parents=True); (out / 'assets').mkdir(); (out / 'fonts').mkdir()

D = json.loads(re.sub(r'^window\.D = |;\s*$', '', (ROOT / 'data.js').read_text()))
D['shots'] = [dict(s, end=min(s['end'], cut)) for s in D['shots'] if s['start'] < cut]
D['subs'] = [s for s in D['subs'] if s[0] < cut - .3]
D['TOTAL'] = D['DUR'] = cut; D['audio'] = 'mix.mp3'; D['title'] = title; D['id'] = D['id'] + '-preview'
(out / 'data.js').write_text('window.D = ' + json.dumps(D, ensure_ascii=False) + ';\n')

proj = json.loads((ROOT / 'project.json').read_text())
scripts = ['data.js', 'engine.js', 'sources.js', 'assets.js', 'common.js'] + proj['sceneScripts'] + ['preview.js', 'player-ui.js', 'player.js']
used = ''.join((ROOT / s).read_text() for s in ['common.js'] + proj['sceneScripts'])
src = {k: v for k, v in proj['sources'].items() if (f"'{k}'" in used or k == 'aroll_a') and not (k == 'aroll_b' and cut <= 175)}
(out / 'sources.js').write_text('window.VSRC = ' + json.dumps(src, ensure_ascii=False) + ';\n')
imgs = [i for i in proj['images'] if re.sub(r'\.(png|jpg)$', '', i) in used]
(out / 'assets.js').write_text('window.ASSETS = ' + json.dumps(imgs, ensure_ascii=False) + ';\n')
for f in ['engine.js', 'common.js', 'preview.js', 'player-ui.js', 'player.js', 'style.css', 'fonts.css'] + proj['sceneScripts']:
    shutil.copy2(ROOT / f, out / f)
for f in (ROOT / 'fonts').iterdir(): shutil.copy2(f, out / 'fonts' / f.name)
for i in imgs: shutil.copy2(ROOT / 'assets' / i, out / 'assets' / i)
# 视频：大于 4MB 的重新压一遍再放进预览（发布单文件上限 15MB、单次 64MB）；压过的缓存在 .local/preview_cache
CACHE = ROOT / '.local' / 'preview_cache'; CACHE.mkdir(parents=True, exist_ok=True)
def small(rel):
    srcf = ROOT / rel
    if srcf.stat().st_size <= 4e6: return srcf
    dst = CACHE / (rel.replace('/', '__'))
    if not dst.exists() or dst.stat().st_mtime < srcf.stat().st_mtime:
        subprocess.run(['nice', '-n', '10', 'ffmpeg', '-v', 'error', '-y', '-i', str(srcf), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '28',
                        '-g', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(dst)], check=True)
    return dst
for k, rel in src.items():
    (out / rel).parent.mkdir(parents=True, exist_ok=True); shutil.copy2(small(rel), out / rel)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'mix.wav'), '-t', str(cut), '-af', f'afade=t=out:st={cut - .8:.3f}:d=0.8',
                '-c:a', 'libmp3lame', '-b:a', '192k', str(out / 'mix.mp3')], check=True)
# 页面：发布时外层会包 doctype/head/body，这里只写标题、样式与脚本
(out / 'index.html').write_text(
    f'<title>{title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="fonts.css">\n'
    '<style>body{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}</style>\n'
    + '\n'.join(f'<script defer charset="utf-8" src="{s}"></script>' for s in scripts) + '\n')
files = sorted(str(p.relative_to(out)) for p in out.rglob('*') if p.is_file() and p.name != 'index.html')
(out / '_files.json').write_text(json.dumps(files, ensure_ascii=False))
tot = sum((out / f).stat().st_size for f in files)
print(len(files), 'files', round(tot / 1e6, 1), 'MB;', 'largest', max(((out / f).stat().st_size, f) for f in files))
