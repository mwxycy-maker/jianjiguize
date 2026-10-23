"""本期镜头表与事件表：全部用口播锚点（某句里的某个词）定位，口播剪辑变化后自动跟随。

运行：python3 工具/plan.py → 写 project.json 并运行 build.py
"""
import json, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import timeline as tl
from timeline import A, AE, T, hold

MV_AT, MV_LEN = hold(38.40)[0], 24.30           # MV 插入段：成片起点
VS_HOLD = hold(18.59)

# ---------------------------------------------------------------- 镜头（id, 名称, 起点）
SHOTS = [
    (101, '开场 口播+DeepSeek', 0.0),
    (102, '开场 5亿Token', A(0, '我猛蹬') - .1),
    (103, '开场 三方徽章', A(0, '让它和') - .05),
    (104, '开场 三项比拼', A(0, '在相同') - .05),
    (105, '开场 VS 对决', A(1, '看看') - .12),
    (201, 'AI视频 Vibe Coding 片段', A(2, '首先') - .25),
    (202, 'AI视频 DeepSeek 追得上吗', A(2, '一般模型') - .05),
    (203, 'AI视频 三条视频竞猜', A(2, '先卖') - .1),
    (204, 'AI视频 MV 同时播放', MV_AT),
    (205, 'AI视频 揭晓与点评', MV_AT + MV_LEN),
    (206, 'AI视频 用时Token金额', A(5, '而且') - .05),
    (301, '3D建模 口播', A(6, '第二个') - .2),
    (302, '雷峰塔 三塔并列', A(7, '我先让') - .1),
    (306, '便利店 三店同时生长', A(8, '除了') - .1),
    (310, '自反馈学习 特写', A(10, '自反馈') - 1.0),
]
SHOTS += [
    (601, '海岸 三景并列', A(11, '第四个') - .15),
    (605, '海岸 PUA老板', A(11, '是不是') - .1),
    (701, '赛车 三款游戏', A(12, '第五个') - .15),
    (703, '赛车 Opus 灯光抢眼', A(12, 'Opus') - .15),
    (704, '赛车 GPT 太素', A(12, 'GPT') - .15),
    (705, '赛车 DeepSeek 左右键反', A(12, 'DeepSeek在') - .15),
    (707, '赛车 排最后', A(13, '所以这一轮') - .1),
    (708, '赛车 金额对比', A(14, '不过') - .1),
    (801, 'Blender 退赛与升级', A(15, '最后一个') - .2),
    (805, 'Blender 参考图', A(15, '这次比拼') - .1),
    (810, 'Blender 结果对比', A(16, '但令我') - .1),
    (901, '总结 口播', A(17, '说真的') - .15),
    (902, '总结 消耗截图', A(17, '6个案例') - .1),
    (905, '总结 有来有回', A(17, '而且还能') - .1),
    (907, '总结 很能打', A(17, '我觉得') - .1),
    (910, '梁圣表情包', A(18, '这次') - .15),
    (1001, '内心戏 口播', A(19, '在使用') - .15),
    (1005, '内心戏 思考截图', A(20, 'DeepSeek思考') - .1),
    (1101, '接入 口播', A(21, '那我们') - .15),
    (1102, '接入 DeepSeek Harness', A(22, '我最推荐') - .1),
    (1103, '接入 登录账号演示', A(23, '没有安装') - .1),
    (1104, '接入 添加 API Key 演示', A(23, '如果不想') - .1),
    (1105, '接入 开放平台 口播', A(23, 'API Key可以去') - .1),
    (1106, '接入 创建 API Key 演示', A(24, '依次点击') - .1),
    (1107, '接入 Codex 演示', A(25, '我们还可以') - .1),
    (1108, '接入 其他产品', A(27, '其他的像是') - .1),
    (1201, '余额 截图', A(28, '当然') - .1),
    (1202, '余额用尽 修复截图', A(28, '要不就') - .1),
    (1301, '搜索API 口播', A(29, '除了推出') - .15),
    (1302, '搜索API 文字特写', A(29, '开放自研') - .3),
    (1303, '搜索API 拉 狠拉', AE(29, '没什么用') + .1),     # 阿亮：搜索 API 特写多停留一下（盖住「不过这个东西对普通人好像没什么用」）
    (1304, '搜索API 数据源', A(30, '官方说') - .1),
    (1305, '搜索API 优缺点', A(31, '并且') - .1),
    (1306, '结尾', A(32, '最后你用上') - .1),
]

# ---------------------------------------------------------------- 事件（场景与音效共用）
EV = {
    'ds_badge': A(0, 'DeepSeek'), 'tok': A(0, '5亿') - .15,
    'tok_in': A(0, '我猛蹬') - .05, 'tok_full': AE(0, 'Token'), 'tok_out': AE(0, 'Token') + 1.5,
    'gpt_badge': A(0, 'GPT'), 'op_badge': A(0, 'Claude'),
    'task1': A(0, '建模') - .3, 'task2': A(0, '制作游戏'), 'task3': A(0, '制作视频'),
    'vs_in': A(1, '看看') - .05, 'vs_hit': A(1, '谁将'), 'vs_end': VS_HOLD[0] + VS_HOLD[1],
    'ai_video': A(2, 'AI视频'), 'opus_domain': A(2, '这可是'),
    'chase': A(2, '一般模型'), 'ds_q': A(2, '追上吗'),
    'guess': A(2, '先卖') , 'stack': A(3, '这三个') - .1,
    'mv': MV_AT, 'count': MV_AT + MV_LEN - 3.0, 'reveal': MV_AT + MV_LEN,
    'host_in': A(4, '怎么样') - .2, 'ds_good': A(4, 'DeepSeek'), 'op_smooth': A(4, 'Opus'), 'gpt_worse': A(4, 'GPT'),
    'data_in': A(5, '这次测试'), 'data_time': A(5, '所用的时间'), 'data_cost': A(5, '消耗的金额'), 'lowest': A(5, '全场最低'),
    'ds_front': A(5, '那平时'),
    'sec2': A(6, '第二个') - .2,
    # ③ 雷峰塔
    'ds_up': A(6, 'DeepSeek'), 'towers': A(7, '我先让') + .1,
    'gpt_front': A(7, '单从'), 'gpt_detail': A(7, 'GPT') - .2, 'gpt_back': A(7, '但要拉到') - .15,
    'ds_front3': A(7, '但要拉到') + .35, 'water': A(7, '水面') - .1, 'fog': A(7, '雾') - .05, 'mount': A(7, '远处的山'), 'whole': A(7, '组合') - .1,
    'ds_back3': A(7, '对比起来') - .2, 'op_front': A(7, '对比起来') + .25, 'fuyan': A(7, '敷衍'), 'op_back': A(8, '除了') + .3,
    # ③ 便利店
    'towers_out': A(8, '三渲二') - .9, 'stores': A(8, '三渲二') - .2,
    'ds_front4': A(8, '整体效果'), 'gpt_front4': A(8, 'GPT') - .1, 'gpt_replay': A(8, '更像是') - .25, 'op_front4': A(8, 'Opus') - .1,
    'op_replay': A(8, 'Opus') + .3, 'op_lamp': A(8, '整个便利店'), 'op_dark': A(9, '里面'), 'ds_front5': A(9, '所以'), 'first': A(9, '第一名') - .35,
    'stores_out': A(10, '自反馈') - 1.0,
    # ⑤ 自反馈
    'rl_in': A(10, '自反馈') - .8, 'rl_hl1': A(10, '自反馈') - .1, 'rl_hl2': A(10, '提升了'), 'rl_hl3': A(10, '从零开始') - .1,
    'sec4': A(11, '第四个') - .15,
    # ⑥ 海岸
    'coast_in': A(11, '第四个') + .35, 'prompt_in': A(11, '而且这个') - .1, 'hl_real': A(11, '极度真实') - .05, 'hl_perfect': A(11, '完美') - .05,
    'pua': A(11, '是不是') - .1, 'pua_hit': A(11, 'PUA'),
    # ⑦ 赛车
    'sec7': A(12, '第五个') - .15, 'g1': A(12, '第五个') + .15, 'g2': A(12, '好消息') - .7, 'g3': A(12, '但坏消息') - .5,
    'gop': A(12, 'Opus') - .15, 'gop_light': A(12, '灯光太过') - .1, 'ggpt': A(12, 'GPT') - .15, 'gpt_plain': A(12, '太素了') - .1,
    'gds': A(12, 'DeepSeek在') - .15, 'ds_bad': A(13, '但问题') - .1, 'keys': A(13, '它左右键') - .1, 'keys_rev': A(13, '这你受得了') - .6,
    'rank': A(13, '所以这一轮') - .1, 'rank_last': A(13, '排在了最后') - .1,
    'cmp': A(14, '不过') - .1, 'c_ds': A(14, '9.2元') - .15, 'c_op': A(14, '321') - .15, 'x35': A(14, '这35倍'), 'crash': A(14, '撞墙') - .05,
    # ⑧ Blender
    'sec8': A(15, '最后一个') - .2, 'op_in8': A(15, '这里就让'), 'op_out8': A(15, '退赛') + .1,
    'ds_in8': A(15, '同时给'), 'gpt_in8': A(15, '更强劲') - .1, 'astra_up': A(15, '升级成了'),
    'ref_in': A(15, '这次比拼'), 'astra_skill': A(15, '这可是'),
    'twist': A(16, '但令我') - .1, 'cars_in': A(16, 'DeepSeek') - .2, 'ds_better': A(16, '还要好') - .1, 'detail': A(16, '细节'), 'lead': A(16, '领先'),
    # ⑨ 总结
    'sec9': A(17, '说真的') - .15, 'cost_in': A(17, '6个案例'), 'tok_hl': A(17, '5个亿') - .1, 'cny_hl': A(17, '50多块') - .1,
    'pingpong': A(17, '而且还能'), 'strong': A(17, '我觉得'), 'liang': A(18, '这次') - .15, 'liang_hit': A(18, '最强'),
    # ⑩ 内心戏
    'sec10': A(19, '在使用') - .15, 'flash_lbl': A(19, '虽然'), 'max': A(19, 'max') - .1,
    'think_in': A(20, 'DeepSeek思考') - .1, 'think_run': A(20, '在跑'), 'think_find': A(20, '发现问题') - .1, 'think_fix': A(20, '还一边改') - .1,
    'think_done': A(20, '最后'), 'think_out': A(20, '才输出'),
    'sec11': A(21, '那我们') - .15,
    # ⑪ 接入教程
    'dsh_ds': A(22, '是把') + .2, 'dsh_in': A(22, 'Harness') - .3, 'dsh_all': A(22, '以上的演示'),
    'la_in': A(23, '这里有两种') - .15,   # 阿亮：「没有安装…下载一下」全程 A-roll，之后再接录屏
     'la_1': A(23, '第一种'), 'la_2': A(23, '直接登录') + .35, 'la_3': A(23, '点进去'), 'la_4': A(23, '最新的模型'),
    'ap_in': A(23, '如果不想'), 'ap_1': A(23, '或者说是'), 'ap_2': A(23, '那就选择'), 'ap_3': A(23, '添加API'),
    'plat': A(23, 'API Key可以去'), 'plat_in': A(23, '开放平台') - .2,
    'ck_1': A(24, '依次点击'), 'ck_2': A(24, '创建API Key'), 'ck_3': A(24, '输入名称'), 'ck_4': A(24, '最后把'), 'ck_5': A(24, '复制粘贴'),
    'cx_in': A(25, '我们还可以'), 'cx_codex': A(25, 'Codex'), 'cx_cc': A(25, 'Codex') + .7, 'cx_switch': A(25, 'CC Switch'), 'cx_easy': A(25, '配置起来'),
    'cx_gpt': A(25, '咱们以'), 'cx_key': A(25, '只需要把'), 'cx_paste': A(25, '粘贴进来'), 'cx_test': A(25, '可以点击'), 'cx_run': A(25, '测速跑'),
    'cx_save': A(25, '没问题'), 'cx_back': A(25, '重新再进'), 'cx_model': A(26, '模型就切换') - .3,
    'other': A(27, '其他的像是'), 'wb': A(27, 'WorkBuddy'), 'kimi': A(27, 'Kimi'), 'builtin': A(27, '都内置了'), 'other_key': A(27, '接入API'),
    # ⑫ 余额
    'bal_in': A(28, '当然') - .05, 'bal_hl': A(28, '余额充足') - .2, 'oops': A(28, '余额用尽') - .1, 'fix_in': A(28, '要不就'), 'fix_hl': A(28, '还傻傻地') - .1,
    # ⑬ 搜索 API
    'sec13': A(29, '除了推出') - .15, 'pareto': A(29, '成为帕累托'), 'api_in': A(29, '开放自研') - .2, 'api_hl': A(29, '开放自研'),
    'la_word': A(29, '那就是拉') + .3, 'hen_la': A(29, '就是狠拉') + .2, 'la_out': A(30, '官方说') - .2,
    'src_in': A(30, '又少又拉') - .1, 'apps': A(30, '某音'), 'apps_x': A(30, '里面的数据'),
    'not_rec': A(31, '不是很推荐'), 'pro1': A(31, '搜得快'), 'pro2': A(31, '没广告'), 'end': A(32, '最后你用上'), 'bye': A(32, '下期再见'),
}
EV = {k: round(v, 3) for k, v in EV.items()}

# ---------------------------------------------------------------- 素材
SOURCES = {
    'aroll_a': 'media/aroll_a.mp4', 'aroll_b': 'media/aroll_b.mp4', 'person_a': 'media/person_a.mp4', 'person_b': 'media/person_b.mp4', 'person_c': 'media/person_c.mp4',
    'login_acc': 'media/login_acc.mp4', 'login_api': 'media/login_api.mp4', 'codex': 'media/codex.mp4',
    'xuanyun': 'media/xuanyun.mp4',
    'mv_gpt': 'media/mv_gpt.mp4', 'mv_op': 'media/mv_op.mp4', 'mv_ds': 'media/mv_ds.mp4',
}
for p in sorted((ROOT / 'media' / 'demo').glob('*.mp4')):
    SOURCES[p.stem] = f'media/demo/{p.name}'
IMAGES = sorted(p.name for p in (ROOT / 'assets').iterdir() if p.suffix in ('.png', '.jpg'))

# 文档里的数据（用时 / Token 百万 / 金额 元）
DATA = {
    'store': {'ds': ['42:11', 58.4, 6.9], 'gpt': ['14:28', 5, 7.8], 'op': ['35:03', 3.5, 40]},
    'mv': {'ds': ['12:48', 17.9, 18.8], 'gpt': ['25:52', 9.6, 26.63], 'op': ['28:00', 9.2, 44.56]},
    'tower': {'ds': ['43:50', 26.3, 3.62], 'gpt': ['11:39', 2.4, 9.8], 'op': ['8:00', 1.2, 14]},
    'game': {'ds': ['1:10:28', 91.5, 9.2], 'gpt': ['19:24', 6.3, 21.74], 'op': ['55:00', 47, 321.12]},
    'car': {'ds': ['31:48', 12.7, 3], 'astra': ['5:38', 1.3, 17.59]},
}


def main():
    shots = []
    for k, (i, name, st) in enumerate(SHOTS):
        en = SHOTS[k + 1][2] if k + 1 < len(SHOTS) else tl.TOTAL
        shots.append({'i': i, 'start': round(st, 3), 'end': round(en, 3), 'text': name})
    subs = []
    for a, txt, b in tl.SUBS:
        sid = next(s['i'] for s in shots if s['start'] <= a < s['end'])
        subs.append([round(a, 3), txt, sid, round(b, 3)])
    p = json.loads((ROOT / 'project.json').read_text())
    p.update(title='DeepSeek V4.1 Flash 三模型 PK', fps=30, audio='mix.m4a' if (ROOT / 'mix.m4a').exists() else '_demo-clock.wav',
             sources=SOURCES, images=IMAGES, shots=shots, subs=subs, events=EV,
             sceneScripts=['s1.js', 's2.js', 's3.js', 's4.js', 's5.js', 's6.js'],
             fonts=['64px Sub', '40px Black', '120px Title', '80px Num'],
             extra={'pieces': tl.pieces, 'holds': tl.hold_at, 'data': DATA, 'mv': [MV_AT, MV_LEN]})
    (ROOT / 'project.json').write_text(json.dumps(p, ensure_ascii=False, indent=1) + '\n')
    (HERE / '_timeline.json').write_text(json.dumps({'pieces': tl.pieces, 'total': tl.TOTAL, 'events': EV, 'holds': tl.hold_at}, ensure_ascii=False, indent=1))
    subprocess.run([sys.executable, str(ROOT / 'build.py')], check=True)


if __name__ == '__main__':
    main()
