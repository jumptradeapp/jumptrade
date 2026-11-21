#!/usr/bin/env python3
"""Email-safe company logos (Jason, Nov 21 2026: logos next to every company name in every email).
The app's logo set (web/lg/SYM.webp, 48px) is WebP, which Outlook and some Gmail clients don't show. This writes the same
logos as PNG to web/lgp/SYM.png. Logos drawn for a dark background (index.json value 1, white marks) are put on the app's
dark rounded square so they stay visible on the white email; the rest keep their transparent background, as in the app."""
import json, os, sys
from PIL import Image, ImageDraw
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'web')
src, out = os.path.join(root, 'lg'), os.path.join(root, 'lgp')
os.makedirs(out, exist_ok=True)
idx = json.load(open(os.path.join(src, 'index.json')))
n = 0
for sym, kind in idx.items():
    f = os.path.join(src, sym + '.webp')
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGBA')
    if kind == 1:
        bg = Image.new('RGBA', im.size, (0, 0, 0, 0)); m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], radius=10, fill=255)
        bg.paste(Image.new('RGBA', im.size, (26, 26, 29, 255)), (0, 0), m); bg.alpha_composite(im); im = bg
    im.save(os.path.join(out, sym + '.png'), optimize=True); n += 1
json.dump(sorted(idx.keys()), open(os.path.join(out, 'index.json'), 'w'), separators=(',', ':'))
print('wrote', n, 'png logos to', out)
