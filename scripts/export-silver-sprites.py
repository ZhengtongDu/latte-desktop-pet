#!/usr/bin/env python3
"""
Re-export all colored-pencil Latte sprites from art/latte-pencil/*.png into
src/assets/latte/pencil/*.webp with pure Silver Classic Tabby (纯正银虎斑)
color grading (eliminating yellow/cream cast while preserving pink inner ears,
olive-hazel open eyes, nose leather, and pink tongue blep).
"""
from PIL import Image
import json
import numpy as np
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "art", "latte-pencil")
OUT_DIR = os.path.join(ROOT, "src", "assets", "latte", "pencil")
os.makedirs(OUT_DIR, exist_ok=True)


def grade_silver_tabby(im: Image.Image, is_body: bool, has_open_eyes: bool) -> Image.Image:
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    h, w = r.shape

    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    t = np.clip(lum / 255.0, 0.0, 1.0)

    lifted = np.where(
        t < 0.28,
        t * 0.90,
        0.252 + (1.0 - 0.252) * np.power(np.clip((t - 0.28) / 0.72, 0.0, 1.0), 0.60),
    )
    lifted = np.clip(lifted, 0.0, 0.992) * 255.0

    sr = np.clip(lifted * 0.997, 0, 255)
    sg = np.clip(lifted * 1.000, 0, 255)
    sb = np.clip(lifted * 1.010, 0, 255)

    keep = np.zeros((h, w), dtype=np.float32)

    if is_body:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

        def soft_ellipse(cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
            d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
            return np.clip(1.0 - np.clip((d - 0.55) / 0.45, 0.0, 1.0), 0.0, 1.0)

        ear_roi = np.maximum(
            soft_ellipse(362, 212, 54, 68),
            soft_ellipse(638, 202, 54, 68),
        )
        ear_pink = np.clip(((r - g) - 19.0) / 15.0, 0.0, 1.0)
        keep = np.maximum(keep, ear_roi * ear_pink)

        if has_open_eyes:
            eye_roi = np.maximum(
                soft_ellipse(447, 329, 26, 21),
                soft_ellipse(566, 325, 26, 21),
            )
            iris_gate = np.clip((172.0 - lum) / 34.0, 0.0, 1.0)
            keep = np.maximum(keep, eye_roi * iris_gate)

        nose_roi = soft_ellipse(506, 369, 18, 11)
        nose_gate = np.clip((162.0 - lum) / 32.0, 0.0, 1.0)
        keep = np.maximum(keep, nose_roi * nose_gate)

        mouth_roi = soft_ellipse(507, 397, 24, 15)
        tongue_pink = np.clip(((r - g) - 19.0) / 14.0, 0.0, 1.0)
        keep = np.maximum(keep, mouth_roi * tongue_pink)

    pad_pink = np.clip(((r - g) - 27.0) / 14.0, 0.0, 1.0)
    keep = np.maximum(keep, pad_pink * 0.85)

    out = arr.copy()
    out[..., 0] = r * keep + sr * (1.0 - keep)
    out[..., 1] = g * keep + sg * (1.0 - keep)
    out[..., 2] = b * keep + sb * (1.0 - keep)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def main() -> None:
    crop_std = (240, 100, 240 + 688, 100 + 800)
    out_std = (516, 600)
    open_eye_bodies = {"body_idle", "body_typing", "body_angry"}

    for name in ["body_idle", "body_blink", "body_typing", "body_happy", "body_angry", "body_sleep"]:
        im = Image.open(os.path.join(SRC_DIR, f"{name}.png")).convert("RGBA")
        gim = grade_silver_tabby(im, is_body=True, has_open_eyes=(name in open_eye_bodies))
        gim.crop(crop_std).resize(out_std, Image.LANCZOS).save(
            os.path.join(OUT_DIR, f"{name}.webp"), "WEBP", quality=90, method=6
        )

    for name in ["tail_0", "tail_1", "tail_2", "paw_left_down", "paw_left_up", "paw_right_down", "paw_right_up"]:
        im = Image.open(os.path.join(SRC_DIR, f"{name}.png")).convert("RGBA")
        gim = grade_silver_tabby(im, is_body=False, has_open_eyes=False)
        gim.crop(crop_std).resize(out_std, Image.LANCZOS).save(
            os.path.join(OUT_DIR, f"{name}.webp"), "WEBP", quality=90, method=6
        )

    for name in ["acc_donut", "acc_bell_collar", "acc_harness"]:
        im = Image.open(os.path.join(SRC_DIR, f"{name}.png")).convert("RGBA")
        im.crop(crop_std).resize(out_std, Image.LANCZOS).save(
            os.path.join(OUT_DIR, f"{name}.webp"), "WEBP", quality=90, method=6
        )

    with open(os.path.join(SRC_DIR, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)

    for name in manifest["pawVariants"]:
        im = Image.open(os.path.join(SRC_DIR, f"{name}.png")).convert("RGBA")
        gim = grade_silver_tabby(im, is_body=False, has_open_eyes=False)
        x0, y0, x1, y1 = gim.getbbox()
        x0, y0, x1, y1 = max(0, x0 - 8), max(0, y0 - 8), min(1024, x1 + 8), min(1024, y1 + 8)
        ow, oh = max(1, round((x1 - x0) * 0.75)), max(1, round((y1 - y0) * 0.75))
        gim.crop((x0, y0, x1, y1)).resize((ow, oh), Image.LANCZOS).save(
            os.path.join(OUT_DIR, f"{name}.webp"), "WEBP", quality=90, method=6
        )

    print("Exported all 22 silver-tabby sprites to", OUT_DIR)


if __name__ == "__main__":
    main()
