"""Membuat ikon PWA (PNG) tanpa pustaka tambahan: timbangan putih + kotak misteri oranye di latar biru.

Jalankan dari folder frontend:  python tools/make_icons.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
BLUE = (59, 91, 219)
WHITE = (255, 255, 255)
ORANGE = (245, 159, 0)
SS = 3  # supersampling untuk tepi halus


def write_png(path: Path, w: int, h: int, rgba: bytearray) -> None:
    raw = b"".join(b"\x00" + bytes(rgba[y * w * 4:(y + 1) * w * 4]) for y in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def render(size: int, maskable: bool) -> bytearray:
    n = size * SS
    cov = [[None] * n for _ in range(n)]  # warna per sub-piksel (None = transparan)

    def tf(v: float) -> float:  # area aman maskable: isi di 80% tengah
        return 0.12 + 0.76 * v if maskable else v

    def rect(x0, y0, x1, y1, col, r=0.0, transform=True):
        if transform:
            x0, y0, x1, y1, r = tf(x0), tf(y0), tf(x1), tf(y1), r * (0.76 if maskable else 1)
        X0, Y0, X1, Y1 = int(x0 * n), int(y0 * n), int(x1 * n), int(y1 * n)
        R = r * n
        for y in range(max(0, Y0), min(n, Y1)):
            for x in range(max(0, X0), min(n, X1)):
                if R:
                    dx = max(X0 + R - x, 0, x - (X1 - R))
                    dy = max(Y0 + R - y, 0, y - (Y1 - R))
                    if dx * dx + dy * dy > R * R:
                        continue
                cov[y][x] = col

    def circle(cx, cy, r, col):
        cx, cy, r = tf(cx) * n, tf(cy) * n, r * (0.76 if maskable else 1) * n
        for y in range(max(0, int(cy - r)), min(n, int(cy + r) + 1)):
            for x in range(max(0, int(cx - r)), min(n, int(cx + r) + 1)):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    cov[y][x] = col

    def segment(x0, y0, x1, y1, width, col):
        x0, y0, x1, y1 = tf(x0) * n, tf(y0) * n, tf(x1) * n, tf(y1) * n
        wpx = width * (0.76 if maskable else 1) * n / 2
        minx, maxx = int(min(x0, x1) - wpx), int(max(x0, x1) + wpx) + 1
        miny, maxy = int(min(y0, y1) - wpx), int(max(y0, y1) + wpx) + 1
        dx, dy = x1 - x0, y1 - y0
        ll = dx * dx + dy * dy or 1
        for y in range(max(0, miny), min(n, maxy)):
            for x in range(max(0, minx), min(n, maxx)):
                t = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / ll))
                px, py = x0 + t * dx - x, y0 + t * dy - y
                if px * px + py * py <= wpx * wpx:
                    cov[y][x] = col

    # latar
    if maskable:
        rect(0, 0, 1, 1, BLUE, transform=False)
    else:
        rect(0, 0, 1, 1, BLUE, r=0.22, transform=False)
    # tiang, alas, lengan
    rect(0.47, 0.30, 0.53, 0.76, WHITE)
    rect(0.32, 0.74, 0.68, 0.80, WHITE, r=0.03)
    rect(0.14, 0.27, 0.86, 0.32, WHITE, r=0.025)
    circle(0.5, 0.295, 0.045, ORANGE)
    # tali & nampan kiri/kanan
    for cx in (0.25, 0.75):
        segment(cx, 0.31, cx - 0.12, 0.60, 0.018, WHITE)
        segment(cx, 0.31, cx + 0.12, 0.60, 0.018, WHITE)
        rect(cx - 0.14, 0.59, cx + 0.14, 0.63, WHITE, r=0.02)
    # kotak misteri "x" (kiri) dan beban (kanan)
    rect(0.18, 0.44, 0.32, 0.585, ORANGE, r=0.02)
    segment(0.215, 0.475, 0.285, 0.55, 0.022, WHITE)
    segment(0.285, 0.475, 0.215, 0.55, 0.022, WHITE)
    rect(0.67, 0.47, 0.83, 0.585, WHITE, r=0.02)
    rect(0.705, 0.505, 0.795, 0.52, BLUE)
    rect(0.705, 0.535, 0.795, 0.55, BLUE)

    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            r = g = b = a = 0
            for sy in range(SS):
                row = cov[y * SS + sy]
                for sx in range(SS):
                    c = row[x * SS + sx]
                    if c:
                        r += c[0]
                        g += c[1]
                        b += c[2]
                        a += 1
            i = (y * size + x) * 4
            if a:
                out[i:i + 4] = bytes((r // a, g // a, b // a, a * 255 // (SS * SS)))
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size, mask in [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
    ]:
        write_png(OUT / name, size, size, render(size, mask))
        print("dibuat", OUT / name)


if __name__ == "__main__":
    main()
