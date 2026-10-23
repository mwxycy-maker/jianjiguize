"""把录像里偶发的整帧黑帧换成前后两帧的平均（帧数、时长不变）。用法：python3 fixblack.py in.mp4 out.mp4"""
import subprocess, sys, json, numpy as np
src, dst = sys.argv[1], sys.argv[2]
info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', src], capture_output=True).stdout)['streams'][0]
w, h, fps = info['width'], info['height'], info['r_frame_rate']
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).copy()
lum = fr.reshape(len(fr), -1).mean(1)
bad = [i for i in range(len(fr)) if lum[i] < 35 and ((i > 0 and lum[i - 1] > lum[i] + 40) or (i + 1 < len(fr) and lum[i + 1] > lum[i] + 40))]
for i in bad:
    a = fr[i - 1] if i > 0 else fr[i + 1]; b = fr[i + 1] if i + 1 < len(fr) and i + 1 not in bad else a
    fr[i] = ((a.astype(np.uint16) + b) // 2).astype(np.uint8)
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', fps, '-i', '-',
                      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-g', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
p.stdin.write(fr.tobytes()); p.stdin.close(); p.wait()
print(src, len(fr), '帧，修补', bad)
