"""本期混音：口播按时间线拼接 → 配乐（停顿处抬起、说话时压低、混响收尾）→ 音效 → 整片 -14 LUFS。

python3 工具/mix.py   → 写 mix.wav / mix.m4a（播放器时钟），配乐表在 cues.py
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
SR = 48000
VOICE_SRC = ROOT.parent / '素材' / '口播.mp4'          # ← 换成本期口播源文件


def load(p, ss=0, t=None):
    cmd = ['ffmpeg', '-loglevel', 'error', '-ss', str(max(0, ss))] + (['-t', str(t)] if t else []) + ['-i', str(p), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32).reshape(-1, 2).copy()


def lufs(x):
    if len(x) < SR // 2: return -70
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    for ln in p.stderr.decode().splitlines()[::-1]:
        if ln.strip().startswith('I:'):
            v = float(ln.split()[1]); return v if v > -70 else -70
    return -70


def ramp(n, a, b):
    return np.linspace(a, b, max(n, 1))[:, None]


def reverb_tail(x, secs, tau=None):
    """把片段末尾 0.35 秒卷积一段指数衰减噪声，得到自然的混响尾巴（音乐停止用）。"""
    tau = tau or secs / 4
    src = x[-int(.35 * SR):]
    n = int(secs * SR); rng = np.random.default_rng(3)
    ir = rng.standard_normal((n, 2)).astype(np.float32) * np.exp(-np.arange(n) / (tau * SR))[:, None]
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True)) + 1e-9
    L = len(src) + n - 1; F = 1 << int(np.ceil(np.log2(L)))
    out = np.stack([np.fft.irfft(np.fft.rfft(src[:, c], F) * np.fft.rfft(ir[:, c], F), F)[:L] for c in range(2)], 1)
    out = out[len(src) - 1:len(src) - 1 + n] * .6
    return out.astype(np.float32) * ramp(n, 1, 0) ** 1.5


def main():
    import cues
    TL = json.load(open(HERE / '_timeline.json'))
    END = TL['total']; N = int(END * SR) + SR
    # ---------------- 口播
    voice = np.zeros((N, 2), np.float32)
    src = load(VOICE_SRC)
    for a, b, at in TL['pieces']:
        x = src[int(a * SR):int(b * SR)].copy()
        fz = min(int(.012 * SR), len(x) // 2)
        if fz: x[:fz] *= ramp(fz, 0, 1); x[-fz:] *= ramp(fz, 1, 0)
        i = int(at * SR); voice[i:i + len(x)] += x[:N - i]
    voice *= 10 ** ((-16 - lufs(voice)) / 20)
    # 说话包络 → 配乐闪避增益
    envv = np.convolve(np.abs(voice).mean(1), np.ones(2400) / 2400, 'same')
    thr = np.percentile(envv[envv > 1e-5], 35) * .5
    speaking = (envv > thr).astype(np.float32)
    # 起声快（60ms）、释放慢（350ms）
    att, rel = np.exp(-1 / (.06 * SR)), np.exp(-1 / (.35 * SR))
    g = np.empty_like(speaking); s = 0.0
    for k in range(0, len(speaking), 48):            # 1ms 步长平滑，后面插值
        tgt = speaking[k]; c = att if tgt > s else rel; s = tgt + (s - tgt) * (c ** 48); g[k:k + 48] = s
    duck_db = cues.DUCK_DB
    music = np.zeros((N, 2), np.float32)
    for m in cues.MUSIC:
        d = m['until'] - m['at']
        x = load(m['file'], m['src'], d + .05)[:int(d * SR)]
        if not len(x): continue
        ref = lufs(load(m['file'], m.get('ref_ss', m['src']), m.get('ref_dur', 20)))
        x *= 10 ** ((m.get('level', -18) - ref) / 20)
        fi, fo = int(m.get('fade_in', .03) * SR), int(m.get('fade_out', .25) * SR)
        if fi: x[:fi] *= ramp(min(fi, len(x)), 0, 1)
        if fo and not m.get('tail'): x[-fo:] *= ramp(min(fo, len(x)), 1, 0)
        if m.get('tail'):
            tl_ = reverb_tail(x, m['tail']); x[-int(.02 * SR):] *= ramp(int(.02 * SR), 1, 0); x = np.concatenate([x, tl_])
        i = int(m['at'] * SR); j = min(N, i + len(x))
        gain = np.ones(j - i, np.float32)
        if m.get('duck', True):
            gain = 1 - (1 - 10 ** (m.get('duck_db', duck_db) / 20)) * g[i:j]
        music[i:j] += x[:j - i] * gain[:, None]
    for a, b in getattr(cues, 'DIP', []):            # 重击前一瞬间让音乐让位
        i0, i1 = int(a * SR), int(b * SR); music[i0:i1] *= .1
    sfx = np.zeros((N, 2), np.float32)
    cache = {}
    for s_ in cues.SFX:
        f = ROOT / '音效' / (s_['file'] + '.mp3')
        if f not in cache: cache[f] = load(f)
        x = cache[f].copy()
        if s_.get('dur'): x = x[:int(s_['dur'] * SR)]; x[-int(.05 * SR):] *= ramp(int(.05 * SR), 1, 0)
        pk = np.max(np.abs(x)) + 1e-9; x *= 10 ** (s_.get('db', -10) / 20) / pk     # 峰值对齐到 db
        al = s_.get('align', 'start')
        if al == 'end': at = s_['at'] - len(x) / SR
        elif al == 'peak': at = s_['at'] - np.argmax(np.abs(x).mean(1)) / SR
        else: at = s_['at']
        i = int(at * SR); x = x[max(0, -i):]; i = max(0, i); j = min(N, i + len(x)); sfx[i:j] += x[:j - i]
    mix = (voice + music + sfx)[:int(END * SR)]
    e = int(END * SR); fo = int(.8 * SR); mix[e - fo:e] *= ramp(fo, 1, 0)
    raw = mix.astype(np.float32).tobytes()
    base = ['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-']
    p = subprocess.run(base + ['-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], input=raw, capture_output=True)
    js = p.stderr.decode(); mm = json.loads(js[js.rindex('{'):js.rindex('}') + 1])
    af = 'loudnorm=I=-14:TP=-1.0:LRA=11:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}:linear=true'.format(**mm)
    subprocess.run(base + ['-af', af, '-ar', str(SR), '-c:a', 'pcm_s16le', '-y', str(ROOT / 'mix.wav')], input=raw, check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'mix.wav'), '-c:a', 'aac', '-b:a', '160k', str(ROOT / 'mix.m4a')], check=True)
    print('voice', round(lufs(voice), 1), 'music', round(lufs(music), 1), 'sfx', round(lufs(sfx), 1), '→ mix.m4a', round(END, 2), 's')


if __name__ == '__main__':
    main()
