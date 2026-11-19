App tile sources and rasters are produced by tools/brand_rings/make.py
(Maze rings on the V5 Deep swoop tile, Nov 19 2026).

  python3 tools/brand_rings/make.py

Writes tools/app_icon/icon-512.svg, icon-192.svg, apple-touch-icon-v5.svg
(and v3/v4, kept in sync), icon-maskable-512.svg, plus the web/ PNGs
(icon-512/192, apple-touch-icon-v5.png and older aliases, icon-maskable-512.png),
favicon.png / favicon.svg / favicon.ico, lockups, email logo, and the og share tile.

Maskable uses the same V5 tile with the Maze rings scaled so the painted outer
matches the previous V5/tile-D maskable safe zone (315.36 of 1024).
