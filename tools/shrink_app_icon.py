# Historical (Nov 18 shrink of tile D). Current tiles come from tools/brand_rings/make.py (V5).
# Shrink the white rings mark inside the jumptrade app tiles, keeping the exact background gradient.
# The background is a pure vertical gradient (every row is one colour), so per row: bg = column 0.
# Mark alpha is unmixed against white, scaled about the tile centre, and composited back.
import numpy as np, sys
from PIL import Image
SCALE = float(sys.argv[1]) if len(sys.argv) > 1 else 0.84
SRC = '/workspace/jumptrade_tile_1118/before/'
OUT = '/workspace/jumptrade_tile_1118/after/'
import os; os.makedirs(OUT, exist_ok=True)

def unmix(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    bg = np.repeat(a[:, :1, :], a.shape[1], axis=1)
    den = 255.0 - bg
    al = np.clip(((a - bg) / np.maximum(den, 1)).mean(2), 0, 1)
    # residual check: reconstruct with white
    rec = bg * (1 - al[..., None]) + 255 * al[..., None]
    return a, bg, al, np.abs(rec - a).max()

def build(src_mark, size_out, bg_path, out_name):
    a, bg, _, _ = unmix(bg_path)        # this size's own exact background
    _, _, al512, _ = unmix(src_mark)     # highest-res mark of the same art
    S = a.shape[0]
    m = Image.fromarray((al512 * 255).round().astype(np.uint8), 'L')
    n = round(512 * SCALE * S / 512)
    if (S - n) % 2: n += 1  # same parity as the tile, so the mark sits exactly centred
    m = m.resize((n, n), Image.LANCZOS)
    layer = Image.new('L', (S, S), 0)
    off = (S - n) / 2.0
    layer.paste(m, (int(round(off)), int(round(off))))
    al = np.asarray(layer).astype(np.float64) / 255.0
    out = bg * (1 - al[..., None]) + 255 * al[..., None]
    Image.fromarray(out.round().clip(0, 255).astype(np.uint8), 'RGB').save(OUT + out_name, optimize=True)

for f in ['icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon-v2.png']:
    print(f, 'unmix residual', round(unmix(SRC + f)[3], 2))
build(SRC + 'icon-512.png', 512, SRC + 'icon-512.png', 'icon-512.png')
build(SRC + 'icon-512.png', 192, SRC + 'icon-192.png', 'icon-192.png')
build(SRC + 'icon-512.png', 180, SRC + 'apple-touch-icon-v2.png', 'apple-touch-icon-v2.png')
build(SRC + 'icon-maskable-512.png', 512, SRC + 'icon-maskable-512.png', 'icon-maskable-512.png')
