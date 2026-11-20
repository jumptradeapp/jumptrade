"""jumptrade. rings brand set.

Rings: Maze mark (Nov 19, 2026; Jason approved). Three concentric rings,
stroke 50/1024, one staggered gap each at 1:00 / 8:15 / 5:00. App tile is L1
(Nov 20, 2026): flat slate #1A1A1D, lavender rings #D3D9EE. No blue.

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

# --- Maze ring geometry (1024 tile; Jason approved Nov 19, 2026) ---
# Three concentric rings, equal stroke, one gap each, staggered:
#   outer mid-gap 1:00, middle 8:15, inner 5:00.
# Painted outer 384 matches jt_marks_refine_1119/mark3.svg and mark3_v5_tile.png.
CX = CY = 512.0
PAINTED_OUTER = 384.0
STROKE = 50.0
RING_GAP = 42.0  # clear space between strokes (centerline spacing = STROKE+RING_GAP)
MARK_OUTER = PAINTED_OUTER
_r_out = PAINTED_OUTER - STROKE / 2.0          # 359
RADII = (_r_out - 2 * (STROKE + RING_GAP),     # 175
         _r_out - (STROKE + RING_GAP),         # 267
         _r_out)                               # 359
# Mid-gap angles (0° = east, clockwise, y-down).
MAZE_MIDS = (60.0, 157.5, 300.0)  # inner 5:00, mid 8:15, outer 1:00
MAZE_VISIBLE_DEG = 15.0           # tip-to-tip visible angular gap

def _pt(r, deg):
    a = math.radians(deg)
    return CX + r * math.cos(a), CY + r * math.sin(a)

def _maze_ends(r, mid, visible_deg=MAZE_VISIBLE_DEG, stroke=STROKE):
    cap_ang = math.degrees(math.asin(min(0.999, (stroke / 2.0) / r)))
    half = visible_deg / 2.0 + cap_ang
    return (mid - half) % 360.0, (mid + half) % 360.0

def _arc_d(r, start, end):
    """Almost-full clockwise arc from start° to end° (large-arc, sweep=1)."""
    x1, y1 = _pt(r, start); x2, y2 = _pt(r, end)
    return 'M%.3f,%.3fA%.3f,%.3f 0 1 1 %.3f,%.3f' % (x1, y1, r, r, x2, y2)

def ring_paths():
    out = []
    for r, mid in zip(RADII, MAZE_MIDS):
        a0, a1 = _maze_ends(r, mid)
        # Clockwise from just after the gap (a1) to just before it (a0).
        out.append(_arc_d(r, a1, a0))
    assert len(out) == 3, len(out)
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

def rings(fill='#FFFFFF', cx=RCX, cy=RCY, k=K, extra='', stroke=STROKE):
    p = ''.join('<path d="%s"/>' % d for d in ARCS)
    return ('<g transform="translate(%.3f %.3f) scale(%.6f) translate(-512 -512)" fill="none" stroke="%s" stroke-width="%.3f" stroke-linecap="round" stroke-linejoin="round"%s>%s</g>'
            % (cx, cy, k, fill, stroke, extra, p))

def word(fill='#FFFFFF'):
    return '<path transform="translate(%.1f 0)" fill="%s" fill-rule="evenodd" d="%s"/>' % (WX, fill, word_d())

def lockup(ring=None, wm='#FFFFFF', defs=''):
    if ring is None:
        ring = RING_TILE  # #D3D9EE on dark lockups; wordmark stays white
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s">%s%s%s</svg>' % (VB, defs, rings(ring), word(wm))

def mark(stroke='#FFFFFF', defs=''):  # the rings alone, square, edge to edge
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s">%s%s</svg>' % (MARK_VB, defs, rings(stroke, 512, 512, 1.0))

# L1 tile: flat slate, lavender Maze rings. No blue, no swoop.
SLATE = '#1A1A1D'
RING_TILE = '#D3D9EE'
BG_L1 = '<rect width="1024" height="1024" fill="%s"/>' % SLATE

def tile_svg(rounded=False, mark_scale=1.0):
    """Full 1024 app tile, L1 slate + lavender rings. mark_scale < 1 shrinks the rings for maskable."""
    mark = rings(RING_TILE, 512, 512, mark_scale, stroke=STROKE)
    body = BG_L1 + mark
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
    maskable = tile_svg(rounded=False, mark_scale=(367.92 * 0.72 / 0.84) / PAINTED_OUTER)  # same painted size as V5/tile-D maskable (315.36)
    # vector sources
    save('icon-512.svg', square, APP_ICON)
    save('icon-192.svg', square, APP_ICON)
    save('apple-touch-icon-v3.svg', square, APP_ICON)  # keep old names in sync
    save('apple-touch-icon-v4.svg', square, APP_ICON)
    save('apple-touch-icon-v5.svg', square, APP_ICON)
    save('apple-touch-icon-v6.svg', square, APP_ICON)
    save('icon-maskable-512.svg', maskable, APP_ICON)
    # rasters (opaque, like the previously shipped icons)
    def rgb(svg, size, rel):
        im = png(svg, size).convert('RGB')
        save(rel, im)
        return im
    rgb(square, 512, 'icon-512.png')
    rgb(square, 192, 'icon-192.png')
    for name in ('apple-touch-icon.png', 'apple-touch-icon-precomposed.png',
                 'apple-touch-icon-v2.png', 'apple-touch-icon-v3.png', 'apple-touch-icon-v4.png',
                 'apple-touch-icon-v5.png', 'apple-touch-icon-v6.png'):
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
    save('v2/img/jump-icon.svg', tile)               # L1 slate tile, lavender Maze rings, rounded corners
    # emails: 3x of 240x44 so it stays sharp on phones; transparent, lavender rings + white wordmark, sits on the navy email header
    em = png(white, 726); save('v2/img/email-logo-rings1118l.png', em); save('v2/img/email-logo-rings1120l.png', em)
    save('v2/img/email-logo.png', png(white, 325))   # the older email name, in case an old email is still opened
    # the sign-in / install mark (jmMark): the rings in swoop blues so they read on light and dark
    mk = png(mark('url(#g)', GRAD_MID), 232); save('v2/img/mark-rings.png', mk); save('v2/img/mark-blue.png', fit(mk, (161, 116)))
    # classic app: same names and sizes as before
    save('img/jump-mark.png', fit(png(mark('url(#g)', GRAD_ICE), 426), (716, 426)))
    save('img/jump-mark-light.png', fit(png(mark('url(#g)', GRAD_DEEP), 426), (716, 426)))
    save('img/jump-trade.png', fit(png(lockup(RING_TILE, '#FFFFFF'), 1400), (1455, 493)))
    save('img/jump-trade-light.png', fit(png(lockup('#2E6DB4', '#0A1F40'), 1400), (1455, 493)))
    write_app_icons()
    og()

# Share tile: same lockup, L1 slate background so it matches the new app tile. No blue.
OG_HTML = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://%(W)s/fonts/Poppins-500-latin.woff2) format("woff2");font-weight:500}
@font-face{font-family:P;src:url(file://%(W)s/fonts/Poppins-700-latin.woff2) format("woff2");font-weight:700}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
.t{position:relative;width:1200px;height:630px;background:#1A1A1D;font-family:P,sans-serif}
.t:after{content:"";position:absolute;inset:0;background:radial-gradient(75%% 85%% at 50%% 50%%,rgba(26,26,29,0) 60%%,rgba(10,10,12,.28))}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2}
.c svg{width:640px;height:auto;display:block}
.tg{margin-top:42px;color:#F3F4EE;font-weight:500;font-size:27px;letter-spacing:.26em}.tg b{font-weight:700;color:#fff}
</style></head><body><div class="t"><div class="c">%(LOCK)s<div class="tg">KNOW BEFORE YOU <b>JUMP.</b></div></div></div></body></html>'''

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

def write_dark_lockups():
    """Dark-theme lockups only: lavender rings, white wordmark.
    Does not touch B-Light / light-email / jump-trade-light assets."""
    dark = lockup(RING_TILE, '#FFFFFF')
    save('v2/img/jump-lockup.svg', dark)
    save('v2/img/jumptrade-logo.svg', dark)
    em = png(dark, 726)
    save('v2/img/email-logo-rings1118l.png', em)
    save('v2/img/email-logo-rings1120l.png', em)
    save('v2/img/email-logo.png', png(dark, 325))
    save('img/jump-trade.png', fit(png(lockup(RING_TILE, '#FFFFFF'), 1400), (1455, 493)))
    og()

def write_tile_assets():
    """Rebuild the L1 app tile, favicons, jump-icon.svg, dark lockups and the og share tile.
    Does not rewrite light-theme lockups or sign-in marks."""
    save('v2/img/jump-icon.svg', tile_svg(rounded=True))
    write_app_icons()
    write_dark_lockups()

if __name__ == '__main__':
    if '--trade' in sys.argv: TRADE = sys.argv[sys.argv.index('--trade') + 1]
    assert TRADE in ('bold', 'light', 'light45'), TRADE
    if '--icons' in sys.argv:
        write_tile_assets()
    else:
        main()
