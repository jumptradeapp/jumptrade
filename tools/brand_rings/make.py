"""jumptrade. rings brand set (Nov 18): the existing lockup (big rounded 'JUMP' + small 'trade.' under the P, exactly as in
web/v2/img/jump-lockup.svg at a876967, kept here as jump_lockup_a876967.svg) with ONLY its two-tone circles swapped for
app tile D's rings: the exact 9 white arcs from tools/app_icon/icon-512.svg, same centre and outer size as the old circles.

Run from the repo root:  python3 tools/brand_rings/make.py
Needs: resvg_py, Pillow; playwright + Chrome for the share tile (it uses the Poppins font in web/fonts).
"""
import io, os, re, sys
import resvg_py
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = os.path.join(ROOT, 'web')
HERE = os.path.dirname(os.path.abspath(__file__))

ICON = open(os.path.join(ROOT, 'tools/app_icon/icon-512.svg')).read()
ARCS = re.findall(r'<path d="(M[^"]+)" fill="none" stroke="#FFFFFF" stroke-width="56.00"', ICON)
assert len(ARCS) == 9, len(ARCS)
OLD = open(os.path.join(HERE, 'jump_lockup_a876967.svg')).read()
# old circles: centre (112,112), outer edge 104 + 14/2 = 111 inside the group 'translate(0 -2.4) scale(0.8471)'
RINGS_START = OLD.index('<g transform="translate(0 -2.4) scale(0.8471)"'); RINGS_END = OLD.index('<g transform="translate(241.3 0)">')
TILE_OUTER = 410 + 28  # tile D outer ring radius + half its stroke

def rings(fill='#FFFFFF', cx=512, cy=512, k=1.0):
    p = ''.join('<path d="%s"/>' % d for d in ARCS)
    return ('<g transform="translate(%.3f %.3f) scale(%.6f) translate(-512 -512)" fill="none" stroke="%s" stroke-width="56" stroke-linecap="round">%s</g>'
            % (cx, cy, k, fill, p))

def lockup(ring='#FFFFFF', wm='#fff', defs=''):
    new = '<g transform="translate(0 -2.4) scale(0.8471)">' + rings(ring, 112, 112, 111.0 / TILE_OUTER) + '</g>'
    word = OLD[RINGS_END:].replace('fill="#fff"', 'fill="%s"' % wm)
    head = OLD[:RINGS_START] + defs
    return head + new + word

def mark(stroke='#FFFFFF', defs=''):  # the rings alone, square, edge to edge
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="74 74 876 876">%s%s</svg>' % (defs, rings(stroke))

GRAD_ICE = '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="74" y1="950" x2="950" y2="74"><stop offset="0" stop-color="#5B9BEA"/><stop offset=".55" stop-color="#93C0F6"/><stop offset="1" stop-color="#E1F0FF"/></linearGradient></defs>'
GRAD_MID = '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="74" y1="950" x2="950" y2="74"><stop offset="0" stop-color="#2E6DB4"/><stop offset=".5" stop-color="#5B9BEA"/><stop offset="1" stop-color="#93C0F6"/></linearGradient></defs>'
GRAD_DEEP = '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="74" y1="950" x2="950" y2="74"><stop offset="0" stop-color="#173B63"/><stop offset=".55" stop-color="#2E6DB4"/><stop offset="1" stop-color="#3F7ACB"/></linearGradient></defs>'

def png(svg, w, h=None, bg=None):
    b = bytes(resvg_py.svg_to_bytes(svg_string=svg, width=w, height=h) if h else resvg_py.svg_to_bytes(svg_string=svg, width=w))
    im = Image.open(io.BytesIO(b)).convert('RGBA')
    if bg: base = Image.new('RGBA', im.size, bg); base.alpha_composite(im); im = base
    return im

def fit(im, size):  # centre on a transparent canvas of the old file's size (the classic app's CSS expects those sizes)
    c = Image.new('RGBA', size, (0, 0, 0, 0)); t = im.copy(); t.thumbnail(size, Image.LANCZOS); c.alpha_composite(t, ((size[0] - t.width) // 2, (size[1] - t.height) // 2)); return c

def save(rel, data):
    p = os.path.join(W, rel)
    if isinstance(data, str): open(p, 'w').write(data)
    else: data.save(p, optimize=True)
    print('wrote', rel)

def main():
    white = lockup()
    save('v2/img/jump-lockup.svg', white)            # v2 header, landing page, desktop sidebar
    save('v2/img/jumptrade-logo.svg', white)         # same lockup under its old name
    save('v2/img/jump-rings.svg', mark())            # rings alone, white
    tile = ICON.replace('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">',
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><clipPath id="rr"><rect width="1024" height="1024" rx="228"/></clipPath><g clip-path="url(#rr)">').replace('</svg>', '</g></svg>')
    save('v2/img/jump-icon.svg', tile)               # tile D with rounded corners
    # emails: 3x of 240x49 so it stays sharp on phones; transparent, white, sits on the navy email header
    em = png(white, 720); save('v2/img/email-logo-rings1118.png', em)
    save('v2/img/email-logo.png', png(white, 325))   # the older email name, in case an old email is still opened
    # the sign-in / install mark (jmMark): the rings in swoop blues so they read on light and dark
    mk = png(mark('url(#g)', GRAD_MID), 232); save('v2/img/mark-rings.png', mk); save('v2/img/mark-blue.png', fit(mk, (161, 116)))
    # classic app: same names and sizes as before
    save('img/jump-mark.png', fit(png(mark('url(#g)', GRAD_ICE), 426), (716, 426)))
    save('img/jump-mark-light.png', fit(png(mark('url(#g)', GRAD_DEEP), 426), (716, 426)))
    save('img/jump-trade.png', fit(png(lockup(), 1400), (1455, 493)))
    save('img/jump-trade-light.png', fit(png(lockup('#2E6DB4', '#0A1F40'), 1400), (1455, 493)))
    # favicon: tile D, rounded
    save('img/favicon.png', png(tile, 64))
    og()

OG_HTML = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://%(W)s/fonts/Poppins-500-latin.woff2) format("woff2");font-weight:500}
@font-face{font-family:P;src:url(file://%(W)s/fonts/Poppins-700-latin.woff2) format("woff2");font-weight:700}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
.t{position:relative;width:1200px;height:630px;background:linear-gradient(200deg,#2E6DB4 0%%,#173B63 48%%,#0F253F 100%%);font-family:P,sans-serif}
.t:before{content:"";position:absolute;inset:0;background:radial-gradient(70%% 80%% at 88%% 6%%,rgba(187,215,249,.30),rgba(147,192,246,.08) 45%%,rgba(147,192,246,0) 70%%)}
.t:after{content:"";position:absolute;inset:0;background:radial-gradient(75%% 85%% at 50%% 50%%,rgba(10,20,42,0) 60%%,rgba(10,20,42,.35))}
.sw{position:absolute;left:-120px;right:-120px;bottom:-40px;height:260px;background:#93C0F6;opacity:.12;filter:blur(40px);border-radius:50%%;transform:rotate(-9deg)}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2}
.c svg{width:640px;height:auto;display:block}
.tg{margin-top:42px;color:#E1F0FF;font-weight:500;font-size:27px;letter-spacing:.26em}.tg b{font-weight:700;color:#fff}
</style></head><body><div class="t"><div class="sw"></div><div class="c">%(LOCK)s<div class="tg">KNOW BEFORE YOU <b>JUMP.</b></div></div></div></body></html>'''

def og():
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        print('skip og (no playwright):', e); return
    html = OG_HTML % {'W': W, 'LOCK': lockup()}
    tmp = os.path.join(HERE, '.og.html'); open(tmp, 'w').write(html)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox', '--allow-file-access-from-files'])
        pg = b.new_page(viewport={'width': 1200, 'height': 630}); pg.goto('file://' + tmp); pg.wait_for_timeout(600)
        raw = pg.screenshot(type='png'); b.close()
    os.remove(tmp)
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    im.save(os.path.join(W, 'og.png'), optimize=True); im.save(os.path.join(W, 'og.jpg'), quality=90, optimize=True, progressive=True)
    print('wrote og.png og.jpg')

if __name__ == '__main__':
    main()
