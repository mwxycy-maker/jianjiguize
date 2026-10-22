"""审片代理（仅本机）：这台云端机器的无头 Chromium 不带 H.264/AAC 解码，
所以给每个素材做一份 VP8/Opus 代理放在 .local/proxy，并写 .local/media.json 让服务把同一 URL 映射过去。
交付的工程仍用 H.264/AAC（Chrome、Safari 都能播）；.local 不提交。
"""
import json, subprocess, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parent.parent
LOC = ROOT / '.local'; PX = LOC / 'proxy'; PX.mkdir(parents=True, exist_ok=True)
proj = json.loads((ROOT / 'project.json').read_text())
mapping = {}
jobs = []
for key, rel in proj['sources'].items():
    src = ROOT / rel; dst = PX / (rel.replace('/', '__') + '.webm')
    mapping[rel] = str(dst.relative_to(ROOT))
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        jobs.append(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-an', '-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8',
                     '-b:v', '1500k', '-g', '15', '-auto-alt-ref', '0', str(dst)])
au = ROOT / 'mix.m4a'
if au.exists():
    dst = PX / 'mix.webm'; mapping['mix.m4a'] = str(dst.relative_to(ROOT))
    if not dst.exists() or dst.stat().st_mtime < au.stat().st_mtime:
        jobs.append(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'mix.wav'), '-c:a', 'libopus', '-b:a', '128k', str(dst)])
with ThreadPoolExecutor(2) as ex:
    list(ex.map(lambda c: subprocess.run(c, check=True), jobs))
(LOC / 'media.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=1))
print(len(jobs), 'proxies built;', len(mapping), 'mapped')
