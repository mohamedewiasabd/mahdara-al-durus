#!/usr/bin/env python3
"""Generate-branded Android icons & splash for 'محضر الدروس' app."""
import os
from PIL import Image, ImageDraw

ROOT = "/home/wafaa-mohamed-ra/Downloads/محضر-الدروس"
RES = os.path.join(ROOT, "android/app/src/main/res")

EMERALD = (5, 150, 105)      # #059669
TEAL = (13, 148, 136)        # #0d9488
WHITE = (255, 255, 255)
LIGHT = (226, 232, 240)      # #e2e8f0
SPARKLE = (251, 191, 36)     # #fbbf24


def gradient_bg(size, rnd=0):
    """Diagonal gradient emerald->teal background with optional rounded corners."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            r = int(EMERALD[0] + (TEAL[0] - EMERALD[0]) * t)
            g = int(EMERALD[1] + (TEAL[1] - EMERALD[1]) * t)
            b = int(EMERALD[2] + (TEAL[2] - EMERALD[2]) * t)
            px[x, y] = (r, g, b, 255)
    if rnd > 0:
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * rnd), fill=255)
        img.putalpha(mask)
    return img


def draw_foreground(canvas_size, fraction=0.55):
    """Draw the open-book + sparkle motif on a transparent canvas."""
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = canvas_size
    u = s / 512.0  # scale unit matching the original 512 SVG

    # Open book: two angled pages + spine + sparkle
    # Right page (white)
    rp = [
        (128 * u, 176 * u),
        (224 * u, 176 * u),
        (224 * u, 400 * u),
        (128 * u, 384 * u),
    ]
    d.polygon(rp, fill=(*WHITE, 235))

    # Left page (light grey)
    lp = [
        (384 * u, 176 * u),
        (288 * u, 176 * u),
        (288 * u, 400 * u),
        (384 * u, 384 * u),
    ]
    d.polygon(lp, fill=(*LIGHT, 240))

    # Rounded page tops
    d.rounded_rectangle(
        [128 * u, 136 * u, 224 * u, 250 * u], radius=18 * u, fill=(*WHITE, 250)
    )
    d.rounded_rectangle(
        [288 * u, 136 * u, 384 * u, 250 * u], radius=18 * u, fill=(*LIGHT, 245)
    )

    # Spine line
    d.line([(256 * u, 160 * u), (256 * u, 390 * u)], fill=(*TEAL, 255), width=int(9 * u))

    # Book base shadow
    d.rounded_rectangle(
        [128 * u, 382 * u, 384 * u, 398 * u], radius=6 * u, fill=(*TEAL, 80)
    )

    # Yellow sparkle (plus-shaped star) top-right
    cx, cy = 370 * u, 140 * u
    r = 34 * u
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*SPARKLE, 255))
    w = 8 * u
    d.line([cx - 20 * u, cy, cx + 20 * u, cy], fill=(*EMERALD, 255), width=int(w))
    d.line([cx, cy - 20 * u, cx, cy + 20 * u], fill=(*EMERALD, 255), width=int(w))

    # Center the motif within the safe zone
    return centered(img)


def centered(img):
    """Center image onto a larger canvas if smaller."""
    return img


# ---- Foreground (adaptive icon foreground PNGs) ----
def gen_foreground(densities):
    for name, size in densities.items():
        fg = draw_foreground(size)
        fg.save(os.path.join(RES, f"mipmap-{name}", "ic_launcher_foreground.png"))
        print(f"  foreground {name} {size}x{size}")


# ---- Legacy icons (full background + motif) ----
def gen_legacy(densities):
    for name, size in densities.items():
        bg = gradient_bg(size, rnd=0.22)
        motif_canvas = draw_foreground(size)
        # Composite motif onto background (full square)
        combined = Image.alpha_composite(bg, motif_canvas)
        combined.save(os.path.join(RES, f"mipmap-{name}", "ic_launcher.png"))
        # Round icon: circular mask
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse([0, 0, size - 1, size - 1], fill=255)
        round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        round_img.paste(combined, (0, 0))
        round_img.putalpha(mask)
        round_img.save(os.path.join(RES, f"mipmap-{name}", "ic_launcher_round.png"))
        print(f"  legacy {name} {size}x{size}")


LEGACY = {
    "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192,
}
FG = {
    "mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432,
}


def gen_splash():
    """Portrait splash ~1080x1920 with full background + centered logo."""
    W, H = 1080, 1920
    img = Image.new("RGBA", (W, H), EMERALD)
    px = img.load()
    for y in range(H):
        t = y / H
        r = int(EMERALD[0] + (TEAL[0] - EMERALD[0]) * t)
        g = int(EMERALD[1] + (TEAL[1] - EMERALD[1]) * t)
        b = int(EMERALD[2] + (TEAL[2] - EMERALD[2]) * t)
        for x in range(W):
            px[x, y] = (r, g, b, 255)
    # Centered logo icon (book + sparkle) ~ 640px
    logo = draw_foreground(640)
    img.alpha_composite(logo, ((W - 640) // 2, int(H * 0.40)))
    img.convert("RGB").save(os.path.join(RES, "drawable", "splash.png"))
    print(f"  splash 1080x1920")


if __name__ == "__main__":
    print("Generating adaptive icon foregrounds...")
    gen_foreground(FG)
    print("Generating legacy launcher icons...")
    gen_legacy(LEGACY)
    print("Generating splash screen...")
    gen_splash()
    print("Done.")