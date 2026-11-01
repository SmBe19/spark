#!/usr/bin/env python3
"""Generate raster favicon fallbacks (PNG + multi-size ICO) for the Spark sparkle mark.
Pure stdlib: renders with supersampling, writes PNG via zlib and ICO as 32-bit BMP DIBs."""
import math, struct, zlib

S = 64.0  # design space


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))


def bg_color(u):
    # diagonal violet -> indigo -> pink
    if u < 0.55:
        return mix((124, 58, 237), (99, 102, 241), u / 0.55)
    return mix((99, 102, 241), (236, 72, 153), (u - 0.55) / 0.45)


def star_color(t, warm):
    # vertical white -> gold
    top = (255, 255, 255)
    bot = (252, 211, 77) if warm else (253, 230, 138)
    return mix(top, bot, t)


# sparkles: (cx, cy, r, warm)
SPARKS = [(35, 31, 20, True), (17, 18, 8, False), (22, 47, 5.5, True)]
DOT = (50, 49, 2.6)


def in_round_rect(px, py, x, y, w, h, r):
    qx = abs(px - (x + w / 2)) - (w / 2 - r)
    qy = abs(py - (y + h / 2)) - (h / 2 - r)
    if qx <= 0 and qy <= 0:
        return True
    return math.hypot(max(qx, 0), max(qy, 0)) <= r


def sample(px, py):
    """Return RGBA at a point in design coordinates."""
    # background rounded square x=2,y=2,w=60,h=60,r=15
    if not in_round_rect(px, py, 2, 2, 60, 60, 15):
        return (0, 0, 0, 0)
    col = bg_color(min(1.0, (px + py) / (2 * S)))
    # subtle inner border
    bd = min(px - 2, py - 2, 62 - px, 62 - py)
    if bd < 0.35:
        col = mix(col, (255, 255, 255), 0.18)

    def cover(cx, cy, r, color_fn):
        lx = (px - cx) / r
        ly = (py - cy) / r
        v = abs(lx) ** (2 / 3) + abs(ly) ** (2 / 3)
        if v <= 1:
            return color_fn(lx, ly)
        return None

    for cx, cy, r, warm in SPARKS:
        c = cover(cx, cy, r, lambda lx, ly, warm=warm, tx=cx, ty=cy, r=r: star_color((py - (ty - r)) / (2 * r), warm))
        if c:
            col = c
    d = math.hypot(px - DOT[0], py - DOT[1])
    if d <= DOT[2]:
        col = (255, 255, 255)
    return (col[0] / 255, col[1] / 255, col[2] / 255, 1.0)


def render(n):
    SS = 4
    out = bytearray()
    for y in range(n):
        out.append(0)  # PNG filter: none
        for x in range(n):
            rs = gs = bs = as_ = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    px = (x + (sx + 0.5) / SS) * S / n
                    py = (y + (sy + 0.5) / SS) * S / n
                    r, g, b, a = sample(px, py)
                    rs += r * a; gs += g * a; bs += b * a; as_ += a
            k = SS * SS
            a = as_ / k
            if a > 0:
                r, g, b = rs / as_, gs / as_, bs / as_
            else:
                r = g = b = 0
            out += bytes((round(r * 255), round(g * 255), round(b * 255), round(a * 255)))
    return bytes(out)


def png_rgba(n):
    raw = render(n)
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', n, n, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def bmp_dib(n):
    raw = render(n)
    # rows bottom-up, BGRA
    px = bytearray()
    for y in range(n - 1, -1, -1):
        row = raw[y * (n * 4 + 1) + 1: y * (n * 4 + 1) + 1 + n * 4]
        for x in range(n):
            r, g, b, a = row[x * 4:x * 4 + 4]
            px += bytes((b, g, r, a))
    mask_row = ((n + 31) // 32) * 4
    px += b'\x00' * (mask_row * n)
    hdr = struct.pack('<IiiHHIIiiII', 40, n, n * 2, 1, 32, 0, len(px), 0, 0, 0, 0)
    return hdr + bytes(px)


def ico(sizes):
    images = [(n, bmp_dib(n)) for n in sizes]
    header = struct.pack('<HHH', 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries = b''
    for n, data in images:
        entries += struct.pack('<BBBBHHII', n if n < 256 else 0, n if n < 256 else 0,
                               0, 0, 1, 32, len(data), offset)
        offset += len(data)
    return header + entries + b''.join(d for _, d in images)


with open('favicon.ico', 'wb') as f:
    f.write(ico([16, 32, 48]))
with open('favicon-32.png', 'wb') as f:
    f.write(png_rgba(32))
with open('apple-touch-icon.png', 'wb') as f:
    f.write(png_rgba(180))
print('wrote favicon.ico, favicon-32.png, apple-touch-icon.png')
