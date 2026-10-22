"""口播源时间 → 成片时间的统一映射；字幕、镜头与事件都从这里生成。

用法：python3 工具/timeline.py   （写 project.json 与 _timeline.json，再自动运行 build.py）
- 只压缩口播里超过 0.5 秒的停顿（保留约 0.32 秒），不剪任何字。
- HOLDS：在某个源时间点插入额外的成片时长（MV 播放、大标题停顿）。
- 字幕时间来自逐字识别时间戳，文字来自 lines.py 的人工校对稿。
"""
import json, re, difflib, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from lines import LINES

TOK = json.load(open(HERE / 'aroll_tokens.json'))
SIL = [tuple(map(float, re.match(r'([\d.]+)-([\d.]+)', l).groups())) for l in open(HERE / 'silences.txt')]
SRC_END = 365.50

# ---------------------------------------------------------------- 停顿压缩与插入
KEEP_HEAD, KEEP_TAIL = 0.17, 0.15            # 停顿里保留：上一句尾 0.17s + 下一句前 0.15s
# 源时间点 → 额外插入的成片秒数（放在该点所在停顿中）
HOLDS = {
    18.59: 0.55,          # 「谁将更胜一筹」后：VS 重击 + 换歌
    38.40: 24.30 + 1.70,  # 「分别对应哪个模型」后：三条 MV 完整播放 + 揭晓
}
cuts = []
for s, e in SIL:
    if e - s > 0.5 and s > 0.3 and e < SRC_END - 0.3:
        cuts.append((s + KEEP_HEAD, e - KEEP_TAIL))
# pieces: [源入, 源出, 成片入]
pieces, t, cur = [], 0.0, 0.0
hold_at = {}
for a, b in cuts + [(SRC_END, SRC_END)]:
    pieces.append([round(cur, 3), round(a, 3), round(t, 3)])
    t += a - cur
    h = sum(v for k, v in HOLDS.items() if a - KEEP_HEAD - 0.05 <= k <= b + KEEP_TAIL + 0.05)
    if h:
        hold_at[round(a, 3)] = (round(t, 3), h)
        t += h
    cur = b
TOTAL = round(t, 3)


def T(src):
    """源时间 → 成片时间。落在被剪掉的停顿里时，取停顿剪点。"""
    for (a, b, at), nxt in zip(pieces, pieces[1:] + [None]):
        if src < a:
            return at
        if src <= b:
            return round(at + (src - a), 3)
    return TOTAL


def hold(src_point):
    """返回插入段 (成片起点, 时长)。"""
    for a, v in hold_at.items():
        if abs(a - (src_point + KEEP_HEAD)) < 0.3:
            return v
    raise KeyError(src_point)

# ---------------------------------------------------------------- 字幕对齐
NUM = dict(zip('0123456789.', '零一二三四五六七八九点'))


def norm(ch):
    ch = ch.lower()
    return NUM.get(ch, ch)


def char_times(i):
    seg = TOK[i]
    asr, times = [], []
    toks, ts = seg['tokens'], seg['ts']
    for k, (tok, tt) in enumerate(zip(toks, ts)):
        s = tok.strip().lower()
        nxt = ts[k + 1] if k + 1 < len(ts) else tt + 0.25
        for j, c in enumerate(s):
            asr.append(c); times.append(tt + (nxt - tt) * j / max(len(s), 1))
    text = LINES[i]
    corr = [c for c in text if c not in ' |']
    sm = difflib.SequenceMatcher(None, [norm(c) for c in corr], asr, autojunk=False)
    ct = [None] * len(corr)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            ct[blk.a + k] = times[blk.b + k]
    known = [k for k, v in enumerate(ct) if v is not None]
    seg_end = seg['ts'][-1] + 0.3
    for k in range(len(ct)):
        if ct[k] is None:
            p = max([q for q in known if q < k], default=None)
            n = min([q for q in known if q > k], default=None)
            if p is None and n is None: ct[k] = seg['start']
            elif p is None: ct[k] = ct[n] - 0.12 * (n - k)
            elif n is None: ct[k] = min(seg_end, ct[p] + 0.12 * (k - p))
            else: ct[k] = ct[p] + (ct[n] - ct[p]) * (k - p) / (n - p)
    return text, ct


def speech_end_after(src):
    for s, e in SIL:
        if s >= src - 0.05:
            return s + 0.05
    return SRC_END


SUBS, ANCH = [], {}
for i in sorted(LINES):
    text, ct = char_times(i)
    parts = text.split('|')
    pos = 0
    starts = []
    for p in parts:
        n = len(p.replace(' ', ''))
        starts.append((p, ct[pos], ct[pos + n - 1]))
        pos += n
    ANCH[i] = (text, ct)
    for k, (p, a, last) in enumerate(starts):
        b = starts[k + 1][1] - 0.04 if k + 1 < len(starts) else speech_end_after(last)
        b = max(b, last + 0.22)
        SUBS.append([T(max(0, a - 0.06)), p, T(b)])
for x, y in zip(SUBS, SUBS[1:]):            # 不重叠
    if x[2] > y[0]: x[2] = round(y[0] - 0.01, 3)


def A(i, needle, k=0):
    """第 i 段口播里第 k 次出现的 needle 的开口时间（成片秒）。"""
    text, ct = ANCH[i]
    flat = text.replace('|', '').replace(' ', '')
    idx = -1
    for _ in range(k + 1):
        idx = flat.index(needle.replace(' ', ''), idx + 1)
    return T(ct[idx])


def AE(i, needle):
    """needle 最后一个字的开口时间 + 0.22（大致说完）。"""
    text, ct = ANCH[i]
    flat = text.replace('|', '').replace(' ', '')
    n = needle.replace(' ', '')
    idx = flat.index(n) + len(n) - 1
    return T(ct[idx] + 0.22)
