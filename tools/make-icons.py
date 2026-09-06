"""ホーム画面用のアイコンを生成する（依存ライブラリなし）。

    python3 tools/make-icons.py

public/ に icon-180.png（iOS の apple-touch-icon 用）と
icon-512.png（manifest 用）を書き出す。青い角丸の上に白いサイコロ。
"""
import struct
import zlib
from pathlib import Path

BG_TOP = (59, 125, 216)
BG_BOTTOM = (43, 108, 176)
DIE = (255, 255, 255)
PIP = (31, 41, 51)

OUT_DIR = Path(__file__).resolve().parent.parent / 'public'


def rounded(x, y, left, top, size, radius):
    """角丸の四角形の内側かどうか"""
    right, bottom = left + size, top + size
    if not (left <= x < right and top <= y < bottom):
        return False
    cx = min(max(x, left + radius), right - radius - 1)
    cy = min(max(y, top + radius), bottom - radius - 1)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def render(size):
    die_size = int(size * 0.58)
    die_left = (size - die_size) // 2
    die_radius = int(die_size * 0.22)
    pip_radius = max(1, int(size * 0.045))
    # サイコロの5の目
    offset = die_size * 0.26
    center = die_left + die_size / 2
    pips = [
        (center - offset, center - offset), (center + offset, center - offset),
        (center, center),
        (center - offset, center + offset), (center + offset, center + offset),
    ]

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # フィルタなし
        ratio = y / max(1, size - 1)
        bg = tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * ratio) for i in range(3))
        for x in range(size):
            if not rounded(x, y, 0, 0, size, int(size * 0.22)):
                rows.extend((0, 0, 0, 0))  # 角の外は透明
                continue
            color = bg
            if rounded(x, y, die_left, die_left, die_size, die_radius):
                color = DIE
                for px, py in pips:
                    if (x - px) ** 2 + (y - py) ** 2 <= pip_radius ** 2:
                        color = PIP
                        break
            rows.extend((*color, 255))
    return bytes(rows)


def write_png(path, size):
    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)  # 8bit RGBA
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', header)
           + chunk(b'IDAT', zlib.compress(render(size), 9))
           + chunk(b'IEND', b''))
    path.write_bytes(png)
    print(f'{path} ({len(png)} bytes)')


if __name__ == '__main__':
    OUT_DIR.mkdir(exist_ok=True)
    for size in (180, 512):
        write_png(OUT_DIR / f'icon-{size}.png', size)
