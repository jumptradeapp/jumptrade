#!/usr/bin/env python3
"""Render a 2x-retina Market pulse sector bar chart for jumptrade emails.

Thin vertical bars (~10px) with a rounded tip only, split by direction:
gainers on top (rising from one continuous dotted baseline that ends in a
small ink dot), decliners below (hanging). Bright swoop blue / coral at the
tip, fading to transparent toward the baseline. No glow. Labels (%, then
name) sit under the bars at 13px. One shared scale: the day's biggest
|move| is 70px, with a 10px minimum. Rows are ~110px including labels.
Names wrap only at spaces, never mid-word. The CSS size is 390px wide so
13px type stays 13px at the phone email width.
Usage:
  python3 tools/email_sector_chart.py --theme light --out chart.png \\
      --bars 'XLK:Tech:1.24|XLF:Financials:-0.40|...'
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

THEMES = {
    "light": dict(bg="#FFFFFF", ink="#12141A", muted="#5A616C", hair="#E2E4E8",
                  up_tx="#187A44", dn_tx="#C8463D"),
    "dark": dict(bg="#1C1C20", ink="#F2F2F0", muted="#C5D0DC", hair="#3A3A40",
                 up_tx="#A8DDB5", dn_tx="#EB8C86"),
    "p72": dict(bg="#252428", ink="#F2EFE6", muted="#C4C1B6", hair="#4A494C",
                up_tx="#A8DDB5", dn_tx="#EB8C86"),
}
BAR_UP = (0x5C, 0xB0, 0xFF)
BAR_DN = (0xEB, 0x8C, 0x86)

# Keep in sync with worker/sectorChart.js
CSS_W = 390
PAD_Y_CSS = 4
ROW_GUTTER_CSS = 6
CAP_CSS = 70
MIN_BAR_CSS = 14
PCT_H_CSS = 16
NAME_H_CSS = 16
NAME_H2_CSS = 32
BAR_W_CSS = 10
BAR_R_CSS = 5
DOT_R_CSS = 2
SCALE = 2
W = CSS_W * SCALE

FONT = "/usr/share/fonts/truetype/sand-box/google/Inter Tight/InterTight-VariableFont_wght.ttf"
FONT_FB = "/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf"


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def load_font(size, weight=500):
    for path in (FONT, FONT_FB):
        try:
            font = ImageFont.truetype(path, size=size)
            try:
                font.set_variation_by_axes(
                    [weight] if "Inter Tight" in path else [min(32, max(14, size / SCALE)), weight]
                )
            except Exception:
                try:
                    font.set_variation_by_axes([weight])
                except Exception:
                    pass
            return font
        except OSError:
            continue
    return ImageFont.load_default()


def parse_bars(s):
    rows = []
    for part in (s or "").split("|"):
        if not part.strip():
            continue
        etf, name, pct = part.split(":", 2)
        rows.append({"etf": etf, "name": name, "pct": float(pct)})
    rows.sort(key=lambda b: (-b["pct"], b["name"]))
    return rows


def split_max6(arr):
    if not arr:
        return []
    if len(arr) <= 6:
        return [arr]
    n = len(arr)
    rows = math.ceil(n / 6)
    size = math.ceil(n / rows)
    return [arr[i : i + size] for i in range(0, n, size)]


def layout_rows(bars):
    bars = sorted(bars, key=lambda b: (-b["pct"], b["name"]))
    up = [b for b in bars if b["pct"] >= 0]
    dn = [b for b in bars if b["pct"] < 0]
    return [("up", r) for r in split_max6(up)] + [("down", r) for r in split_max6(dn)]


def name_needs_wrap(secs):
    n = max(1, len(secs or []))
    col = (CSS_W - 8) / n
    return any((" " in (b.get("name") or "") and (n >= 6 or len(b.get("name") or "") * 6.2 > col)) for b in (secs or []))


def name_h_css(secs):
    return NAME_H2_CSS if name_needs_wrap(secs) else NAME_H_CSS


def row_h_css(secs):
    # pad 2 + cap 70 + base 2 + gap 2 + pct 16 + names + pad 2
    return 2 + CAP_CSS + 2 + 2 + PCT_H_CSS + name_h_css(secs) + 2


def text_size(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0], b[3] - b[1], b[1]


def name_lines(name):
    return [p for p in str(name or "").split() if p] or [""]


def fade_bar(width, height, rgb, tip="up"):
    """Thin bar, rounded at the tip only, bright at the tip, transparent at the base."""
    w, h = max(1, int(width)), max(1, int(height))
    grad = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = grad.load()
    last = max(1, h - 1)
    for y in range(h):
        t = (1.0 - y / last) if tip == "up" else (y / last)
        t = t ** 0.65  # keep the tip strong, fade toward the baseline
        a = int(round(255 * t))
        c = (rgb[0], rgb[1], rgb[2], a)
        for x in range(w):
            px[x, y] = c
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    # Rounded tip only — cap at 5px, but don't let short bars become circles.
    r = max(2 * SCALE // 1, min(w // 2, max(2, h // 3), int(round(BAR_R_CSS * SCALE))))
    if tip == "up":
        if r < h:
            d.rectangle((0, r, w - 1, h - 1), fill=255)
        d.ellipse((0, 0, w - 1, 2 * r - 1), fill=255)
    else:
        if h - r > 0:
            d.rectangle((0, 0, w - 1, h - r), fill=255)
        d.ellipse((0, h - 2 * r, w - 1, h - 1), fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(grad, (0, 0))
    out.putalpha(ImageChops.multiply(out.split()[3], mask))
    return out


def render(bars, theme_id, out_path):
    T = THEMES[theme_id]
    bars = list(bars)
    bars.sort(key=lambda b: (-b["pct"], b["name"]))
    layout = layout_rows(bars)
    h_css = PAD_Y_CSS * 2 + sum(row_h_css(r) for _, r in layout) + max(0, len(layout) - 1) * ROW_GUTTER_CSS
    H = h_css * SCALE
    bg = hex_rgb(T["bg"]) + (255,)
    img = Image.new("RGBA", (W, H), bg)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    if not bars:
        img.save(out_path)
        return out_path

    pad_x = 4 * SCALE
    pad_y = PAD_Y_CSS * SCALE
    cap = CAP_CSS * SCALE
    min_bar = MIN_BAR_CSS * SCALE
    bar_w = BAR_W_CSS * SCALE
    pct_h = PCT_H_CSS * SCALE
    base_h = 2 * SCALE
    gutter = ROW_GUTTER_CSS * SCALE
    max_abs = max(0.5, max(abs(b["pct"]) for b in bars))

    def bar_len(pct):
        if pct == 0:
            return 0
        raw = cap * (abs(pct) / max_abs) ** 0.5
        return max(min_bar, int(round(raw)))

    origins = []
    y = pad_y
    for dir_, row in layout:
        origins.append(y)
        y += row_h_css(row) * SCALE + gutter

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    row_geom = []
    for (dir_, row), y0 in zip(layout, origins):
        name_band = name_h_css(row) * SCALE
        pad = 2 * SCALE
        # Up: pad, cap, baseline, gap, pct, names, pad
        # Down: pad, baseline, cap, gap, pct, names, pad
        if dir_ == "up":
            baseline = y0 + pad + cap
            label_top = baseline + base_h + 2 * SCALE
        else:
            baseline = y0 + pad
            label_top = baseline + base_h + cap + 2 * SCALE
        n = len(row)
        col_w = (W - 2 * pad_x) / n
        row_geom.append((dir_, row, y0, baseline, label_top, name_band, col_w))
        for i, b in enumerate(row):
            cx = pad_x + col_w * (i + 0.5)
            x0 = int(round(cx - bar_w / 2))
            h = bar_len(b["pct"])
            if h <= 0:
                continue
            color = BAR_UP if dir_ == "up" else BAR_DN
            if dir_ == "up":
                yb = baseline - h
                tip = "up"
            else:
                yb = baseline + base_h
                tip = "down"
            layer.alpha_composite(fade_bar(bar_w, h, color, tip), (x0, int(yb)))

    img = Image.alpha_composite(img, layer)
    draw = ImageDraw.Draw(img)

    ink = hex_rgb(T["ink"]) + (255,)
    font_pct = load_font(13 * SCALE, 700)
    font_name = load_font(13 * SCALE, 600)
    dash, gap = 2 * SCALE, 4 * SCALE
    line_h = 1  # 1 device pixel hairline at 2x
    dot_r = DOT_R_CSS * SCALE

    for dir_, row, y0, baseline, label_top, name_band, col_w in row_geom:
        # One continuous thin dotted rule across the full width, ending in a solid ink dot.
        dot_cx = W - 6 * SCALE - dot_r
        line_end = int(dot_cx - dot_r - 2 * SCALE)
        x = 0
        while x < line_end:
            x2 = min(x + dash, line_end)
            draw.rectangle((x, baseline, x2, baseline + line_h), fill=ink)
            x = x2 + gap
        draw.ellipse(
            (dot_cx - dot_r, baseline + line_h / 2 - dot_r, dot_cx + dot_r, baseline + line_h / 2 + dot_r),
            fill=ink,
        )

        for i, b in enumerate(row):
            cx = pad_x + col_w * (i + 0.5)
            sign = "+" if b["pct"] >= 0 else "−"
            d = 1 if abs(b["pct"]) >= 10 else 2
            label = f"{sign}{abs(b['pct']):.{d}f}%"
            tx = hex_rgb(T["up_tx"] if dir_ == "up" else T["dn_tx"]) + (255,)
            tw, th, t0 = text_size(draw, label, font_pct)
            draw.text((cx - tw / 2, label_top - t0), label, font=font_pct, fill=tx)

            # Always 13px — never shrink. Names are short enough for 6-or-fewer columns.
            wrap = name_needs_wrap(row)
            lines = name_lines(b["name"]) if wrap else [b["name"]]
            line = 16 * SCALE
            name_top = label_top + pct_h
            for j, part in enumerate(lines):
                nw, nh, n0 = text_size(draw, part, font_name)
                draw.text((cx - nw / 2, name_top + j * line - n0), part, font=font_name, fill=ink)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return str(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", default="light", choices=list(THEMES))
    ap.add_argument("--bars", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    render(parse_bars(args.bars), args.theme, args.out)
    print(args.out)


if __name__ == "__main__":
    main()
