"""按本期实际用到的字做字体子集（随工程交付，体积小、手机和线上都能用）。

扫描 lines.py 与所有场景 JS 里的文字，生成 fonts/*.woff 和 fonts.css。
字体：字幕 Noto Sans CJK SC Bold；徽章/数据 Noto Sans CJK SC Black；大标题 优设标题黑；数字 Bebas Neue。
"""
import re, sys
from pathlib import Path
from fontTools.ttLib import TTCollection, TTFont
from fontTools import subset

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
WB = ROOT.parent.parent / 'video-workbench' / '字体'
OUT = ROOT / 'fonts'
OUT.mkdir(exist_ok=True)

text = (HERE / 'lines.py').read_text()
for js in ROOT.glob('*.js'):
    text += js.read_text()
chars = set(text) | set('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,:;!?%+-×·/¥$()[]#@&\'"…—_=<>|~^*')
chars = ''.join(sorted(c for c in chars if c.isprintable()))


def from_ttc(path, name_has):
    col = TTCollection(str(path))
    for f in col.fonts:
        if any(name_has in (r.toUnicode() if hasattr(r, 'toUnicode') else str(r)) for r in f['name'].names if r.nameID in (1, 4)):
            return f
    return col.fonts[0]


def write(font, fname):
    opts = subset.Options(); opts.flavor = 'woff'; opts.layout_features = ['*']; opts.name_IDs = ['*']
    opts.notdef_outline = True; opts.hinting = False
    sub = subset.Subsetter(opts); sub.populate(text=chars); sub.subset(font)
    font.flavor = 'woff'; font.save(str(OUT / fname))
    print(fname, (OUT / fname).stat().st_size // 1024, 'KB')


NOTO = Path('/usr/share/fonts/opentype/noto')
write(from_ttc(NOTO / 'NotoSansCJK-Bold.ttc', 'CJK SC'), 'sub.woff')
write(from_ttc(NOTO / 'NotoSansCJK-Black.ttc', 'CJK SC'), 'black.woff')
write(TTFont(str(WB / '优设标题黑.ttf')), 'title.woff')
write(TTFont(str(WB / 'BebasNeue-Regular.ttf')), 'num.woff')
(ROOT / 'fonts.css').write_text('''/* 本期字体：由 工具/make_fonts.py 按用到的字生成子集 */
@font-face{font-family:Sub;src:url(fonts/sub.woff) format("woff");font-display:block}
@font-face{font-family:Black;src:url(fonts/black.woff) format("woff");font-display:block}
@font-face{font-family:Title;src:url(fonts/title.woff) format("woff");font-display:block}
@font-face{font-family:Num;src:url(fonts/num.woff) format("woff");font-display:block}
''')
print(len(chars), 'chars')
