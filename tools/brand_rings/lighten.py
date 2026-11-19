"""Thinner 'trade.' for the 'jumptrade.' wordmark: same letter shapes, rounded ends, height and baseline, lighter stroke.

Each letter of 'trade.' is drawn big, eroded with a round brush (so rounded ends stay round), scaled back to its own original
box (same height, baseline and width, so spacing doesn't change) and traced back to an outline.
python3 tools/brand_rings/lighten.py 0.60  -> writes tools/brand_rings/trade_light60.d   (needs numpy, opencv, potracer, resvg_py)
"""
import os, re, sys, io
import resvg_py  # numpy, opencv and potracer are only needed to make a new weight (thin/trace/raster)
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
SW = 11.2          # stroke width of the traced wordmark (measured on u, m, t, j stems)
S = 24             # pixels per unit while working
X0, Y0, X1, Y1 = 410, 6, 690, 100

def split():
    word = open(os.path.join(HERE, 'wordmark.d')).read().strip()
    subs = re.findall(r'M[^M]+', word)
    mx = lambda sp: min(map(float, re.findall(r'-?\d+\.?\d*', sp)[0::2]))
    return ''.join(s for s in subs if mx(s) < 418), ''.join(s for s in subs if mx(s) >= 418)

def raster(d):
    import numpy as np
    w, h = (X1 - X0) * S, (Y1 - Y0) * S
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%d %d %d %d"><path fill="#000" fill-rule="evenodd" d="%s"/></svg>' % (w, h, X0, Y0, X1 - X0, Y1 - Y0, d)
    a = np.array(Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=svg)))).convert('RGBA'))[:, :, 3]
    return (a > 127).astype(np.uint8)

def thin(ratio):
    import numpy as np, cv2
    jump, trade = split(); m = raster(trade); out = np.zeros_like(m)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        g = (lab[y:y + h, x:x + w] == i).astype(np.uint8)
        if w < SW * S * 2.2 and h < SW * S * 2.2: out[y:y + h, x:x + w] |= g; continue   # the period: keep as is
        # erosion e (units) so that after scaling back to the box the stroke is ratio*SW
        k = (h / S); e = SW * (1 - ratio) / 2
        for _ in range(20): e = (SW - ratio * SW * (k - 2 * e) / k) / 2
        r = max(1, int(round(e * S))); ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
        er = cv2.erode(np.pad(g, r), ker)[r:-r, r:-r]
        ys, xs = np.nonzero(er); er = er[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        big = cv2.resize(er.astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC) > 0.5
        out[y:y + h, x:x + w] |= big.astype(np.uint8)
    return jump, trace(out)

def trace(mask):
    import potrace
    bm = potrace.Bitmap(~mask.astype(bool)); path = bm.trace(turdsize=20, alphamax=1.0, opticurve=True, opttolerance=0.2)
    P = lambda p: '%.2f %.2f' % (X0 + p.x / S, Y0 + p.y / S)
    d = []
    for c in path:
        d.append('M' + P(c.start_point))
        for s in c.segments:
            d.append(('L%s L%s' % (P(s.c), P(s.end_point))) if s.is_corner else ('C%s %s %s' % (P(s.c1), P(s.c2), P(s.end_point))))
        d.append('Z')
    return ''.join(d)

def measure(d):  # stem width of 'r' (vertical stem) and 't' stem, in units
    m = raster(d); row = m[int((60 - Y0) * S)]; runs = []; cur = None
    for x, v in enumerate(row):
        if v and cur is None: cur = x
        if not v and cur is not None: runs.append((X0 + cur / S, (x - cur) / S)); cur = None
    return [(round(a, 1), round(b, 2)) for a, b in runs]

def light(ratio):
    f = os.path.join(HERE, 'trade_light%d.d' % round(ratio * 100))
    if not os.path.exists(f):
        jump, t = thin(ratio); open(f, 'w').write(t + '\n')
    return open(f).read().strip()

if __name__ == '__main__':
    r = float(sys.argv[1]) if len(sys.argv) > 1 else 0.60
    t = light(r); print('trade. stems at y=60 (x, width):', measure(t), ' original:', measure(split()[1]))
