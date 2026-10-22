"""简单节拍分析：谱通量 → 自相关求 BPM → 网格对齐求拍点和强拍。用于把重击、剪点卡在鼓点上。
用法：python3 beats.py 音乐文件 [起 止]
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
    seg = int(fps / 2); env = [float(20 * np.log10(rms[i:i + seg].mean() + 1e-9)) for i in range(0, len(rms), seg)]
    return {'bpm': round(60 / period, 2), 'beats': [round(ss + b, 3) for b in beats], 'down': [round(ss + b, 3) for b in down], 'env_db_half_s': [round(e, 1) for e in env]}


if __name__ == '__main__':
    r = analyze(sys.argv[1], *(float(a) for a in sys.argv[2:4]))
    print('BPM', r['bpm']); print('downbeats', r['down'][:40])
    print('env', r['env_db_half_s'][:120])
