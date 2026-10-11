import math
from PIL import Image, ImageDraw, ImageFilter

def create_loopt_icon(size=1024):
    """
    Creates a modern, sleek icon for Loopt with a Black, Amber, and Electric Yellow palette:
    - Pitch black background (#000000)
    - Glowing amber-gold infinity ribbon (#FF9F0A -> #FFD60A)
    - Pure amber / neon electric yellow highlights
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    corner_radius = size * 0.22
    bg_box = [size * 0.04, size * 0.04, size * 0.96, size * 0.96]
    
    # Deep obsidian-black background
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    for y in range(size):
        ratio = y / size
        # Subtle rich black gradient: #050505 to #121008
        r = int(5 + 13 * ratio)
        g = int(5 + 11 * ratio)
        b = int(5 + 3 * ratio)
        bg_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(bg_box, radius=int(corner_radius), fill=255)
    img.paste(bg, (0, 0), mask)

    # Ambient amber border
    border_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_layer)
    border_draw.rounded_rectangle(bg_box, radius=int(corner_radius), outline=(255, 170, 0, 70), width=int(size * 0.015))
    img = Image.alpha_composite(img, border_layer)

    cx = size / 2
    cy = size / 2
    scale_a = size * 0.38
    stroke_w = int(size * 0.09)

    steps = 720
    points = []
    colors = []

    for i in range(steps):
        t = (i / steps) * 2 * math.pi
        denom = 1 + (math.sin(t) ** 2)
        x = cx + (scale_a * math.cos(t)) / denom
        y = cy + (scale_a * math.sin(t) * math.cos(t) * 1.35) / denom
        points.append((x, y))

        # Palette: Amber (#FF9F0A: 255, 159, 10) to Electric Yellow (#FFEA00: 255, 234, 0)
        norm_t = i / steps
        phase = (math.sin(norm_t * 2 * math.pi) + 1) / 2
        
        cr = 255
        cg = int(145 * (1 - phase) + 235 * phase)
        cb = int(0 * (1 - phase) + 20 * phase)
        colors.append((cr, cg, cb))

    # Amber & Yellow Glow
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    for i in range(len(points) - 1):
        glow_draw.line([points[i], points[i + 1]], fill=(*colors[i], 130), width=stroke_w + int(size * 0.06))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=size * 0.04))
    img = Image.alpha_composite(img, glow_layer)

    # Sharp Loop Ribbon
    loop_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    loop_draw = ImageDraw.Draw(loop_layer)
    for i in range(len(points) - 1):
        loop_draw.line([points[i], points[i + 1]], fill=(*colors[i], 255), width=stroke_w)
    img = Image.alpha_composite(img, loop_layer)

    # Center intersection jewel
    node_draw = ImageDraw.Draw(img)
    node_r = size * 0.045
    node_draw.ellipse([cx - node_r, cy - node_r, cx + node_r, cy + node_r], fill=(255, 255, 255, 245))
    node_inner_r = size * 0.024
    node_draw.ellipse([cx - node_inner_r, cy - node_inner_r, cx + node_inner_r, cy + node_inner_r], fill=(255, 200, 0, 255))

    return img

def main():
    icon_1024 = create_loopt_icon(1024)
    icon_1024.save("/home/ian/shorts-app/assets/icon.png", "PNG")
    icon_1024.save("/home/ian/shorts-app/assets/splash-icon.png", "PNG")
    icon_1024.save("/home/ian/shorts-app/assets/android-icon-foreground.png", "PNG")

    favicon = icon_1024.resize((64, 64), Image.LANCZOS)
    favicon.save("/home/ian/shorts-app/assets/favicon.png", "PNG")

    mipmaps = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192,
    }

    import os
    for folder, px in mipmaps.items():
        out_dir = f"/home/ian/shorts-app/android/app/src/main/res/mipmap-{folder}"
        os.makedirs(out_dir, exist_ok=True)
        resized = icon_1024.resize((px, px), Image.LANCZOS)
        resized.save(f"{out_dir}/ic_launcher.png", "PNG")
        resized.save(f"{out_dir}/ic_launcher_round.png", "PNG")

    print("Black, Amber & Yellow Loopt icons generated successfully!")

if __name__ == "__main__":
    main()
