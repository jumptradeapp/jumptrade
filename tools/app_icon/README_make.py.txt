App tile sources and rasters are produced by tools/brand_rings/make.py
(Maze rings on the L1 slate tile, Nov 20 2026).

  python3 tools/brand_rings/make.py --icons

Writes tools/app_icon/icon-512.svg, icon-192.svg, apple-touch-icon-v6.svg
(and v3/v4/v5, kept in sync), icon-maskable-512.svg, plus the web/ PNGs
(icon-512/192, apple-touch-icon-v6.png and older aliases, icon-maskable-512.png),
favicon.png / favicon.svg / favicon.ico, jump-icon.svg, and the og share tile.

Maskable uses the same L1 tile with the Maze rings scaled so the painted outer
matches the previous V5/tile-D maskable safe zone (315.36 of 1024).

--icons also rebuilds dark lockups (lavender rings, white wordmark),
jump-trade.png, email-logo-rings1120l.png, and the og share tile.
It does not rewrite light-theme lockups or sign-in marks.
