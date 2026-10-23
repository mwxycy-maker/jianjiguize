"""配乐表与音效表（成片秒）。事件时间全部取自 plan.EV，口播改了会跟着走。

BGM 衔接按《音乐衔接教程》：
1. 停止 + 转移注意力 + 开始：上一首在重击/混响尾巴里停，用音效、画面或台词接住，再让下一首从强拍进来。
2. 「切割按钮」：上升音效（riser）收在新段落第一帧，提示观众要换歌了。
3. 相近情绪的两首可直接交叉，但要对齐鼓点，声音不要断。
"""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from plan import EV, MV_AT, MV_LEN
import timeline as _tl
TOTAL_END = _tl.TOTAL

ROOT = HERE.parent
MUS = ROOT / '音乐'
MEDIA = ROOT.parent / '素材'
DUCK_DB = -11

POW = str(MUS / 'Pow - William Baxter Noon.mp3')
LWT = str(MUS / "Let's Win This - BalloonPlanet.mp3")
CHAL = str(MUS / 'Challengers.wav')
HEARD = str(MUS / 'Heard Em Say (Instrumental).mp3')
YDB = str(MUS / 'Young Dumb & Broke (Instrumental).mp3')
DOES = str(MUS / "Does It for Me - Where's LuLu.mp3")
SOLE = str(MUS / 'Forwe - Sole Viola.mp3')   # 阿亮指定：赛车段用这首的高潮（64.0 秒起）
# ③ Challengers：强拍 7.895 秒对齐三座塔入场
CHAL_OFF = 7.895 - (EV['towers'] - EV['sec2'])

# ① Pow：曲子 28.9 秒自带一记大鼓（前面 1.5 秒是停顿）→ 对齐 VS 重击那一帧
VS_SLAM = EV['vs_end'] - .55
POW_OFF = 28.9 - VS_SLAM

MUSIC = [
    dict(file=POW, src=POW_OFF, at=0.0, until=VS_SLAM + .45, level=-17, fade_in=.25, tail=1.6, ref_ss=10, ref_dur=30),
    # ② 眩晕片段原声当背景音（画面里视频同步播放）
    dict(file=str(MEDIA / '眩晕.mp4'), src=0, at=EV['ai_video'] - 1.2, until=MV_AT - .05, level=-20, fade_in=.6, fade_out=.5, ref_ss=0, ref_dur=30),
    # ② MV 播放：用 01-纸月亮_MV_1080p 的背景音，口播空档里满音量
    dict(file=str(MEDIA / 'Claude Opus5.5' / '01-纸月亮_MV_1080p.mp4'), src=0, at=MV_AT, until=MV_AT + MV_LEN, level=-15, fade_in=.05, fade_out=.35, duck=False, ref_ss=0, ref_dur=24),
    # ② 揭晓重击后，Let's Win This 从强拍进来，一直到 ③ 开头的转场
    dict(file=LWT, src=.075, at=EV['reveal'], until=EV['sec2'] + .3, level=-18, fade_in=.02, tail=1.2, ref_ss=0, ref_dur=30),
    # ③⑤ 3D 建模 + 自反馈：Challengers（电子、有劲，适合动画演示）；上一首混响收尾 + 转场声转移注意力后进来
    dict(file=CHAL, src=CHAL_OFF, at=EV['sec2'], until=EV['sec4'] - .1, level=-19, fade_in=.35, tail=1.4, ref_ss=10, ref_dur=30),
    # ⑥ 海岸：Young Dumb & Broke 的前奏（明亮、轻），口播「第四个」接上
    dict(file=YDB, src=.862, at=EV['sec4'] + .05, until=EV['sec7'] - .05, level=-20, fade_in=.4, tail=1.0, ref_ss=0, ref_dur=16),
    # ⑦ 赛车：Sole Viola 的高潮，64.0 秒的落点对齐第一款游戏出现那一帧；「撞墙」时停，用撞车声接住
    dict(file=SOLE, src=64.0 - (EV['g1'] - EV['sec7']), at=EV['sec7'], until=EV['crash'] + .02, level=-18, fade_in=.04, tail=.8, ref_ss=64, ref_dur=30),
    # ⑧ 退赛、升级：Let's Win This 复用（对手升级的「比赛感」）；「万万没想到」唱片刮停
    dict(file=LWT, src=21.437, at=EV['sec8'], until=EV['twist'] + .05, level=-19, fade_in=.3, fade_out=.08, ref_ss=20, ref_dur=30),
    # ⑧⑨ 反转后：Pow 复用，从头进来；曲子 28.9 秒自带的停顿 + 大鼓正好落在「梁圣为最强」（和开场首尾呼应）
    dict(file=POW, src=28.9 - (EV['liang_hit'] - (EV['twist'] + .45)), at=EV['twist'] + .45, until=EV['liang_hit'] + .45, level=-18, fade_in=.05, tail=1.8, ref_ss=10, ref_dur=30),
    # ⑩ 内心戏：Young Dumb & Broke 的主歌部分（20 秒起，轻快）
    dict(file=YDB, src=20.274, at=EV['sec10'] + .1, until=EV['sec11'] - .05, level=-20, fade_in=.3, tail=1.0, ref_ss=24, ref_dur=30),
    # ⑪ 接入教程：Heard 'Em Say（钢琴、稳），讲解垫乐；「余额用尽了」唱片刮停，留空让笑点落地
    dict(file=HEARD, src=.813, at=EV['sec11'] + .05, until=EV['oops'] + .05, level=-21, fade_in=.4, fade_out=.06, ref_ss=10, ref_dur=30),
    # ⑬ 搜索 API + 结尾：Does It for Me；曲子 40 秒处的停顿对齐「那就是拉」
    dict(file=DOES, src=40.0 - (EV['la_word'] - .3 - EV['sec13']), at=EV['sec13'] + .05, until=TOTAL_END, level=-20, fade_in=.25, fade_out=1.5, ref_ss=4, ref_dur=30),
]

DIP = [(VS_SLAM - .12, VS_SLAM)]

S = lambda f, at, db=-10, align='start', **k: dict(file=f, at=at, db=db, align=align, **k)
SFX = [
    # ①
    S('pop', EV['ds_badge'], -9),
    # 5 亿花字：数字上涨配上升音，涨满一记轻重音 + 闪光
    S('whoosh_deep', EV['tok_in'] - .1, -13, dur=1.0),
    S('riser_short', EV['tok_full'], -15, 'end'),
    S('impact', EV['tok_full'], -12), S('sparkle_star', EV['tok_full'] + .02, -15, dur=1.3),
    S('whoosh_swipe', EV['tok_out'], -13),
    S('pop', EV['gpt_badge'], -9), S('pop', EV['op_badge'], -9),
    S('whoosh_deep', EV['task1'] - .9, -12, dur=1.4),
    S('whoosh_swipe', EV['task1'] - .2, -10), S('whoosh_swipe', EV['task2'] - .2, -10), S('whoosh_swipe', EV['task3'] - .2, -10),
    S('whoosh_deep', EV['vs_in'] - .35, -8, dur=1.6),
    # VS：闪电动画配轻微电流声（持续、很轻），亮起时再点两下
    S('zap', EV['vs_in'] + .1, -24, dur=3.4), S('zap', EV['vs_in'] + 3.2, -27, dur=1.2),
    S('zap_short', EV['vs_hit'], -20), S('zap_short', EV['vs_in'] + .55, -20),
    S('impact', EV['vs_in'] + .55, -9),
    # ②
    S('pop', EV['opus_domain'], -10),
    S('whoosh_swipe', EV['chase'] + .95, -9),
    S('pop_cartoon', EV['ds_q'] - .05, -6),
    S('whoosh_swipe', EV['guess'] + .2, -10), S('pop', EV['guess'] + .45, -14), S('pop', EV['guess'] + .63, -14), S('pop', EV['guess'] + .81, -14),
    S('drumroll', EV['count'] - 1.75, -16),
    S('tick', EV['count'], -10, dur=.25), S('tick', EV['count'] + 1, -10, dur=.25), S('tick', EV['count'] + 2, -10, dur=.25),
    S('impact', EV['reveal'], -6), S('sparkle_star', EV['reveal'] + .05, -16, dur=1.5),
    S('pop', EV['host_in'], -12),
    S('pop', EV['data_time'], -13), S('pop', EV['data_in'] + .35, -13), S('pop', EV['data_cost'], -13),
    S('sparkle_star', EV['lowest'], -13, dur=1.4),
    S('whoosh_low', EV['ds_front'], -11, dur=1),
    S('whoosh_deep', EV['sec2'] - .3, -9, dur=1.2),
    # ③ 雷峰塔
    S('pop', EV['ds_up'], -11),
    S('whoosh_swipe', EV['towers'] - .1, -12), S('whoosh_swipe', EV['towers'] + .4, -13), S('whoosh_swipe', EV['towers'] + .9, -13),
    S('pop', EV['towers'] + .4, -16), S('pop', EV['towers'] + .9, -16), S('pop', EV['towers'] + 1.4, -16),
    S('whoosh_low', EV['gpt_front'] - .1, -12, dur=.9), S('whoosh_swipe', EV['gpt_detail'], -17),
    S('whoosh_low', EV['ds_front3'] - .1, -12, dur=.9),
    S('whoosh_swipe', EV['water'], -18), S('whoosh_swipe', EV['fog'], -18), S('whoosh_swipe', EV['mount'], -18), S('whoosh_swipe', EV['whole'], -18),
    S('whoosh_low', EV['op_front'] - .1, -12, dur=.9), S('slide_down', EV['fuyan'] - .05, -11),
    # ③ 便利店
    S('whoosh_deep', EV['towers_out'] - .2, -12, dur=1.2),
    S('pop', EV['stores'] + .3, -14), S('pop', EV['stores'] + .8, -14), S('pop', EV['stores'] + 1.3, -14), S('sparkle_star', EV['stores'] + .5, -17, dur=1.5),
    S('whoosh_low', EV['ds_front4'] - .1, -12, dur=.9), S('whoosh_low', EV['gpt_front4'] - .1, -12, dur=.9),
    S('scratch', EV['gpt_replay'] - .25, -15, dur=.5),
    S('whoosh_low', EV['op_front4'] - .1, -12, dur=.9), S('scratch', EV['op_replay'] - .25, -15, dur=.5),
    S('whoosh_swipe', EV['op_lamp'], -17), S('error', EV['op_dark'], -18, dur=.8),
    S('whoosh_low', EV['ds_front5'] - .1, -12, dur=.9),
    S('stamp', EV['first'], -8), S('sparkle_star', EV['first'] + .05, -13, dur=1.5),
    # ⑤ 自反馈
    S('whoosh_deep', EV['stores_out'] - .1, -12, dur=1.2),
    S('whoosh_swipe', EV['rl_in'] + .55, -19), S('whoosh_swipe', EV['rl_in'] + 2.05, -20),   # 两行高亮一开始就慢慢扫出
    # ⑥ 海岸
    S('whoosh_swipe', EV['coast_in'] - .1, -13), S('whoosh_swipe', EV['coast_in'] + .4, -14), S('whoosh_swipe', EV['coast_in'] + .9, -14),
    S('whoosh_low', EV['prompt_in'], -13, dur=.9), S('typing', EV['prompt_in'] + .5, -16, dur=1.8),
    S('pop', EV['hl_real'], -15), S('pop', EV['hl_perfect'], -15),
    S('whoosh_deep', EV['pua'] - .2, -13, dur=1.0), S('impact', EV['pua_hit'], -10),
    # ⑦ 赛车
    S('whoosh_deep', EV['g1'] - .3, -11, dur=1.2), S('whoosh_swipe', EV['g2'] - .1, -11), S('whoosh_swipe', EV['g3'] - .1, -11),
    S('whoosh_low', EV['gop'], -13, dur=.9), S('whoosh_swipe', EV['gop_light'], -16),
    S('whoosh_low', EV['ggpt'], -13, dur=.9), S('whoosh_low', EV['gds'], -13, dur=.9),
    S('error', EV['keys_rev'] - .1, -14, dur=.9), S('buzzer', EV['keys'] + .2, -18),
    S('whoosh_low', EV['rank'], -13, dur=.9), S('slide_down', EV['rank_last'], -11),
    S('whoosh_deep', EV['cmp'] - .1, -12, dur=1.0), S('cash', EV['c_ds'], -14, dur=1.0), S('cash', EV['c_op'], -12, dur=1.0),
    S('impact', EV['x35'], -8), S('crash', EV['crash'], -8, dur=2.2),
    # ⑧ Blender
    S('pop', EV['op_in8'], -11), S('slide_down', EV['op_out8'], -10),
    S('pop', EV['ds_in8'], -11), S('pop', EV['gpt_in8'], -11), S('riser_short', EV['astra_up'] + .25, -13, 'end'), S('sparkle_star', EV['astra_up'] + .2, -12, dur=1.5),
    S('whoosh_deep', EV['ref_in'] - .3, -12, dur=1.0), S('pop', EV['astra_skill'], -12),
    S('scratch', EV['twist'], -6, dur=.6),
    S('whoosh_swipe', EV['cars_in'] - .1, -12), S('whoosh_swipe', EV['cars_in'] + .05, -13),
    S('sparkle_star', EV['ds_better'], -13, dur=1.4), S('whoosh_low', EV['detail'], -13, dur=.9),
    # ⑨ 总结
    S('whoosh_low', EV['sec9'], -13, dur=.9), S('whoosh_swipe', EV['cost_in'] - .1, -12),
    S('pop', EV['tok_hl'], -12), S('cash', EV['cny_hl'], -14, dur=1.0),
    S('whoosh_low', EV['pingpong'], -13, dur=.9),
    S('whoosh_deep', EV['liang'] - .2, -11, dur=1.0), S('hit_bay', EV['liang_hit'], -6, dur=2.4), S('sparkle_star', EV['liang_hit'] + .05, -12, dur=1.5),
    # ⑩ 内心戏
    S('pop', EV['flash_lbl'], -13), S('riser_short', EV['max'] + .55, -14, 'end'), S('ding', EV['max'] + .55, -12),
    S('whoosh_low', EV['think_in'], -13, dur=.9),
    S('error', EV['think_find'], -18, dur=.6), S('pop', EV['think_fix'], -15), S('ding', EV['think_out'], -12),
    # ⑪ 接入教程
    S('pop', EV['dsh_ds'], -13), S('whoosh_swipe', EV['dsh_in'] - .2, -14), S('pop', EV['dsh_in'], -10), S('sparkle_star', EV['dsh_all'], -16, dur=1.2),
    S('whoosh_low', EV['la_in'] - .1, -12, dur=.9),
    # 教程录屏不加鼠标点击声（阿亮）
    S('typing', EV['ck_3'] + .2, -17, dur=.8), S('typing', EV['cx_paste'] + .3, -18, dur=.5), S('typing', EV['ck_5'] + .1, -18, dur=.5),
    S('whoosh_low', EV['ap_in'] - .1, -13, dur=.9), S('whoosh_low', EV['ck_1'] - .3, -13, dur=.9), S('whoosh_low', EV['cx_easy'], -13, dur=.9),
    S('pop', EV['wb'], -12), S('pop', EV['kimi'], -12), S('pop', EV['builtin'], -13),
    # ⑫ 余额
    S('whoosh_low', EV['bal_in'], -13, dur=.9), S('coin', EV['bal_hl'] + .2, -14),
    S('scratch', EV['oops'], -7, dur=.6), S('whoosh_swipe', EV['fix_in'], -13), S('error', EV['fix_hl'] + .2, -15, dur=.9),
    # ⑬ 搜索 API
    S('pop', EV['pareto'], -13), S('whoosh_deep', EV['api_in'] - .2, -12, dur=1.0), S('whoosh_swipe', EV['api_hl'], -18),
    S('impact', EV['la_word'], -7), S('boom', EV['hen_la'], -6),
    S('pop', EV['src_in'], -12), S('pop', EV['src_in'] + .35, -12),
    S('pop', EV['apps'], -14), S('pop', EV['apps'] + .28, -14), S('pop', EV['apps'] + .56, -14), S('pop', EV['apps'] + .84, -14),
    S('buzzer', EV['apps_x'] + .1, -16),
    S('ding', EV['pro1'], -13), S('ding', EV['pro2'], -13),
    S('pop', EV['end'] + .4, -13),
]
