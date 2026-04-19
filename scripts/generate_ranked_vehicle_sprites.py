import asyncio
import io
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


def _bbox_from_alpha(img: Image.Image):
    alpha = img.getchannel("A")
    bbox = alpha.point(lambda a: 255 if a > 0 else 0).getbbox()
    return bbox or (0, 0, img.size[0], img.size[1])


def _overlay_brake_lights(img: Image.Image) -> Image.Image:
    img = img.copy().convert("RGBA")
    x0, y0, x1, y1 = _bbox_from_alpha(img)
    w = max(1, x1 - x0)
    h = max(1, y1 - y0)

    lx = x0 + int(w * 0.28)
    rx = x0 + int(w * 0.72)
    cy = y0 + int(h * 0.90)
    glow_r = max(6, int(w * 0.09))
    core_r = max(3, int(w * 0.035))

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    for cx in (lx, rx):
        d.ellipse(
            [cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r],
            fill=(255, 40, 0, 150),
        )
        d.ellipse(
            [cx - core_r, cy - core_r, cx + core_r, cy + core_r],
            fill=(255, 0, 0, 220),
        )

    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(2, glow_r // 2)))
    img = Image.alpha_composite(img, overlay)
    return img


def _overlay_specular_flicker(img: Image.Image) -> Image.Image:
    img = img.copy().convert("RGBA")
    x0, y0, x1, y1 = _bbox_from_alpha(img)
    w = max(1, x1 - x0)
    h = max(1, y1 - y0)

    cx = x0 + w // 2
    cy = y0 + int(h * 0.35)
    rx = max(10, int(w * 0.22))
    ry = max(12, int(h * 0.16))

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry],
        fill=(255, 255, 255, 70),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(2, min(rx, ry) // 6)))
    img = Image.alpha_composite(img, overlay)
    return img


@dataclass(frozen=True)
class CarSpec:
    rank: str
    slug: str
    name: str
    base: str
    tint: tuple[int, int, int]
    tint_strength: float
    scale_x: float
    scale_y: float
    deco: str


def _scale_within_alpha_bbox(img: Image.Image, scale_x: float, scale_y: float) -> Image.Image:
    if scale_x == 1.0 and scale_y == 1.0:
        return img
    img = img.convert("RGBA")
    x0, y0, x1, y1 = _bbox_from_alpha(img)
    crop = img.crop((x0, y0, x1, y1))
    w, h = crop.size
    nw, nh = max(1, int(w * scale_x)), max(1, int(h * scale_y))
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
    canvas.alpha_composite(crop, (x0 + (w - nw) // 2, y0 + (h - nh) // 2))
    return canvas


def _tint(img: Image.Image, rgb: tuple[int, int, int], strength: float) -> Image.Image:
    img = img.convert("RGBA")
    base_rgb = img.convert("RGB")
    tint_rgb = Image.new("RGB", img.size, rgb)
    blended = Image.blend(base_rgb, tint_rgb, max(0.0, min(1.0, strength)))
    out = Image.merge("RGBA", (*blended.split(), img.getchannel("A")))
    return out


def _decorate(img: Image.Image, deco: str) -> Image.Image:
    img = img.convert("RGBA")
    x0, y0, x1, y1 = _bbox_from_alpha(img)
    w = max(1, x1 - x0)
    h = max(1, y1 - y0)

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    if deco == "stripe_white":
        sw = max(2, int(w * 0.08))
        cx = x0 + w // 2
        d.rectangle([cx - sw // 2, y0 + int(h * 0.08), cx + sw // 2, y1 - int(h * 0.08)], fill=(245, 245, 245, 170))
    elif deco == "stripe_red":
        sw = max(2, int(w * 0.07))
        cx = x0 + w // 2
        d.rectangle([cx - sw // 2, y0 + int(h * 0.08), cx + sw // 2, y1 - int(h * 0.08)], fill=(210, 20, 20, 175))
    elif deco == "motorsport":
        sw = max(2, int(w * 0.05))
        cx = x0 + w // 2
        y_top = y0 + int(h * 0.12)
        y_bot = y1 - int(h * 0.12)
        d.rectangle([cx - sw * 2, y_top, cx - sw, y_bot], fill=(20, 70, 210, 165))
        d.rectangle([cx - sw, y_top, cx, y_bot], fill=(230, 230, 230, 150))
        d.rectangle([cx, y_top, cx + sw, y_bot], fill=(210, 20, 20, 165))
    elif deco == "roof_black":
        d.rectangle([x0 + int(w * 0.18), y0 + int(h * 0.24), x1 - int(w * 0.18), y0 + int(h * 0.42)], fill=(15, 15, 15, 120))
    elif deco == "hood_scoop":
        d.rounded_rectangle(
            [x0 + int(w * 0.38), y0 + int(h * 0.58), x0 + int(w * 0.62), y0 + int(h * 0.70)],
            radius=max(2, int(w * 0.04)),
            fill=(10, 10, 10, 120),
        )
    elif deco == "roof_rack":
        y_a = y0 + int(h * 0.28)
        y_b = y0 + int(h * 0.38)
        d.line([x0 + int(w * 0.22), y_a, x1 - int(w * 0.22), y_a], fill=(220, 220, 220, 170), width=max(1, int(w * 0.02)))
        d.line([x0 + int(w * 0.22), y_b, x1 - int(w * 0.22), y_b], fill=(220, 220, 220, 170), width=max(1, int(w * 0.02)))
    elif deco == "rear_wing":
        y = y1 - int(h * 0.03)
        d.rectangle([x0 + int(w * 0.30), y, x1 - int(w * 0.30), y + max(2, int(h * 0.03))], fill=(10, 10, 10, 160))

    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=0.6))
    return Image.alpha_composite(img, overlay)


def _build_variant(car: CarSpec) -> Image.Image:
    base_img = Image.open(car.base).convert("RGBA")
    base_img = _scale_within_alpha_bbox(base_img, car.scale_x, car.scale_y)
    base_img = _tint(base_img, car.tint, car.tint_strength)
    if car.deco:
        base_img = _decorate(base_img, car.deco)
    return base_img


async def _generate_base_images(cars: list[CarSpec]) -> dict[str, Image.Image]:
    out: dict[str, Image.Image] = {}
    for car in cars:
        out[car.slug] = _build_variant(car)
        await asyncio.sleep(0)
    return out


def _write_frames(base: Image.Image, folder: Path):
    folder.mkdir(parents=True, exist_ok=True)
    frame1 = base
    frame2 = _overlay_brake_lights(base)
    frame3 = _overlay_specular_flicker(base)
    frame1.save(folder / "1.png")
    frame2.save(folder / "2.png")
    frame3.save(folder / "3.png")


def _cars() -> list[CarSpec]:
    pack = "/workspace/public/assets/sprites/unluckystudio/Topdown_vehicle_sprites_pack"
    return [
        CarSpec("rank_d", "toyota_yaris", "Toyota Yaris", f"{pack}/Car.png", (220, 40, 30), 0.35, 1.0, 1.0, "roof_black"),
        CarSpec("rank_d", "hyundai_i10", "Hyundai i10", f"{pack}/Car.png", (60, 150, 220), 0.35, 0.98, 0.98, "stripe_white"),
        CarSpec("rank_d", "kia_rio", "Kia Rio", f"{pack}/Car.png", (235, 235, 235), 0.30, 1.02, 1.0, "hood_scoop"),
        CarSpec("rank_d", "chevrolet_spark", "Chevrolet Spark", f"{pack}/Car.png", (70, 190, 90), 0.35, 0.96, 1.0, "roof_rack"),
        CarSpec("rank_c", "volkswagen_golf", "Volkswagen Golf", f"{pack}/Audi.png", (70, 120, 220), 0.32, 0.98, 0.98, "stripe_white"),
        CarSpec("rank_c", "honda_civic", "Honda Civic", f"{pack}/Audi.png", (20, 20, 20), 0.35, 1.0, 1.0, "stripe_red"),
        CarSpec("rank_c", "mazda_3", "Mazda 3", f"{pack}/Audi.png", (210, 30, 30), 0.30, 0.99, 1.02, "hood_scoop"),
        CarSpec("rank_c", "ford_focus", "Ford Focus", f"{pack}/Audi.png", (210, 210, 210), 0.28, 1.03, 0.98, "stripe_white"),
        CarSpec("rank_b", "toyota_camry", "Toyota Camry", f"{pack}/taxi.png", (70, 70, 70), 0.28, 1.04, 1.02, ""),
        CarSpec("rank_b", "bmw_3_series", "BMW 3 Series", f"{pack}/Audi.png", (235, 235, 235), 0.25, 1.0, 1.0, "motorsport"),
        CarSpec("rank_b", "audi_a4", "Audi A4", f"{pack}/Audi.png", (20, 70, 180), 0.28, 1.0, 1.0, ""),
        CarSpec("rank_b", "mercedes_c_class", "Mercedes-Benz C-Class", f"{pack}/Audi.png", (20, 20, 20), 0.28, 1.0, 1.0, "stripe_white"),
        CarSpec("rank_a", "bmw_m3", "BMW M3", f"{pack}/Black_viper.png", (40, 110, 220), 0.25, 1.0, 1.0, "motorsport"),
        CarSpec("rank_a", "mercedes_amg_c63", "Mercedes-AMG C63", f"{pack}/Black_viper.png", (15, 15, 15), 0.25, 1.02, 1.0, "stripe_red"),
        CarSpec("rank_a", "audi_rs5", "Audi RS5", f"{pack}/Black_viper.png", (200, 25, 25), 0.22, 1.0, 1.0, "rear_wing"),
        CarSpec("rank_a", "porsche_911", "Porsche 911", f"{pack}/Black_viper.png", (230, 200, 40), 0.30, 0.92, 0.92, "rear_wing"),
    ]


async def main():
    cars = _cars()
    base_images = await _generate_base_images(cars)
    out_root = Path(
        "/workspace/public/assets/sprites/unluckystudio/Topdown_vehicle_sprites_pack/ranked_models"
    )

    for car in cars:
        folder = out_root / car.rank / f"{car.slug}_animation"
        _write_frames(base_images[car.slug], folder)


if __name__ == "__main__":
    asyncio.run(main())
