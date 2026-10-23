"""本期配乐表 + 音效表。时间一律引用 _timeline.json 的事件 EV，口播一改就自动跟着走。
鹈鹕测试重剪那期的完整 cues.py（2026-10）。音乐在 pelican-test/重剪工程/音乐/（阿亮有版权）：pow、sky、moment、claps。
看点：一首歌卡两记大鼓、有人声的歌只拼无人声段、梗视频原声不闪避、安静前奏的歌从 drop 进、同一首歌首尾复用。
"""
import json
from pathlib import Path

TL = json.load(open(Path(__file__).resolve().parent / '_timeline.json'))
EV = TL['EV']
DUCK_DB = -11

# Pow（实测起音）：28.95s 一记大鼓（前面约 0.8s 收空），48.45s 一记大鼓（前面 47.5–47.8s 静音）。
# 在「新闻散开」这一刀从 7.574s 那一拍进 → 48.45s 的大鼓落在「严父」，28.95s 的落在「车轱辘像是鱼儿一样」开口
POW_SRC = 7.574
# It Came Out Of The Sky（BPM 99.4，强拍 0.075 + 2.415n）：0–7s 前奏、58.5–83s 吉他独奏、136s 后尾奏都没有人声
BAR = 2.415
SKY_A = EV['simon_name'] - .05                      # 「西蒙」强拍进
MUSIC = [
    dict(file='音乐/pow.mp3', src=POW_SRC, at=EV['news'], until=EV['simon_name'] - .35, level=-16.5, fade_in=.02, tail=1.4, ref_ss=9, ref_dur=30),
    # 前奏 2 小节 → 吉他独奏（强拍对强拍拼接）
    dict(file='音乐/sky.mp3', src=.075, at=SKY_A, until=SKY_A + 2 * BAR, level=-21, fade_in=.03, fade_out=.03, ref_ss=58.5, ref_dur=20),
    dict(file='音乐/sky.mp3', src=58.509, at=SKY_A + 2 * BAR, until=EV['scratch'], level=-21, fade_in=.03, fade_out=.06, ref_ss=58.5, ref_dur=20),
    # 梗视频原声（不闪避），只留特写「篮球和鸡」
    dict(file='media/meme.mp4', src=2.45, at=EV['meme'], until=EV['static_fx'], level=-17, fade_in=.02, fade_out=.04, duck=False, ref_ss=2.45, ref_dur=2.6),
    # 镜 22 起换 Live in the Moment（Instrumental）：前 15.6s 是安静前奏，15.652s 节奏进来 → 让它在花屏结束、回到主播这一刻起来
    dict(file='音乐/moment.mp3', src=15.652, at=EV['back'], until=EV['part3'] + .2, level=-19, fade_in=.02, tail=1.3, ref_ss=16, ref_dur=30),
    # ③ 前半 Claps and Stomps：每 6.8s 一个空拍（实测重拍回归 7.65 / 14.475 / 21.275 / 28.075 / 34.9 / 41.7 / 48.525s）
    # 从 1.651s 进 → 14.475s 的重拍落在「虚假泡泡」戳破，21.275s 的落在六宫格出现；「降智状态了」唱片刮停
    dict(file='音乐/claps.mp3', src=14.475 - (EV['pop'] - EV['part3']), at=EV['part3'], until=EV['dumb_end'], level=-17, fade_in=.02, fade_out=.05, ref_ss=2, ref_dur=40),
    # ③ 后半 Pow 复用：从 0.76s 进 → 28.95s 的大鼓落在「鹈鹕测试作为公开的题库」，48.45s 的落在「现在主流的操作则是跑动画」
    dict(file='音乐/pow.mp3', src=48.45 - (EV['anim'] - EV['fair']), at=EV['fair'], until=TL['total'], level=-17, fade_in=.4, fade_out=1.5, ref_ss=9, ref_dur=30),
]
DIP = []


def s(file, at, db, **kw):
    return dict(file=file, at=at, db=db, **kw)


SFX = [
    # ① 开场
    s('riser_short', EV['news'] + .02, -16, align='end'),
    s('whoosh_deep', EV['news'] - .25, -11, dur=1.2),
    *[s('whoosh_swipe', EV['news'] + k * .45, -13 - k, dur=.8) for k in range(3)],
    s('whoosh_swipe', EV['paper'], -12, dur=.8), s('pop_cartoon', EV['kid'], -13),
    s('whoosh_swipe', EV['svg'], -12, dur=.8),
    s('whoosh_low', EV['wheel'] + .6, -13, dur=.9), s('hit_bay', EV['wheel_fly'] + .1, -15, align='peak', dur=1.2),
    s('whoosh_swipe', EV['feet'], -13, dur=.8), s('whoosh_swipe', EV['feet'] + .5, -15, dur=.8),
    s('whoosh_low', EV['feetR'] - .1, -13, dur=.9), s('whoosh_low', EV['pedal'] - .1, -13, dur=.9), s('glitch', EV['quantum'], -17, dur=.35),
    s('whoosh_swipe', EV['air'], -12, dur=.8), s('pop_cartoon', EV['jump'], -14), s('pop_cartoon', EV['jump'] + .5, -16),
    s('whoosh_swipe', EV['notbad'], -13, dur=.8),
    *[s('pop', EV['ugly'] + k * .18, -10 - k * 1.5) for k in range(4)],
    *[s('click', EV['ugly_x'] + k * .14, -16, dur=.25) for k in range(4)],
    s('pop', EV['opus_badge'], -11), s('click', EV['max'], -12, dur=.3),
    s('whoosh_swipe', EV['blank'], -12, dur=.8), s('tick', EV['blank'] + .3, -14, dur=.25), s('stamp', EV['stamp'], -8),
    s('whoosh_swipe', EV['dad'], -12, dur=.8),
    s('scratch', EV['scratch'], -8),
    s('static', EV['static_fx'], -14), s('bleep', EV['static_fx'], -16),
    # ② 补充
    s('whoosh_swipe', EV['svg2'], -13, dur=.8), s('typing', EV['code'] + .2, -18, dur=2.0), s('whoosh_swipe', EV['code'], -13, dur=.8),
    s('pop', EV['simon'] + .05, -10), s('pop_cartoon', EV['simon_name'] - .1, -12), s('whoosh_low', EV['y2024'] - .1, -13, dur=.9), s('tick', EV['y2024'] + .2, -14, dur=.25),
    *[s('pop', EV['m16'] + .15 + k * .06, -14 - k * .25, dur=.3) for k in range(0, 16, 2)], s('whoosh_low', EV['gemini'] - .1, -14, dur=.8), s('whoosh_low', EV['gpt4o'] - .1, -14, dur=.8),
    s('ding', EV['n16'] + .6, -14), s('whoosh_swipe', EV['static'], -13, dur=.8), s('error', EV['noanim'] + .35, -17, dur=.7),
    *[s('whoosh_swipe', EV['flop'] + k * .15, -14 - k, dur=.7) for k in range(4)],
    s('pop', EV['chick'] + .25, -12), s('pop', EV['chick'] + .55, -13), s('whoosh_cartoon', EV['chick_flip'] - .1, -14, dur=.6),
    s('whoosh_low', EV['back'] + .3, -13, dur=.9), s('whoosh_swipe', EV['db'] + .1, -13, dur=.8), s('pop', EV['db_empty'], -13), s('error', EV['fake'], -17, dur=.6),
    *[s('whoosh_swipe', EV['real'] + k * .15, -14 - k, dur=.7) for k in range(4)],
    # ③ 正式内容
    s('riser_short', EV['part3'], -16, align='end'),
    s('whoosh_swipe', EV['v18'], -13, dur=.8), s('whoosh_low', EV['seat'] - .25, -13, dur=.9), s('whoosh_low', EV['crank'] - .2, -13, dur=.9),
    s('pop', EV['bubble'] + .2, -14), s('whoosh_cartoon', EV['pop'] - .7, -14, dur=.7), s('hit_bay', EV['pop'], -10, align='peak', dur=1.2), s('pop_cartoon', EV['pop'], -9),
    s('whoosh_deep', EV['launch'] - .2, -12, dur=1.2), s('sparkle', EV['launch'] + .6, -17, dur=1.2), s('coin', EV['up'] + .5, -15),
    *[s('stamp', EV['sota'] + .05 + k * .18, -10 - k, dur=.6) for k in range(4)],
    *[s('pop', EV['grid6'] + k * .1 + (.25 if k > 2 else 0), -13 - k * .5, dur=.3) for k in range(6)], s('ding', EV['glance'], -12), s('buzzer', EV['glance'] + .3, -18, dur=.5),
    s('pop', EV['gift'] + .3, -12), s('sparkle_star', EV['gift_open'], -14, dur=1.3),
    *[s('pop', EV['evo'] + .2 + k * .38, -13 - k * .5, dur=.3) for k in range(5)], s('sparkle', EV['newuse'], -16, dur=1.0),
    s('pop', EV['gpt'] - .15, -11), s('pop', EV['claude'] - .15, -12), s('whoosh_cartoon', EV['dizzy'], -15, dur=.6),
    s('whoosh_swipe', EV['prompt'], -13, dur=.8), s('typing', EV['prompt'] + .35, -17, dur=1.0), s('click_double', EV['pass'] - .2, -14),
    s('whoosh_swipe', EV['pass'], -13, dur=.8), s('stamp', EV['pass_st'], -9), s('ding', EV['pass_st'] + .1, -15),
    s('whoosh_swipe', EV['bad'], -13, dur=.8), s('error', EV['bad'] + .6, -16, dur=.8), s('sparkle', EV['congrats'] + .1, -16, dur=1.0),
    s('stamp', EV['dumb_st'], -8), s('scratch', EV['dumb_end'], -8),
    s('pop_cartoon', EV['lol'], -12), s('pop', EV['rank'], -12), *[s('pop', EV['rank'] + 1.2 + k * .15, -13, dur=.3) for k in range(3)],
    s('buzzer', EV['rank_x'], -16, dur=.6), s('crash_toy', EV['rank_x'] + .45, -14, dur=1.0),
    s('whoosh_swipe', EV['whole'], -13, dur=.8), s('ding', EV['part'], -13),
    s('pop', EV['opus2'], -12), s('error', EV['limit'], -13, dur=.8),
    *[s('ding', EV['others'] + .8 + k * .15, -15 - k, dur=.6) for k in range(4)],
    s('whoosh_swipe', EV['public'], -13, dur=.8), s('whoosh_low', EV['target'] - .3, -13, dur=1.0),
    s('whoosh_swipe', EV['cram'], -13, dur=.8), s('cash', EV['score'] + 1.0, -14),
    s('whoosh_swipe', EV['old'], -13, dur=.8), s('tick', EV['outdated'] - .4, -13, dur=.25), s('tick', EV['outdated'], -13, dur=.25), s('whoosh_cartoon', EV['outdated'] + 1.2, -14, dur=.7),
    s('whoosh_swipe', EV['two'], -13, dur=.8), s('whoosh_low', EV['anim'] - .1, -13, dur=.9), s('whoosh_low', EV['d3'] - .1, -13, dur=.9),
    s('whoosh_swipe', EV['abstract'], -13, dur=.8), s('whoosh_swipe', EV['qin'], -13, dur=.8), s('pop_cartoon', EV['lineup'] - .35, -12),
    s('sparkle_star', EV['lineup'], -15, dur=1.4), s('whoosh_deep', EV['smooth'] - .2, -14, dur=1.2),
    *[s('pop', EV['comment'] - .6 + k * .25, -12 - k, dur=.3) for k in range(3)],
]
