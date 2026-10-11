import math
from PIL import Image, ImageDraw, ImageFilter

def create_loopr_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center_x = size / 2
    center_y = size / 2

    # 1. Background Squircle / Rounded Plate
    corner_radius = size * 0.22
    bg_box = [size * 0.04, size * 0.04, size * 0.96, size * 0.96]
    
    # Gradient background
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    for y in range(size):
        ratio = y / size
        # Midnight gradient from dark navy-black to deep obsidian
        r = int(12 + 10 * ratio)
        g = int(14 + 12 * ratio)
        b = int(22 + 20 * ratio)
        bg_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    
    # Mask rounded rect
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(bg_box, radius=int(corner_radius), fill=255)
    
    img.paste(bg, (0, 0), mask)

    # 2. Glowing Outer Ring
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_draw.rounded_rectangle(bg_box, radius=int(corner_radius), outline=(255, 0, 80, 70), width=int(size * 0.015))
    img = Image.alpha_composite(img, glow_layer)

    # 3. Draw Vertical Scrolling Loops (Mobius / Infinity figure-8 oriented vertically)
    # Loop track
    track_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    track_draw = ImageDraw.Draw(track_layer)

    # Vertical looping oval track
    rx = size * 0.28
    ry = size * 0.34
    line_w = int(size * 0.065)

    # Gradient loop particles
    steps = 360
    for i in range(steps):
        angle = math.radians(i)
        next_angle = math.radians(i + 1.2)
        
        # Upper and lower looping arcs
        x1 = center_x + rx * math.cos(angle)
        y1 = center_y + ry * math.sin(angle)
        x2 = center_x + rx * math.cos(next_angle)
        y2 = center_y + ry * math.sin(next_angle)

        # Color transition: Neon Pink/Red to Vivid Cyan/Blue
        ratio = (i / 360.0)
        if ratio < 0.5:
            # Coral-red to purple
            sub_r = ratio * 2
            cr = int(255 * (1 - sub_r * 0.3))
            cg = int(20 * (1 - sub_r) + 80 * sub_r)
            cb = int(80 + 175 * sub_r)
        else:
            # Purple to Cyan
            sub_r = (ratio - 0.5) * 2
            cr = int(180 * (1 - sub_r) + 0 * sub_r)
            cg = int(80 * (1 - sub_r) + 230 * sub_r)
            cb = 255

        track_draw.line([(x1, y1), (x2, y2)], fill=(cr, cg, cb, 255), width=line_w)

    img = Image.alpha_composite(img, track_layer)

    # 4. Vertical Scroll Chevrons / Swipe indicator inside the loop
    overlay_draw = ImageDraw.Draw(img)

    # Top Arrow (indicating continuous upward scroll)
    arr_y = center_y - size * 0.18
    arr_w = size * 0.12
    arr_h = size * 0.06
    # Upward Chevron
    overlay_draw.line(
        [(center_x - arr_w, arr_y + arr_h), (center_x, arr_y), (center_x + arr_w, arr_y + arr_h)],
        fill=(255, 255, 255, 230),
        width=int(size * 0.025)
    )

    # Bottom Arrow (indicating loop continuation)
    arr_b_y = center_y + size * 0.18
    overlay_draw.line(
        [(center_x - arr_w, arr_b_y - arr_h), (center_x, arr_b_y), (center_x + arr_w, arr_b_y - arr_h)],
        fill=(0, 229, 255, 230),
        width=int(size * 0.025)
    )

    # 5. Central Play Triangle
    tri_size = size * 0.11
    play_tri = [
        (center_x - tri_size * 0.6 + size * 0.015, center_y - tri_size),
        (center_x + tri_size * 0.9 + size * 0.015, center_y),
        (center_x - tri_size * 0.6 + size * 0.015, center_y + tri_size),
    ]
    # Triangle shadow
    shadow_tri = [(p[0] + size * 0.008, p[1] + size * 0.012) for p in play_tri]
    overlay_draw.polygon(shadow_tri, fill=(0, 0, 0, 140))
    # Triangle solid
    overlay_draw.polygon(play_tri, fill=(255, 255, 255, 255))

    return img

if __name__ == "__main__":
    icon_1024 = create_loopr_icon(1024)
    icon_1024.save("assets/icon.png", "PNG")

    # Android foreground
    icon_432 = create_loopr_icon(432)
    icon_432.save("assets/android-icon-foreground.png", "PNG")

    # Splash
    icon_512 = create_loopr_icon(512)
    icon_512.save("assets/splash-icon.png", "PNG")

    # Favicon
    icon_48 = icon_1024.resize((48, 48), Image.LANCZOS)
    icon_48.save("assets/favicon.png", "PNG")

    print("Icons successfully generated!")
