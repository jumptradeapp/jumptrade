App tile sources and rasters are produced by tools/brand_rings/make.py (V5 Deep swoop, Nov 19 2026).

  python3 tools/brand_rings/make.py

Writes tools/app_icon/icon-512.svg, icon-192.svg, apple-touch-icon-v4.svg (and v3, kept in sync),
icon-maskable-512.svg, plus the web/ PNGs (icon-512/192, apple-touch-icon-v4.png and older
aliases, icon-maskable-512.png), favicon.png / favicon.svg / favicon.ico, lockups, email logo,
and the og share tile.

Maskable uses the same V5 tile with the rings scaled by 0.72/0.84 so they sit in the same
safe zone as the previous tile-D maskable icon.
