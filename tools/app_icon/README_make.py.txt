import sys, io; sys.path.insert(0, '/workspace/jumptrade_tile_1118/variants/build')
import gen, resvg_py
from PIL import Image
OUT = '/workspace/jumptrade_tile_1118/shipD/'
def render(scale, size, name):
    s = gen.svg(gen.BG_SWOOP, gen.current_mark(), scale)
    open(OUT + name.replace('.png', '.svg'), 'w').write(s)
    png = bytes(resvg_py.svg_to_bytes(svg_string=s, width=size, height=size))
    Image.open(io.BytesIO(png)).convert('RGB').save(OUT + name, optimize=True)  # opaque, like the old icons
render(0.84, 512, 'icon-512.png'); render(0.84, 192, 'icon-192.png'); render(0.84, 180, 'apple-touch-icon-v3.png')
render(0.72, 512, 'icon-maskable-512.png')
