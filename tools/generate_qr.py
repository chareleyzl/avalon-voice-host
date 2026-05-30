from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
URL = "https://zl0312-7ghdq45zda52ea30-1251698841.tcloudbaseapp.com/avalon/index.html"
TITLE = "阿瓦隆语音主持"
SUBTITLE = "扫码打开云端链接"
OUTPUT = ROOT / "avalon-voice-host-qr.png"


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/simsun.ttc"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def centered_text(draw, image, y, text, text_font, fill):
    box = draw.textbbox((0, 0), text, font=text_font)
    x = (image.width - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=text_font, fill=fill)


def main():
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=3,
    )
    qr.add_data(URL)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#111827", back_color="#FFFFFF").convert("RGB")

    width = 820
    padding = 44
    title_font = font(46, bold=True)
    subtitle_font = font(24)
    title_h = 64
    subtitle_h = 36
    height = padding + title_h + 28 + qr_img.height + 24 + subtitle_h + padding

    canvas = Image.new("RGB", (width, height), "#F8FAFC")
    draw = ImageDraw.Draw(canvas)

    centered_text(draw, canvas, padding, TITLE, title_font, "#111827")

    qr_x = (width - qr_img.width) // 2
    qr_y = padding + title_h + 28
    draw.rounded_rectangle(
        (qr_x - 18, qr_y - 18, qr_x + qr_img.width + 18, qr_y + qr_img.height + 18),
        radius=28,
        fill="#FFFFFF",
        outline="#E5E7EB",
        width=2,
    )
    canvas.paste(qr_img, (qr_x, qr_y))

    centered_text(draw, canvas, qr_y + qr_img.height + 24, SUBTITLE, subtitle_font, "#475569")
    canvas.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
