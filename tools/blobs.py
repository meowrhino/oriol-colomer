"""Genera los stickers: formas abstractas en png con transparencia.

    python3 tools/blobs.py


Cada blob es un radio armonico r(t) = R * (1 + suma de cosenos), que siempre
sale cerrado y organico. Se dibuja a 4x y se reduce, que es la forma barata de
tener el borde suave sin depender de nada.
"""
import math, random, os
from PIL import Image, ImageDraw, ImageFilter  # pip install pillow

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "stickers")
SIZE = 512
SS = 4                      # supersampling
STEPS = 1440


def radius_fn(rng, harmonics, amp):
    terms = [(k, rng.uniform(-amp, amp) / k * 2.2, rng.uniform(0, math.tau))
             for k in harmonics]

    def r(t):
        v = 1.0
        for k, a, p in terms:
            v += a * math.cos(k * t + p)
        return v
    return r


def outline(r, cx, cy, base, squash=1.0, rot=0.0):
    pts = []
    for i in range(STEPS):
        t = i / STEPS * math.tau
        rad = base * r(t)
        x = rad * math.cos(t)
        y = rad * math.sin(t) * squash
        xr = x * math.cos(rot) - y * math.sin(rot)
        yr = x * math.sin(rot) + y * math.cos(rot)
        pts.append((cx + xr, cy + yr))
    return pts


def gradient(size, top, bottom, angle=0.0):
    """Rampa lineal entre dos grises, en la direccion que se le pida."""
    g = Image.new("L", (size, size))
    px = g.load()
    ca, sa = math.cos(angle), math.sin(angle)
    for y in range(size):
        for x in range(size):
            u = ((x / size - .5) * ca + (y / size - .5) * sa) + .5
            u = min(1.0, max(0.0, u))
            px[x, y] = int(top + (bottom - top) * u)
    return g


def save(name, mask, tone_a, tone_b, angle):
    """mask viene a SS de resolucion; el color se aplica ya reducido."""
    mask = mask.resize((SIZE, SIZE), Image.LANCZOS)
    fill = gradient(SIZE, tone_a, tone_b, angle).convert("RGB")
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img.paste(fill, (0, 0), mask)
    path = os.path.join(OUT, name)
    img.save(path, optimize=True)
    return path


def blob(seed, harmonics=(2, 3, 5), amp=.34, squash=1.0, base=.40):
    rng = random.Random(seed)
    s = SIZE * SS
    m = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(m)
    d.polygon(outline(radius_fn(rng, harmonics, amp), s / 2, s / 2,
                      s * base, squash, rng.uniform(0, math.tau)), fill=255)
    return m


def ring(seed, thickness=.42):
    rng = random.Random(seed)
    s = SIZE * SS
    m = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(m)
    r_out = radius_fn(rng, (2, 3, 4), .30)
    d.polygon(outline(r_out, s / 2, s / 2, s * .42, rng.uniform(.85, 1.0),
                      rng.uniform(0, math.tau)), fill=255)
    d.polygon(outline(r_out, s / 2, s / 2, s * .42 * thickness,
                      rng.uniform(.85, 1.0), rng.uniform(0, math.tau)), fill=0)
    return m


def lobes(seed):
    """Dos manchas que se funden: metaball a lo bruto, con blur y umbral."""
    rng = random.Random(seed)
    s = SIZE * SS
    m = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(m)
    for _ in range(3):
        rad = s * rng.uniform(.13, .22)
        cx = s / 2 + s * rng.uniform(-.14, .14)
        cy = s / 2 + s * rng.uniform(-.14, .14)
        d.polygon(outline(radius_fn(rng, (2, 3), .22), cx, cy, rad,
                          rng.uniform(.8, 1.2), rng.uniform(0, math.tau)),
                  fill=255)
    m = m.filter(ImageFilter.GaussianBlur(s * .035))
    return m.point(lambda v: 255 if v > 118 else 0).filter(
        ImageFilter.GaussianBlur(s * .004))


os.makedirs(OUT, exist_ok=True)
# Los tonos van claros a proposito: cada sticker se pinta dentro de su propia
# sombra, que es muy oscura, asi que una forma oscura se perderia dentro. En
# claro se lee como algo que flota en el hueco.
made = [
    save("blob-01.png", blob(11, (2, 3, 5), .36, .78), 108, 205, 1.1),
    save("blob-02.png", lobes(24), 86, 182, 2.4),
    save("blob-03.png", ring(37), 126, 222, .3),
    save("blob-04.png", blob(52, (3, 4, 7), .28, 1.0, .38), 146, 236, 1.9),
    save("blob-05.png", blob(68, (2, 5), .40, 1.15, .36), 78, 190, .6),
    save("blob-06.png", lobes(83), 132, 228, 3.0),
]
for p in made:
    print(os.path.basename(p), os.path.getsize(p), "bytes")
