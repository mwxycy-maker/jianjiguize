"""口播转写：VAD 分句 + SenseVoice 逐字时间戳 + 停顿表。给 timeline.py 用。

用法：python3 transcribe.py 口播.mp4 输出目录
产出：
  输出目录/asr.txt            每句「起 -- 止: 识别文字」（拿来人工校对，写进 lines.py）
  输出目录/aroll_tokens.json  每句的 token 与时间戳（timeline.py 用它对齐校对稿）
  输出目录/silences.txt       口播里所有停顿「起-止 (时长)」（timeline.py 用它压缩 >0.5 秒的停顿）

依赖（都是离线的，放在 ~/tools，或用环境变量 SHERPA_DIR 指定）：
  sherpa-onnx-v1.13.8-linux-x64-shared     https://github.com/k2-fsa/sherpa-onnx/releases
  sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17（model.int8.onnx + tokens.txt）
  silero vad.onnx
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

TOOLS = Path(os.environ.get('SHERPA_DIR', Path.home() / 'tools'))
B = TOOLS / 'sherpa-onnx-v1.13.8-linux-x64-shared'
M = TOOLS / 'sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17'
VAD = TOOLS / 'vad.onnx'
ENV = dict(os.environ, LD_LIBRARY_PATH=str(B / 'lib'))


def main(src, out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    wav = tmp / 'a16k.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '16000', str(wav)], check=True)
    # 1) VAD + 整句识别
    p = subprocess.run([str(B / 'bin/sherpa-onnx-vad-with-offline-asr'), f'--silero-vad-model={VAD}',
                        f'--sense-voice-model={M}/model.int8.onnx', f'--tokens={M}/tokens.txt', '--sense-voice-use-itn=1',
                        '--num-threads=2', str(wav)], capture_output=True, text=True, env=ENV)
    lines = [l for l in (p.stdout + p.stderr).splitlines() if re.match(r'[\d.]+ -- [\d.]+:', l)]
    (out / 'asr.txt').write_text('\n'.join(lines) + '\n')
    # 2) 每句再跑一遍拿逐字时间戳
    res = []
    for i, ln in enumerate(lines):
        a, b, txt = re.match(r'([\d.]+) -- ([\d.]+): (.*)', ln).groups(); a, b = float(a), float(b)
        a0 = max(0, a - .1); seg = tmp / 'seg.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a0), '-to', str(b + .15), '-i', str(wav), str(seg)], check=True)
        q = subprocess.run([str(B / 'bin/sherpa-onnx-offline'), f'--sense-voice-model={M}/model.int8.onnx', f'--tokens={M}/tokens.txt',
                            '--sense-voice-use-itn=0', '--num-threads=2', str(seg)], capture_output=True, text=True, env=ENV)
        d = json.loads([l for l in (q.stdout + q.stderr).splitlines() if l.startswith('{')][-1])
        res.append(dict(i=i, start=a, end=b, vad_text=txt, tokens=d['tokens'], ts=[round(a0 + t, 3) for t in d['timestamps']]))
    json.dump(res, open(out / 'aroll_tokens.json', 'w'), ensure_ascii=False, indent=0)
    # 3) 停顿表（-35dB 以下持续 0.3 秒算停顿）
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(wav), '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    (out / 'silences.txt').write_text(''.join(f'{s:.2f}-{e:.2f} ({e - s:.2f})\n' for s, e in zip(st, en)))
    print(len(res), '句；', len(en), '个停顿 →', out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
