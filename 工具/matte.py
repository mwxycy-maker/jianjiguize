"""人物抠像（Robust Video Matting，时序稳定）：输出「左原画 | 右遮罩」并排视频，供网页里把字放到人物后面。
用法：python3 matte.py 源起 源止 输出名      例：python3 matte.py 3.5 8.5 person_a
模型：~/tools/seg/rvm.onnx（rvm_mobilenetv3_fp32，GitHub 发布版）
"""
import subprocess, sys
from pathlib import Path
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / '素材' / '口播.mp4'          # ← 换成本期口播源文件
MODEL = str(Path.home() / 'tools' / 'seg' / 'rvm.onnx')   # https://github.com/PeterL1n/RobustVideoMatting 发布页的 rvm_mobilenetv3_fp32.onnx
a, b, name = float(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
W, H = 854, 480
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', str(SRC), '-r', '30', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
s = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
out = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W * 2}x{H}', '-r', '30', '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-g', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                        str(ROOT / 'media' / f'{name}.mp4')], stdin=subprocess.PIPE)
for f in fr:
    x = (f.astype(np.float32) / 255).transpose(2, 0, 1)[None]
    fgr, pha, *rec = s.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': np.array([.4], np.float32)})
    m = (pha[0, 0] * 255).clip(0, 255).astype(np.uint8)
    out.stdin.write(np.concatenate([f, np.repeat(m[:, :, None], 3, 2)], 1).tobytes())
out.stdin.close(); out.wait()
print(name, len(fr), 'frames', f'src {a}-{b}')
