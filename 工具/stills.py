"""浏览器审片：打开预览网页，用 renderAt(t) 精确取几张静帧拼成一张图（不编码视频）。
用法：python3 stills.py 输出.jpg t1 t2 ... [--url http://127.0.0.1:8771/index.html] [--cols 4]
"""
import asyncio, base64, io, sys
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont


async def main(out, times, url, cols, w):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1500, 'height': 1000})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(url)
        await pg.wait_for_function('window.READY === true', timeout=180000)
        ims = []
        for t in times:
            await pg.evaluate(f'window.renderAt({t})')
            data = await pg.evaluate("document.getElementById('c').toDataURL('image/jpeg', .85)")
            im = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB').resize((w, w * 9 // 16))
            d = ImageDraw.Draw(im); d.rectangle([0, 0, 90, 22], fill='black'); d.text((4, 4), f'{t:.2f}s', fill='yellow')
            ims.append(im)
        await b.close()
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (w * cols, rows * w * 9 // 16), 'black')
    for k, im in enumerate(ims): sheet.paste(im, ((k % cols) * w, (k // cols) * w * 9 // 16))
    sheet.save(out, quality=85)
    if errs: print('ERRORS:', errs[:8])
    print('saved', out)


if __name__ == '__main__':
    args = sys.argv[1:]
    url = 'http://127.0.0.1:8771/index.html'; cols = 4; w = 640
    if '--url' in args: i = args.index('--url'); url = args[i + 1]; del args[i:i + 2]
    if '--cols' in args: i = args.index('--cols'); cols = int(args[i + 1]); del args[i:i + 2]
    if '--w' in args: i = args.index('--w'); w = int(args[i + 1]); del args[i:i + 2]
    asyncio.run(main(args[0], [float(x) for x in args[1:]], url, cols, w))
