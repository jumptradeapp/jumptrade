"""jumptrade. rings brand set.

Rings: tile V5 Deep swoop (Nov 19, 2026; Jason approved). Same 9-arc family as
tile D, thicker strokes and slightly tighter angular gaps, mark ~72% of the
tile, on a deep navy → swoop-blue gradient.

Wordmark: the white rounded 'jumptrade.' Jason picked, with the lighter
'trade.' (~60% stroke) as the default. Outlines live in this folder so the
script runs from the repo alone.

Run from the repo root:  python3 tools/brand_rings/make.py --trade bold
                         python3 tools/brand_rings/make.py                (default, shipped: --trade light)
                         python3 tools/brand_rings/make.py --trade light45
Needs: resvg_py, Pillow; playwright + Chrome for the share tile (Poppins in web/fonts).
"""
import io, math, os, sys
import resvg_py
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = os.path.join(ROOT, 'web')
HERE = os.path.dirname(os.path.abspath(__file__))
APP_ICON = os.path.join(ROOT, 'tools', 'app_icon')

WORD = open(os.path.join(HERE, 'wordmark.d')).read().strip()  # 'jumptrade.' outline, x 202..674, y 16..104
TRADE = 'light'  # shipped Nov 18 (Jason: B with the lighter trade.); --trade bold|light|light45
def word_d():
    if TRADE == 'bold': return WORD
    sys.path.insert(0, HERE); import lighten
    jump, _ = lighten.split(); return jump + lighten.light({'light': 0.60, 'light45': 0.45}[TRADE])

# --- V5 ring geometry (1024 tile, painted outer edge matches tile D's 72%) ---
# Tile D was radii 222/316/410, stroke 56, then scale 0.84 → outer = (410+28)*0.84.
CX = CY = 512.0
MARK_OUTER = (410 + 28) * 0.84          # 367.92; 71.86% of the tile
V5_STROKE, V5_GAP, V5_PAD = 60.0, 30.0, 4.0
_spacing = V5_STROKE + V5_GAP
_r_out = MARK_OUTER - V5_STROKE / 2.0
V5_RADII = (_r_out - 2 * _spacing, _r_out - _spacing, _r_out)  # ~157.9, 247.9, 337.9

# Original tile-D centerline angles (screen degrees, 0° = east, y-down) at 222/316/410.
_ARCS_ORIG = {
    222.0: [
        (278.77324114479893, 147.22693600546626),
        (122.77306399453380, 351.22675885520107),
        (325.67592456886480, 304.32407543113520),
    ],
    316.0: [
        (280.92339816495030, 145.07675490559376),
        (124.92324509440624, 349.07660183504976),
        (328.11810289989296, 301.88189710010704),
    ],
    410.0: [
        (282.08665602975907, 143.91241943881226),
        (126.08758056118774, 347.91334397024093),
        (329.54787886111444, 300.45212113888556),
    ],
}

def _expand(start, end, pad):
    span = (start - end) % 360.0
    ns, ne = (start + pad) % 360.0, (end - pad) % 360.0
    nxt = (ns - ne) % 360.0
    if nxt >= 170 or nxt <= span:
        return start, end
    return ns, ne

def _angles(r, pad=V5_PAD):
    keys = sorted(_ARCS_ORIG)
    if r <= keys[0]:
        arcs = _ARCS_ORIG[keys[0]]
    elif r >= keys[-1]:
        arcs = _ARCS_ORIG[keys[-1]]
    else:
        lo = max(k for k in keys if k <= r)
        hi = min(k for k in keys if k >= r)
        t = 0 if hi == lo else (r - lo) / (hi - lo)
        arcs = [(s0 + t * (s1 - s0), e0 + t * (e1 - e0))
                for (s0, e0), (s1, e1) in zip(_ARCS_ORIG[lo], _ARCS_ORIG[hi])]
    return [_expand(s, e, pad) for s, e in arcs]

def _pt(r, deg):
    a = math.radians(deg)
    return CX + r * math.cos(a), CY + r * math.sin(a)

def _arc_d(r, start, end):
    x1, y1 = _pt(r, start); x2, y2 = _pt(r, end)
    return 'M%.2f %.2fA%.2f %.2f 0 0 0 %.2f %.2f' % (x1, y1, r, r, x2, y2)

def ring_paths():
    out = []
    for r in V5_RADII:
        for start, end in _angles(r):
            out.append(_arc_d(r, start, end))
    assert len(out) == 9, len(out)
    return out

ARCS = ring_paths()

# lockup geometry (units): rings diameter 108 centred at (54, 60); wordmark starts 24 to the right of the rings
RD, RCX, RCY, GAP = 108.0, 54.0, 60.0, 24.0
MARK_DIAM = 2.0 * MARK_OUTER            # 735.84, painted outer edge both sides
K = RD / MARK_DIAM
WX = RD + GAP - 202.0
VB_W, VB = RD + GAP + 472.0 + 2, '0 4 %.1f 112' % (RD + GAP + 472.0 + 2)
# mark-only viewBox, edge to edge around the painted rings
MARK_VB0 = CX - MARK_OUTER
MARK_VB = '%.2f %.2f %.2f %.2f' % (MARK_VB0, MARK_VB0, MARK_DIAM, MARK_DIAM)

def rings(fill='#FFFFFF', cx=RCX, cy=RCY, k=K, extra='', stroke=V5_STROKE):
    p = ''.join('<path d="%s"/>' % d for d in ARCS)
    return ('<g transform="translate(%.3f %.3f) scale(%.6f) translate(-512 -512)" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round"%s>%s</g>'
            % (cx, cy, k, fill, stroke, extra, p))

def word(fill='#FFFFFF'):
    return '<path transform="translate(%.1f 0)" fill="%s" fill-rule="evenodd" d="%s"/>' % (WX, fill, word_d())

def lockup(ring='#FFFFFF', wm='#FFFFFF', defs=''):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s">%s%s%s</svg>' % (VB, defs, rings(ring), word(wm))

def mark(stroke='#FFFFFF', defs=''):  # the rings alone, square, edge to edge
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s">%s%s</svg>' % (MARK_VB, defs, rings(stroke, 512, 512, 1.0))

# V5 tile background: deep navy → swoop blue, richer top-right light than tile D.
BG_V5 = '''<defs>
  <linearGradient id="bg" x1="0.12" y1="1" x2="0.88" y2="0">
    <stop offset="0" stop-color="#080D18"/>
    <stop offset="0.38" stop-color="#0E2A52"/>
    <stop offset="1" stop-color="#1E62C4"/>
  </linearGradient>
  <radialGradient id="sh" cx="0.82" cy="0.08" r="0.64">
    <stop offset="0" stop-color="#7EB6F5" stop-opacity="0.42"/>
    <stop offset="0.35" stop-color="#4A8FE8" stop-opacity="0.28"/>
    <stop offset="1" stop-color="#4A8FE8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vg" cx="0.5" cy="0.55" r="0.74">
    <stop offset="0.55" stop-color="#080D18" stop-opacity="0"/>
    <stop offset="1" stop-color="#05080F" stop-opacity="0.40"/>
  </radialGradient>
  <filter id="bl" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="38"/>
  </filter>
</defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<rect width="1024" height="1024" fill="url(#sh)"/>
<path d="M-120 980 C 180 700, 560 560, 1150 520 L1150 640 C 600 680, 240 820, -120 1120Z" fill="#4A8FE8" opacity="0.11" filter="url(#bl)"/>
<rect width="1024" height="1024" fill="url(#vg)"/>
'''

def tile_svg(rounded=False, mark_scale=1.0):
    """Full 1024 app tile, V5 background + rings. mark_scale < 1 shrinks the rings for maskable."""
    mark = rings('#FFFFFF', 512, 512, mark_scale, stroke=V5_STROKE)
    body = BG_V5 + mark
    if rounded:
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
                '<clipPath id="rr"><rect width="1024" height="1024" rx="228"/></clipPath>'
                '<g clip-path="url(#rr)">%s</g></svg>' % body)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
            '%s</svg>' % body)

# The square source used by tools/app_icon and by older make.py consumers.
ICON = None  # set in main() after TRADE is known is unnecessary; tile has no wordmark
def icon_svg():
    return tile_svg(rounded=False)

GRAD_ICE = '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f"><stop offset="0" stop-color="#5B9BEA"/><stop offset=".55" stop-color="#93C0F6"/><stop offset="1" stop-color="#E1F0FF"/></linearGradient></defs>' % (MARK_VB0, 1024 - MARK_VB0, 1024 - MARK_VB0, MARK_VB0)
GRAD_MID = '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f"><stop offset="0" stop-color="#2E6DB4"/><stop offset=".5" stop-color="#5B9BEA"/><stop offset="1" stop-color="#93C0F6"/></linearGradient></defs>' % (MARK_VB0, 1024 - MARK_VB0, 1024 - MARK_VB0, MARK_VB0)
GRAD_DEEP = '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f"><stop offset="0" stop-color="#173B63"/><stop offset=".55" stop-color="#2E6DB4"/><stop offset="1" stop-color="#3F7ACB"/></linearGradient></defs>' % (MARK_VB0, 1024 - MARK_VB0, 1024 - MARK_VB0, MARK_VB0)

def png(svg, w, h=None, bg=None):
    b = bytes(resvg_py.svg_to_bytes(svg_string=svg, width=w, height=h) if h else resvg_py.svg_to_bytes(svg_string=svg, width=w))
    im = Image.open(io.BytesIO(b)).convert('RGBA')
    if bg: base = Image.new('RGBA', im.size, bg); base.alpha_composite(im); im = base
    return im

def fit(im, size):  # centre on a transparent canvas of the old file's size (the classic app's CSS expects those sizes)
    c = Image.new('RGBA', size, (0, 0, 0, 0)); t = im.copy(); t.thumbnail(size, Image.Resampling.LANCZOS); c.alpha_composite(t, ((size[0] - t.width) // 2, (size[1] - t.height) // 2)); return c

def save(rel, data, root=None):
    p = os.path.join(root or W, rel)
    os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
    if isinstance(data, str): open(p, 'w').write(data)
    else: data.save(p, optimize=True)
    print('wrote', p if root else rel)

def write_app_icons():
    square = tile_svg(rounded=False)
    rounded = tile_svg(rounded=True)
    maskable = tile_svg(rounded=False, mark_scale=0.72 / 0.84)  # same safe-zone inset as tile D's maskable
    # vector sources
    save('icon-512.svg', square, APP_ICON)
    save('icon-192.svg', square, APP_ICON)
    save('apple-touch-icon-v3.svg', square, APP_ICON)  # keep old name in sync
    save('apple-touch-icon-v4.svg', square, APP_ICON)
    save('icon-maskable-512.svg', maskable, APP_ICON)
    # rasters (opaque, like the previously shipped icons)
    def rgb(svg, size, rel):
        im = png(svg, size).convert('RGB')
        save(rel, im)
        return im
    rgb(square, 512, 'icon-512.png')
    rgb(square, 192, 'icon-192.png')
    for name in ('apple-touch-icon.png', 'apple-touch-icon-precomposed.png',
                 'apple-touch-icon-v2.png', 'apple-touch-icon-v3.png', 'apple-touch-icon-v4.png'):
        rgb(square, 180, name)
    rgb(maskable, 512, 'icon-maskable-512.png')
    # favicon png (rounded) + ico + svg
    save('img/favicon.png', png(rounded, 64).convert('RGBA'))
    save('favicon.svg', rounded)
    ico_src = png(rounded, 256).convert('RGBA')
    ico_path = os.path.join(W, 'favicon.ico')
    ico_src.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('wrote favicon.ico')

def main():
    white = lockup()
    save('v2/img/jump-lockup.svg', white)            # v2 header, landing page, desktop sidebar
    save('v2/img/jumptrade-logo.svg', white)         # same lockup under its old name
    save('v2/img/jump-lockup-navy.svg', lockup('#0B2A55', '#0B2A55'))  # B-Light / light sidebar
    save('v2/img/jump-rings.svg', mark())            # rings alone, white
    tile = tile_svg(rounded=True)
    save('v2/img/jump-icon.svg', tile)               # V5 tile with rounded corners
    # emails: 3x of 240x44 so it stays sharp on phones; transparent, white, sits on the navy email header
    em = png(white, 726); save('v2/img/email-logo-rings1118l.png', em)
    save('v2/img/email-logo.png', png(white, 325))   # the older email name, in case an old email is still opened
    # the sign-in / install mark (jmMark): the rings in swoop blues so they read on light and dark
    mk = png(mark('url(#g)', GRAD_MID), 232); save('v2/img/mark-rings.png', mk); save('v2/img/mark-blue.png', fit(mk, (161, 116)))
    # classic app: same names and sizes as before
    save('img/jump-mark.png', fit(png(mark('url(#g)', GRAD_ICE), 426), (716, 426)))
    save('img/jump-mark-light.png', fit(png(mark('url(#g)', GRAD_DEEP), 426), (716, 426)))
    save('img/jump-trade.png', fit(png(lockup('url(#g)', '#FFFFFF', GRAD_ICE.replace('%.2f' % MARK_VB0, '0').replace('%.2f' % (1024 - MARK_VB0), '112')), 1400), (1455, 493)))
    save('img/jump-trade-light.png', fit(png(lockup('#2E6DB4', '#0A1F40'), 1400), (1455, 493)))
    write_app_icons()
    og()

# Share tile: same lockup, V5-deep background so it matches the new app tile.
OG_HTML = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://%(W)s/fonts/Poppins-500-latin.woff2) format("woff2");font-weight:500}
@font-face{font-family:P;src:url(file://%(W)s/fonts/Poppins-700-latin.woff2) format("woff2");font-weight:700}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
.t{position:relative;width:1200px;height:630px;background:linear-gradient(200deg,#1E62C4 0%%,#0E2A52 48%%,#080D18 100%%);font-family:P,sans-serif}
.t:before{content:"";position:absolute;inset:0;background:radial-gradient(70%% 80%% at 88%% 6%%,rgba(126,182,245,.42),rgba(74,143,232,.14) 45%%,rgba(74,143,232,0) 70%%)}
.t:after{content:"";position:absolute;inset:0;background:radial-gradient(75%% 85%% at 50%% 50%%,rgba(5,8,15,0) 60%%,rgba(5,8,15,.40))}
.sw{position:absolute;left:-120px;right:-120px;bottom:-40px;height:260px;background:#4A8FE8;opacity:.11;filter:blur(40px);border-radius:50%%;transform:rotate(-9deg)}
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
    if '--trade' in sys.argv: TRADE = sys.argv[sys.argv.index('--trade') + 1]
    assert TRADE in ('bold', 'light', 'light45'), TRADE
    main()
