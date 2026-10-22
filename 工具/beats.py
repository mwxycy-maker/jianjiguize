"""简单节拍分析：谱通量 → 自相关求 BPM → 网格对齐求拍点和强拍。用于把重击、剪点卡在鼓点上。
用法：python3 beats.py 音乐文件 [起 时长]
输出 BPM、强拍、每 0.5 秒响度（带真实时间标签）和空拍后的重击起音。
"""
import subprocess, sys, json
import numpy as np

SR = 22050


def load(p, ss=0, t=None):
    cmd = ['ffmpeg', '-loglevel', 'error', '-ss', str(ss)] + (['-t', str(t)] if t else []) + ['-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32)


def analyze(path, ss=0, t=None):
    x = load(path, ss, t)
    hop, n = 512, 2048
    win = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n // 2, n // 2)), n)[::hop] * win
    mag = np.log1p(np.abs(np.fft.rfft(frames, axis=1)) * 10)
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(1)
    flux = np.concatenate([[0], flux]); flux -= np.convolve(flux, np.ones(16) / 16, 'same'); flux = np.maximum(flux, 0)
    fps = SR / hop
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    lags = np.arange(len(ac)); bpm = 60 * fps / np.maximum(lags, 1)
    ok = (bpm > 70) & (bpm < 180)
    lag = lags[ok][np.argmax(ac[ok] * np.exp(-((bpm[ok] - 120) / 60) ** 2))]
    period = lag / fps
    # 相位：网格上 flux 和最大
    best, ph = -1, 0
    for p in np.linspace(0, period, 64, endpoint=False):
        idx = ((np.arange(p, len(flux) / fps, period)) * fps).astype(int)
        idx = idx[idx < len(flux)]; sc = flux[idx].sum()
        if sc > best: best, ph = sc, p
    beats = np.arange(ph, len(flux) / fps, period)
    # 强拍：4 拍一组里能量最大的相位
    bi = (beats * fps).astype(int).clip(0, len(flux) - 1)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(2048) / 2048, 'same'))[::hop]
    energy = [flux[bi[k::4]].sum() for k in range(4)]
    down = beats[int(np.argmax(energy))::4]
    # 响度包络（每 0.5 秒）
    # 响度包络：按真实时间每 0.5 秒取一格（旧版按整数帧数分格，每格只有 0.4876 秒，标签越往后越偏，48 秒处偏 1.2 秒）
    env = []
    for k in range(int(len(rms) / fps / .5)):
        a, b = int(round(k * .5 * fps)), int(round((k + 1) * .5 * fps))
        env.append((round(ss + k * .5, 2), round(float(20 * np.log10(rms[a:b].mean() + 1e-9)), 1)))
    return {'bpm': round(60 / period, 2), 'beats': [round(ss + b, 3) for b in beats], 'down': [round(ss + b, 3) for b in down], 'env_db_half_s': env}


def onsets(path, ss, t, quiet=-35, loud=-15):
    """精确找「空拍后的重击」：逐 25ms 测响度，找持续 >0.12s 低于 quiet 的空拍，返回 (空拍起, 空拍止, 重击起音)。卡鼓点用这个，不要用 0.5 秒的响度表。"""
    x = load(path, ss, t); h = int(.025 * SR)
    db = 20 * np.log10(np.array([np.sqrt((x[i * h:(i + 1) * h] ** 2).mean()) for i in range(len(x) // h)]) + 1e-9)
    out, i = [], 0
    while i < len(db):
        if db[i] < quiet:
            j = i
            while j < len(db) and db[j] < quiet: j += 1
            if (j - i) * .025 >= .12:
                k = j
                while k < len(db) and db[k] < loud: k += 1
                out.append((round(ss + i * .025, 3), round(ss + j * .025, 3), round(ss + k * .025, 3)))
            i = j
        else: i += 1
    return out


if __name__ == '__main__':
    r = analyze(sys.argv[1], *(float(a) for a in sys.argv[2:4]))
    print('BPM', r['bpm']); print('downbeats', r['down'][:40])
    print('env', ' '.join(f'{t}:{d}' for t, d in r['env_db_half_s'][:240]))
    print('breaks (空拍起, 止, 重击起音)', onsets(sys.argv[1], *(float(a) for a in sys.argv[2:4])) if len(sys.argv) > 3 else onsets(sys.argv[1], 0, 600))
