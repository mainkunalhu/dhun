#!/usr/bin/env python3
"""Derive the platform icon set from the master artwork.

    uv run --with pillow python scripts/build-icons.py

Reads assets/brand/logo.png (1024x1024) and writes, next to it:

    icon.png       1024, full bleed     Linux / generic window icon
    icon-512.png    512, full bleed     deb and rpm packages
    icon.ico      16–256                Windows
    icon.icns     16–1024               macOS

Windows and Linux keep the square, full-bleed artwork. macOS gets the platform
treatment: an 824px rounded square inset by 100px on a transparent canvas,
with a soft shadow, so it sits correctly in the Dock.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "assets" / "brand"
SOURCE = BRAND / "logo.png"

CANVAS = 1024
INSET = 100
SQUIRCLE = CANVAS - INSET * 2  # 824
RADIUS = 185

ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
RESAMPLE = Image.Resampling.LANCZOS


def macos_master(art: Image.Image) -> Image.Image:
    """Rounded-square artwork on a transparent canvas, with a soft shadow."""
    body = art.resize((SQUIRCLE, SQUIRCLE), RESAMPLE)

    mask = Image.new("L", (SQUIRCLE, SQUIRCLE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, SQUIRCLE - 1, SQUIRCLE - 1), radius=RADIUS, fill=255
    )
    body.putalpha(mask)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))

    shadow_mask = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(shadow_mask).rounded_rectangle(
        (INSET, INSET + 10, INSET + SQUIRCLE - 1, INSET + SQUIRCLE + 9),
        radius=RADIUS,
        fill=90,
    )
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(18))
    shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 255))
    shadow.putalpha(shadow_mask)
    canvas.alpha_composite(shadow)

    canvas.alpha_composite(body, (INSET, INSET))
    return canvas


def main() -> None:
    if not SOURCE.exists():
        sys.exit(f"missing source artwork: {SOURCE}")

    art = Image.open(SOURCE).convert("RGBA")
    if art.size != (CANVAS, CANVAS):
        art = art.resize((CANVAS, CANVAS), RESAMPLE)

    art.save(BRAND / "icon.png")
    art.resize((512, 512), RESAMPLE).save(BRAND / "icon-512.png")
    art.save(
        BRAND / "icon.ico",
        format="ICO",
        sizes=[(size, size) for size in ICO_SIZES],
    )

    mac = macos_master(art)
    # Display version for the splash and other in-app surfaces.
    mac.resize((512, 512), RESAMPLE).save(BRAND / "icon-rounded.png")

    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "Dhun.iconset"
        iconset.mkdir()

        def emit(pixels: int, name: str) -> None:
            mac.resize((pixels, pixels), RESAMPLE).save(iconset / name)

        emit(16, "icon_16x16.png")
        emit(32, "icon_16x16@2x.png")
        emit(32, "icon_32x32.png")
        emit(64, "icon_32x32@2x.png")
        emit(128, "icon_128x128.png")
        emit(256, "icon_128x128@2x.png")
        emit(256, "icon_256x256.png")
        emit(512, "icon_256x256@2x.png")
        emit(512, "icon_512x512.png")
        emit(1024, "icon_512x512@2x.png")

        subprocess.run(
            [
                "iconutil",
                "-c",
                "icns",
                str(iconset),
                "-o",
                str(BRAND / "icon.icns"),
            ],
            check=True,
        )

    for name in (
        "icon.png",
        "icon-512.png",
        "icon-rounded.png",
        "icon.ico",
        "icon.icns",
    ):
        path = BRAND / name
        print(f"  {path.relative_to(ROOT)}  {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
