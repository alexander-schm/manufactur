import random, sys

random.seed(4)
W, H = 800, 520
S = 'style="stroke:var(--line);stroke-width:var(--lw);stroke-linejoin:round;stroke-linecap:round"'
T = 'style="stroke:var(--line);stroke-width:calc(var(--lw) * 0.55);stroke-linecap:round;opacity:.7"'
out = []
a = out.append

def j(v, d=1.2):
    return v + random.uniform(-d, d)

# ---------- pots ----------
def pot(kind, x, y, s, glaze, pattern=None):
    """x = centre, y = base (bottom)"""
    g = []
    if kind == 'vase':
        p = f"M{x-10*s} {y} Q{x-20*s} {y-18*s} {x-9*s} {y-30*s} Q{x-5*s} {y-36*s} {x-6*s} {y-42*s} L{x+6*s} {y-42*s} Q{x+5*s} {y-36*s} {x+9*s} {y-30*s} Q{x+20*s} {y-18*s} {x+10*s} {y} Z"
        top = (x, y-42*s, 7*s); band = (y-20*s, 16*s)
    elif kind == 'bowl':
        p = f"M{x-18*s} {y-14*s} L{x+18*s} {y-14*s} Q{x+16*s} {y} {x} {y} Q{x-16*s} {y} {x-18*s} {y-14*s} Z"
        top = (x, y-14*s, 18*s); band = (y-8*s, 15*s)
    elif kind == 'cup':
        p = f"M{x-8*s} {y-20*s} L{x+8*s} {y-20*s} L{x+7*s} {y} L{x-7*s} {y} Z"
        g.append(f'<path {S} d="M{x+7.5*s} {y-16*s} Q{x+15*s} {y-13*s} {x+7*s} {y-5*s}" fill="none"/>')
        top = (x, y-20*s, 8*s); band = (y-10*s, 7*s)
    elif kind == 'jug':
        p = f"M{x-10*s} {y} Q{x-15*s} {y-16*s} {x-8*s} {y-28*s} L{x-10*s} {y-34*s} L{x+8*s} {y-34*s} Q{x+15*s} {y-16*s} {x+10*s} {y} Z"
        g.append(f'<path {S} d="M{x+9*s} {y-28*s} Q{x+20*s} {y-24*s} {x+11*s} {y-10*s}" fill="none"/>')
        g.append(f'<path {S} d="M{x-10*s} {y-34*s} L{x-15*s} {y-37*s} L{x-8*s} {y-31*s}" fill="none"/>')
        top = (x-1*s, y-34*s, 9*s); band = (y-18*s, 11*s)
    elif kind == 'tall':
        p = f"M{x-7*s} {y} L{x-9*s} {y-40*s} Q{x-12*s} {y-46*s} {x-7*s} {y-50*s} L{x+7*s} {y-50*s} Q{x+12*s} {y-46*s} {x+9*s} {y-40*s} L{x+7*s} {y} Z"
        top = (x, y-50*s, 7*s); band = (y-25*s, 8*s)
    elif kind == 'plate':
        p = f"M{x-4*s} {y} L{x-4*s} {y-34*s} Q{x} {y-38*s} {x+4*s} {y-34*s} L{x+4*s} {y} Z"
        g.insert(0, f'<ellipse {S} cx="{x}" cy="{y-17*s}" rx="17*s" ry="17*s" fill="{glaze}"/>'.replace('17*s', str(17*s)))
        top = None; band = None
    g.insert(0, f'<path {S} d="{p}" fill="{glaze}"/>')
    if top:
        g.append(f'<ellipse {S} cx="{top[0]}" cy="{top[1]}" rx="{top[2]}" ry="{top[2]*0.28}" fill="var(--rim)"/>')
    if pattern and band:
        by, bw = band
        if pattern == 'dots':
            for k in range(-2, 3):
                g.append(f'<circle cx="{x+k*bw/2.6}" cy="{by}" r="{1.6*s}" fill="var(--line)" opacity=".75"/>')
        elif pattern == 'stripes':
            g.append(f'<path {T} d="M{x-bw} {by-3*s} L{x+bw} {by-3*s} M{x-bw*.95} {by+3*s} L{x+bw*.95} {by+3*s}" fill="none"/>')
        elif pattern == 'wave':
            d = f"M{x-bw} {by}"
            for k in range(4):
                xx = x - bw + (k+1)*bw/2
                d += f" Q{xx-bw/4} {by-(4 if k%2==0 else -4)*s} {xx} {by}"
            g.append(f'<path {T} d="{d}" fill="none"/>')
        elif pattern == 'leaf':
            g.append(f'<path {T} d="M{x-6*s} {by+4*s} Q{x} {by-8*s} {x+6*s} {by+4*s} M{x} {by+4*s} L{x} {by-4*s}" fill="none"/>')
    # highlight
    if kind not in ('plate',):
        g.append(f'<path d="M{x-5*s} {y-6*s} Q{x-7*s} {y-12*s} {x-5*s} {y-16*s}" stroke="#fff" stroke-width="{1.8*s}" fill="none" opacity=".7" stroke-linecap="round"/>')
    return '\n'.join(g)

# ---------- background ----------
a(f'<rect x="0" y="0" width="{W}" height="370" fill="var(--wall)"/>')
# plaster texture & exposed bricks
for bx, by in [(212, 250), (236, 262), (540, 40), (560, 52), (520, 52), (720, 30), (60, 20)]:
    a(f'<rect {T} x="{bx}" y="{by}" width="22" height="11" rx="2" fill="var(--brickLight)"/>')
for _ in range(14):
    x0, y0 = random.uniform(10, 780), random.uniform(10, 340)
    a(f'<path {T} d="M{x0} {y0} q{random.uniform(-6,6)} {random.uniform(2,6)} {random.uniform(4,10)} {random.uniform(4,10)}" fill="none" opacity=".25"/>')
# beam
a(f'<path {S} d="M0 0 L800 0 L800 18 Q400 22 0 18 Z" fill="var(--woodDark)"/>')
a(f'<path {T} d="M30 9 L120 10 M300 8 L420 9 M600 10 L700 9" fill="none"/>')
# skirting
a(f'<path {S} d="M0 362 Q400 356 800 364 L800 376 L0 376 Z" fill="var(--woodDark)"/>')
# floor
a(f'<path {S} d="M0 376 L800 376 L800 520 L0 520 Z" fill="var(--floor)"/>')
for k in range(-6, 14):
    x_top = 400 + (k - 4) * 60
    x_bot = 400 + (k - 4) * 130
    a(f'<path {T} d="M{x_top} 376 L{x_bot} 520" fill="none" opacity=".35"/>')
for yy in (400, 432, 474):
    a(f'<path {T} d="M0 {yy} Q400 {yy-3} 800 {yy+1}" fill="none" opacity=".2"/>')
# knots
for kx, ky in [(120, 450), (520, 495), (690, 420)]:
    a(f'<ellipse {T} cx="{kx}" cy="{ky}" rx="6" ry="2.5" fill="none" opacity=".4"/>')

# rug
a(f'<path {S} d="M300 455 Q470 440 640 456 Q650 486 630 508 Q470 520 310 508 Q292 482 300 455 Z" fill="var(--rug)"/>')
a(f'<path {T} d="M318 466 Q470 452 624 467 M316 498 Q470 510 622 497" fill="none" stroke-dasharray="6 5"/>')
for k in range(9):
    xx = 340 + k * 33
    a(f'<path d="M{xx} 476 l8 8 l-8 8 l-8 -8 Z" fill="var(--rugDeco)" opacity=".8"/>')
for k in range(12):
    yy = 458 + k * 4.2
    a(f'<path {T} d="M300 {yy} l-8 1 M640 {yy} l8 1" fill="none"/>')

# ---------- string lights ----------
a(f'<path {T} d="M0 26 Q120 70 240 30 Q360 74 480 30 Q600 72 720 28 L800 34" fill="none" opacity=".8"/>')
for k, (lx, ly) in enumerate([(40, 44), (90, 56), (150, 52), (200, 40), (280, 46), (330, 58), (390, 50), (440, 38),
                               (520, 46), (570, 56), (630, 50), (690, 36), (760, 32)]):
    col = ['var(--g3)', 'var(--sun)', 'var(--g1)', 'var(--g2)'][k % 4]
    a(f'<circle cx="{lx}" cy="{ly+7}" r="9" fill="{col}" opacity=".25"/>')
    a(f'<path {S} d="M{lx-3} {ly} L{lx+3} {ly} L{lx+4} {ly+10} Q{lx} {ly+14} {lx-4} {ly+10} Z" fill="{col}"/>')

# ---------- shelf unit (left) ----------
a(f'<path {S} d="M22 70 L200 70 L200 360 L22 360 Z" fill="var(--wood)"/>')
a(f'<path d="M30 78 L192 78 L192 352 L30 352 Z" fill="var(--woodDark)" opacity=".55"/>')
a(f'<rect x="30" y="78" width="162" height="274" fill="url(#hatch)" opacity=".35"/>')
for sy in (150, 225, 300, 352):
    a(f'<path {S} d="M24 {sy} L198 {sy} L198 {sy+8} L24 {sy+8} Z" fill="var(--wood)"/>')
    a(f'<path {T} d="M40 {sy+4} L80 {sy+4} M120 {sy+3} L170 {sy+3}" fill="none" opacity=".5"/>')
a(f'<path {T} d="M26 90 Q28 200 26 340 M196 120 Q194 220 196 300" fill="none" opacity=".4"/>')
# pots on shelves
items = [
    ('vase', 52, 150, 1.0, 'var(--g1)', 'wave'), ('cup', 86, 150, 1.0, 'var(--g3)', 'dots'), ('jug', 118, 150, 1.0, 'var(--g2)', 'stripes'),
    ('tall', 152, 150, 1.0, 'var(--g4)', 'leaf'), ('cup', 180, 150, 0.8, 'var(--g1)', None),
    ('bowl', 56, 225, 1.0, 'var(--g5)', 'dots'), ('plate', 100, 225, 1.0, 'var(--g3)', None), ('vase', 140, 225, 1.1, 'var(--g2)', 'leaf'),
    ('cup', 176, 225, 0.9, 'var(--g4)', 'stripes'),
    ('jug', 50, 300, 1.0, 'var(--g3)', 'wave'), ('bowl', 92, 300, 0.9, 'var(--g1)', 'wave'), ('tall', 126, 300, 0.9, 'var(--g5)', 'stripes'),
    ('vase', 166, 300, 0.95, 'var(--g4)', 'dots'),
]
for it in items:
    a(pot(*it))
# bottom shelf: unfired greenware + label
a(pot('bowl', 60, 352, 0.9, 'var(--clayRaw)', None))
a(pot('cup', 96, 352, 0.9, 'var(--clayRaw)', None))
a(pot('vase', 136, 352, 0.9, 'var(--clayRaw)', None))
a(f'<path {S} d="M160 334 L194 334 L194 350 L160 350 Z" fill="var(--paper)"/>')
a(f'<text x="177" y="346" text-anchor="middle" font-family="\'Patrick Hand\', \'Comic Sans MS\', cursive" font-size="10" fill="var(--line)">trocknen</text>')

# ---------- window (centre-left) ----------
wx, wy, ww, wh = 250, 60, 150, 140
a(f'<path {S} d="M{wx-10} {wy-8} L{wx+ww+10} {wy-8} L{wx+ww+10} {wy+wh+6} L{wx-10} {wy+wh+6} Z" fill="var(--woodDark)"/>')
a(f'<rect {S} x="{wx}" y="{wy}" width="{ww}" height="{wh}" fill="var(--sky)"/>')
# outside: hills, tree, sun, cloud, birds
a(f'<circle cx="{wx+112}" cy="{wy+34}" r="16" fill="var(--sun)"/>')
a(f'<path {T} d="M{wx+112} {wy+10} l0 -6 M{wx+136} {wy+34} l6 0 M{wx+129} {wy+17} l4 -4 M{wx+95} {wy+17} l-4 -4" fill="none"/>')
a(f'<path {S} d="M{wx+20} {wy+40} q6 -12 18 -6 q8 -10 18 0 q10 0 8 8 L{wx+18} {wy+42} Z" fill="var(--paper)"/>')
a(f'<path d="M{wx} {wy+110} Q{wx+40} {wy+80} {wx+80} {wy+100} Q{wx+120} {wy+84} {wx+ww} {wy+104} L{wx+ww} {wy+wh} L{wx} {wy+wh} Z" fill="var(--hill)"/>')
a(f'<path d="M{wx} {wy+124} Q{wx+60} {wy+108} {wx+ww} {wy+122} L{wx+ww} {wy+wh} L{wx} {wy+wh} Z" fill="var(--g2)" opacity=".9"/>')
a(f'<path {S} d="M{wx+40} {wy+108} L{wx+40} {wy+90}" fill="none"/>')
a(f'<circle {S} cx="{wx+40}" cy="{wy+84}" r="11" fill="var(--g2)"/>')
a(f'<path {T} d="M{wx+70} {wy+56} q4 -4 8 0 q4 -4 8 0 M{wx+90} {wy+66} q3 -3 6 0 q3 -3 6 0" fill="none"/>')
# mullions
a(f'<path {S} d="M{wx+ww/2} {wy} L{wx+ww/2} {wy+wh} M{wx} {wy+wh/2} L{wx+ww} {wy+wh/2}" fill="none" style="stroke:var(--woodDark);stroke-width:6"/>')
a(f'<path {S} d="M{wx+ww/2} {wy} L{wx+ww/2} {wy+wh} M{wx} {wy+wh/2} L{wx+ww} {wy+wh/2}" fill="none"/>')
# glass glint
a(f'<path d="M{wx+10} {wy+30} l14 -14 M{wx+10} {wy+42} l24 -24" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>')
# curtains
a(f'<path {S} d="M{wx-16} {wy-12} L{wx+26} {wy-12} Q{wx+16} {wy+40} {wx+30} {wy+70} Q{wx+6} {wy+90} {wx-10} {wy+150} L{wx-16} {wy+150} Z" fill="var(--curtain)"/>')
a(f'<path {S} d="M{wx+ww+16} {wy-12} L{wx+ww-26} {wy-12} Q{wx+ww-16} {wy+40} {wx+ww-30} {wy+70} Q{wx+ww-6} {wy+90} {wx+ww+10} {wy+150} L{wx+ww+16} {wy+150} Z" fill="var(--curtain)"/>')
for cx_ in (wx-4, wx+8, wx+ww+4, wx+ww-8):
    a(f'<path {T} d="M{cx_} {wy-6} Q{cx_+3} {wy+50} {cx_} {wy+140}" fill="none" opacity=".4"/>')
for k in range(6):
    a(f'<circle cx="{wx-6+k*7}" cy="{wy+20+k*14}" r="1.6" fill="var(--line)" opacity=".4"/>')
    a(f'<circle cx="{wx+ww+6-k*7}" cy="{wy+20+k*14}" r="1.6" fill="var(--line)" opacity=".4"/>')
a(f'<path {S} d="M{wx-24} {wy-12} L{wx+ww+24} {wy-12}" fill="none" style="stroke:var(--line);stroke-width:4"/>')
# sill + plants
a(f'<path {S} d="M{wx-22} {wy+wh+6} L{wx+ww+22} {wy+wh+6} L{wx+ww+18} {wy+wh+16} L{wx-18} {wy+wh+16} Z" fill="var(--wood)"/>')
def plant(x, y, kind):
    r = [f'<path {S} d="M{x-9} {y} L{x-11} {y-14} L{x+11} {y-14} L{x+9} {y} Z" fill="var(--clay)"/>',
         f'<path {S} d="M{x-12} {y-14} L{x+12} {y-14} L{x+12} {y-18} L{x-12} {y-18} Z" fill="var(--clay)"/>']
    if kind == 'cactus':
        r.insert(0, f'<path {S} d="M{x-5} {y-18} L{x-5} {y-38} Q{x} {y-46} {x+5} {y-38} L{x+5} {y-18} Z" fill="var(--g2)"/>')
        r.insert(1, f'<path {S} d="M{x+5} {y-28} L{x+11} {y-28} L{x+11} {y-34}" fill="none"/>')
        r.append(f'<circle cx="{x}" cy="{y-46}" r="3" fill="var(--g3)"/>')
    elif kind == 'leafy':
        for ang in (-50, -20, 10, 40):
            r.insert(0, f'<path {S} d="M{x} {y-18} Q{x+ang*0.4} {y-40} {x+ang*0.6} {y-34} Q{x+ang*0.2} {y-28} {x} {y-18}" fill="var(--g2)"/>')
    else:  # flower
        r.insert(0, f'<path {S} d="M{x} {y-18} L{x} {y-36} M{x} {y-26} Q{x+8} {y-30} {x+10} {y-24}" fill="none"/>')
        for k in range(5):
            import math
            ang = k * 72 * math.pi / 180
            r.insert(1, f'<circle {S} cx="{x+6*math.cos(ang)}" cy="{y-40+6*math.sin(ang)}" r="4.2" fill="var(--g3)"/>')
        r.insert(7, f'<circle cx="{x}" cy="{y-40}" r="3" fill="var(--sun)"/>')
    return '\n'.join(r)
a(plant(wx+10, wy+wh+6, 'cactus'))
a(plant(wx+ww/2+20, wy+wh+6, 'flower'))
a(plant(wx+ww-6, wy+wh+6, 'leafy'))
# hanging plant
a(f'<path {T} d="M215 18 L208 70 M215 18 L222 70" fill="none"/>')
a(f'<path {S} d="M200 70 L230 70 Q228 88 215 88 Q202 88 200 70 Z" fill="var(--g5)"/>')
for k, dx in enumerate((-14, -6, 4, 12)):
    a(f'<path {S} d="M{215+dx} 76 Q{215+dx*1.6} {100+k*10} {215+dx*1.1} {120+k*12}" fill="none" style="stroke:var(--g2Dark);stroke-width:2.2"/>')
    for t in range(3):
        a(f'<ellipse {T} cx="{215+dx*1.3}" cy="{92+k*6+t*12}" rx="4" ry="2.6" fill="var(--g2)"/>')

# ---------- pinboard with design sketches ----------
a(f'<path {S} d="M432 68 L556 64 L558 176 L434 180 Z" fill="var(--cork)"/>')
for k in range(40):
    a(f'<circle cx="{random.uniform(440,550)}" cy="{random.uniform(72,172)}" r=".9" fill="var(--line)" opacity=".25"/>')
cards = [(442, 76, -4, 'vase'), (500, 74, 5, 'jug'), (446, 126, 3, 'bowl'), (502, 124, -3, 'swatch')]
for cx_, cy_, rot, kind in cards:
    a(f'<g transform="rotate({rot} {cx_+24} {cy_+22})">')
    a(f'<rect {S} x="{cx_}" y="{cy_}" width="48" height="44" fill="var(--paper)"/>')
    if kind == 'swatch':
        for k, c in enumerate(('var(--g1)', 'var(--g3)', 'var(--g2)', 'var(--g4)', 'var(--g5)', 'var(--sun)')):
            a(f'<rect {T} x="{cx_+5+(k%3)*14}" y="{cy_+6+(k//3)*16}" width="11" height="12" fill="{c}"/>')
    else:
        a(f'<g opacity=".9">{pot(kind, cx_+24, cy_+38, 0.62 if kind != "bowl" else 0.9, "none", "wave")}</g>')
        a(f'<path {T} d="M{cx_+6} {cy_+8} l10 0" fill="none"/>')
    a('</g>')
    a(f'<circle {S} cx="{cx_+24}" cy="{cy_+3}" r="3" fill="var(--g3)"/>')
# calendar / order note
a(f'<g transform="rotate(-6 492 216)"><rect {S} x="462" y="196" width="60" height="42" fill="var(--paper)"/>')
a(f'<text x="470" y="212" font-family="\'Patrick Hand\', \'Comic Sans MS\', cursive" font-size="10" fill="var(--line)">Auftrag:</text>')
a(f'<text x="470" y="226" font-family="\'Patrick Hand\', \'Comic Sans MS\', cursive" font-size="10" fill="var(--line)">12× Becher</text>')
a(f'<path {T} d="M468 232 L512 232" fill="none"/></g>')
# clock
a(f'<circle {S} cx="600" cy="90" r="20" fill="var(--paper)"/>')
a(f'<path {S} d="M600 90 L600 76 M600 90 L610 94" fill="none"/>')
for k in range(12):
    import math
    ang = k * 30 * math.pi / 180
    a(f'<circle cx="{600+15*math.cos(ang)}" cy="{90+15*math.sin(ang)}" r="1.1" fill="var(--line)"/>')

# ---------- kiln (right) ----------
kx0, kx1, ky0, ky1 = 620, 780, 170, 370
a(f'<path d="M{kx0-14} {ky1} L{kx0-14} {ky0+40} Q{kx0-10} {ky0-20} {(kx0+kx1)/2} {ky0-22} L{kx1+14} {ky0} L{kx1+14} {ky1} Z" fill="url(#hatch)" opacity=".35"/>')
a(f'<path {S} d="M{kx0} {ky1} L{kx0} {ky0+50} Q{kx0} {ky0-10} {(kx0+kx1)/2} {ky0-12} Q{kx1} {ky0-10} {kx1} {ky0+50} L{kx1} {ky1} Z" fill="var(--kiln)"/>')
# bricks
rows = range(int(ky0+8), ky1-6, 16)
for ri, ry in enumerate(rows):
    off = 0 if ri % 2 == 0 else 15
    for bx in range(kx0 + 4 - off, kx1 - 10, 30):
        # clip to dome roughly
        cx = (kx0+kx1)/2
        if ry < ky0 + 50:
            import math
            half = (kx1-kx0)/2
            dy = (ky0 + 50 - ry) / 62
            lim = half * math.sqrt(max(0, 1 - dy*dy)) - 6
            if abs(bx + 13 - cx) > lim:
                continue
        if bx < kx0 + 2 or bx + 26 > kx1 - 2:
            continue
        shade = 'var(--kilnDark)' if random.random() < .35 else 'var(--kiln)'
        a(f'<rect {T} x="{j(bx,0.6)}" y="{j(ry,0.4)}" width="26" height="12" rx="2" fill="{shade}"/>')
# door arch
a(f'<path {S} d="M{kx0+38} {ky1} L{kx0+38} {ky1-70} Q{kx0+38} {ky1-110} {(kx0+kx1)/2} {ky1-110} Q{kx1-38} {ky1-110} {kx1-38} {ky1-70} L{kx1-38} {ky1} Z" fill="var(--kilnInside)"/>')
for k in range(7):
    import math
    ang = math.pi + k * math.pi / 6
    cx = (kx0+kx1)/2; cy = ky1-70
    a(f'<path {T} d="M{cx+42*math.cos(ang)} {cy+40*math.sin(ang)} L{cx+52*math.cos(ang)} {cy+50*math.sin(ang)}" fill="none"/>')
# glow + fire
cx = (kx0+kx1)/2
a(f'<ellipse cx="{cx}" cy="{ky1-24}" rx="40" ry="28" fill="var(--fire)" opacity=".35"/>')
a(f'<path {S} d="M{cx-28} {ky1-4} Q{cx-34} {ky1-30} {cx-18} {ky1-44} Q{cx-16} {ky1-26} {cx-6} {ky1-28} Q{cx-10} {ky1-54} {cx+6} {ky1-68} Q{cx+6} {ky1-42} {cx+16} {ky1-40} Q{cx+18} {ky1-56} {cx+26} {ky1-60} Q{cx+38} {ky1-30} {cx+28} {ky1-4} Z" fill="var(--fire)"/>')
a(f'<path d="M{cx-12} {ky1-6} Q{cx-14} {ky1-22} {cx-2} {ky1-32} Q{cx} {ky1-20} {cx+8} {ky1-24} Q{cx+16} {ky1-12} {cx+10} {ky1-6} Z" fill="var(--fireCore)"/>')
# logs inside
a(f'<path {S} d="M{cx-30} {ky1-2} L{cx+30} {ky1-12} L{cx+32} {ky1-4} L{cx-28} {ky1+4} Z" fill="var(--woodDark)"/>')
# chimney
a(f'<path {S} d="M{cx-14} {ky0-12} L{cx-16} {ky0-62} L{cx+16} {ky0-62} L{cx+14} {ky0-12} Z" fill="var(--kilnDark)"/>')
a(f'<path {S} d="M{cx-20} {ky0-62} L{cx+20} {ky0-62} L{cx+20} {ky0-70} L{cx-20} {ky0-70} Z" fill="var(--kiln)"/>')
for k, (sx, sy, r) in enumerate([(cx+4, ky0-84, 9), (cx+18, ky0-100, 12), (cx+8, ky0-122, 14), (cx+26, ky0-142, 10)]):
    a(f'<circle {S} cx="{sx}" cy="{sy}" r="{r}" fill="var(--smoke)"/>')
# thermometer dial
a(f'<circle {S} cx="{kx1-22}" cy="{ky0+60}" r="14" fill="var(--paper)"/>')
a(f'<path d="M{kx1-34} {ky0+62} A12 12 0 0 1 {kx1-10} {ky0+62}" stroke="var(--g3)" stroke-width="3" fill="none"/>')
a(f'<path {S} d="M{kx1-22} {ky0+62} L{kx1-14} {ky0+52}" fill="none"/>')
# firewood stack
for k, (lx, ly) in enumerate([(578, 362), (600, 362), (589, 344), (566, 344), (578, 326)]):
    a(f'<circle {S} cx="{lx}" cy="{ly}" r="10" fill="var(--wood)"/>')
    a(f'<circle {T} cx="{lx}" cy="{ly}" r="5" fill="none"/>')
    a(f'<circle cx="{lx}" cy="{ly}" r="1.4" fill="var(--line)"/>')

# ---------- workbench (centre-right) ----------
bx0, bx1, by = 470, 560, 300
a(f'<path {S} d="M{bx0} {by} L{bx1} {by} L{bx1} {by+10} L{bx0} {by+10} Z" fill="var(--wood)"/>')
a(f'<path {S} d="M{bx0+6} {by+10} L{bx0+4} {by+76} M{bx1-6} {by+10} L{bx1-4} {by+76} M{bx0+6} {by+52} L{bx1-6} {by+52}" fill="none"/>')
# tools jar
a(f'<path {S} d="M{bx0+10} {by} L{bx0+12} {by-26} L{bx0+30} {by-26} L{bx0+32} {by} Z" fill="var(--g1)"/>')
a(f'<path {S} d="M{bx0+16} {by-26} L{bx0+12} {by-48} M{bx0+21} {by-26} L{bx0+22} {by-52} M{bx0+26} {by-26} L{bx0+32} {by-46}" fill="none"/>')
a(f'<circle {S} cx="{bx0+12}" cy="{by-52}" r="4" fill="none"/>')
a(f'<path {S} d="M{bx0+19} {by-52} L{bx0+25} {by-52} L{bx0+24} {by-60} L{bx0+20} {by-60} Z" fill="var(--woodDark)"/>')
a(f'<path {S} d="M{bx0+30} {by-46} q4 -6 8 -2" fill="none"/>')
# rolling pin + sponge + clay block
a(f'<path {S} d="M{bx0+40} {by-4} L{bx1-12} {by-10} L{bx1-11} {by-1} L{bx0+41} {by+4} Z" fill="var(--wood)"/>')
a(f'<path {S} d="M{bx1-12} {by-6} L{bx1-2} {by-7}" fill="none"/>')
a(f'<path {S} d="M{bx0+42} {by-6} Q{bx0+56} {by-30} {bx0+74} {by-8} Z" fill="var(--clayRaw)"/>')
a(f'<path {S} d="M{bx1-26} {by-12} q8 -6 16 0 l-1 6 q-7 3 -14 0 Z" fill="var(--sun)"/>')
for k in range(4):
    a(f'<circle cx="{bx1-21+k*3.5}" cy="{by-12}" r=".9" fill="var(--line)"/>')

# ---------- clay sacks + glaze buckets (floor left) ----------
def sack(x, y, s, label):
    return (f'<path {S} d="M{x-22*s} {y} Q{x-28*s} {y-30*s} {x-18*s} {y-50*s} L{x-10*s} {y-56*s} Q{x} {y-50*s} {x+10*s} {y-58*s} L{x+18*s} {y-50*s} Q{x+28*s} {y-30*s} {x+22*s} {y} Z" fill="var(--sack)"/>'
            f'<path {T} d="M{x-12*s} {y-50*s} Q{x} {y-46*s} {x+12*s} {y-50*s}" fill="none"/>'
            f'<text x="{x}" y="{y-20*s}" text-anchor="middle" font-family="\'Patrick Hand\', \'Comic Sans MS\', cursive" font-size="{12*s}" fill="var(--line)">{label}</text>')
a(sack(40, 452, 1.0, 'TON'))
a(sack(84, 462, 0.9, 'Kaolin'))
def bucket(x, y, col):
    return (f'<path {S} d="M{x-14} {y} L{x-17} {y-30} L{x+17} {y-30} L{x+14} {y} Z" fill="var(--bucket)"/>'
            f'<ellipse {S} cx="{x}" cy="{y-30}" rx="17" ry="4.5" fill="{col}"/>'
            f'<path {S} d="M{x-8} {y-30} Q{x-9} {y-20} {x-7} {y-17} Q{x-5} {y-20} {x-6} {y-30} M{x+6} {y-30} L{x+6} {y-24} Q{x+8} {y-21} {x+9} {y-30}" fill="{col}"/>'
            f'<path {T} d="M{x-17} {y-30} Q{x} {y-56} {x+17} {y-30}" fill="none"/>')
a(bucket(140, 478, 'var(--g1)'))
a(bucket(180, 486, 'var(--g3)'))
a(bucket(220, 482, 'var(--g2)'))
# broken shard
a(f'<path {S} d="M246 500 l10 -6 l6 8 l-12 4 Z" fill="var(--g4)"/>')

# ---------- potter + wheel ----------
# wheel bench
a(f'<path d="M300 440 Q380 452 470 440 Q470 460 380 462 Q300 460 300 440 Z" fill="url(#hatch)" opacity=".5"/>')
a(f'<path {S} d="M330 380 L450 380 L444 430 L336 430 Z" fill="var(--wood)"/>')
a(f'<path {T} d="M340 392 L380 391 M400 404 L438 403 M346 418 L372 417" fill="none"/>')
a(f'<path {S} d="M342 430 L338 448 M438 430 L442 448" fill="none"/>')
a(f'<path {S} d="M326 372 Q390 360 454 372 L454 384 Q390 394 326 384 Z" fill="var(--wheelTray)"/>')
a(f'<ellipse {S} cx="390" cy="372" rx="44" ry="10" fill="var(--woodDark)"/>')
a(f'<path {T} d="M360 370 q10 4 20 0 M396 372 q10 4 22 -1" fill="none"/>')
# clay on wheel
a(f'<path {S} d="M368 370 Q360 340 374 322 Q382 312 379 300 L401 300 Q398 312 406 322 Q420 340 412 370 Z" fill="var(--clay)"/>')
a(f'<ellipse {S} cx="390" cy="300" rx="11" ry="3" fill="var(--clayDark)"/>')
a(f'<path {T} d="M370 336 Q390 342 410 336 M366 352 Q390 358 414 352" fill="none"/>')
# motion lines
a(f'<path {T} d="M330 348 Q322 360 332 370 M450 348 Q458 360 448 370 M320 340 Q308 358 322 374" fill="none"/>')
# splatter
for k in range(6):
    a(f'<circle cx="{random.uniform(310,470)}" cy="{random.uniform(440,456)}" r="{random.uniform(1.4,3)}" fill="var(--clay)"/>')
# stool
a(f'<path {S} d="M240 432 L310 432 L306 442 L244 442 Z" fill="var(--wood)"/>')
a(f'<path {S} d="M250 442 L244 480 M300 442 L306 480 M248 464 L302 464" fill="none"/>')
# potter body
a(f'<path {S} d="M246 434 Q236 360 276 340 Q316 356 312 434 Z" fill="var(--shirt)"/>')
a(f'<path {S} d="M256 368 L300 366 Q304 404 302 434 L254 434 Q252 402 256 368 Z" fill="var(--apron)"/>')
a(f'<path {S} d="M264 392 L292 392 L291 410 L265 410 Z" fill="var(--apronPocket)"/>')
a(f'<path {T} d="M262 368 L272 344 M296 366 L286 344" fill="none"/>')
# apron clay smudges
for sx, sy in [(270, 380), (288, 420), (262, 424)]:
    a(f'<ellipse cx="{sx}" cy="{sy}" rx="4" ry="2.5" fill="var(--clay)" opacity=".8"/>')
# pencil in pocket
a(f'<path {S} d="M285 392 L289 380 L292 381 L288 393" fill="var(--sun)"/>')
# arms reaching to the clay
a(f'<path d="M298 366 Q330 368 366 344" style="stroke:var(--line);stroke-width:calc(var(--lw) + 9);stroke-linecap:round" fill="none"/>')
a(f'<path d="M298 366 Q330 368 366 344" style="stroke:var(--shirt);stroke-width:9;stroke-linecap:round" fill="none"/>')
a(f'<circle {S} cx="368" cy="342" r="7" fill="var(--skin)"/>')
a(f'<path d="M282 380 Q330 392 372 360" style="stroke:var(--line);stroke-width:calc(var(--lw) + 9);stroke-linecap:round" fill="none"/>')
a(f'<path d="M282 380 Q330 392 372 360" style="stroke:var(--shirt);stroke-width:9;stroke-linecap:round" fill="none"/>')
a(f'<circle {S} cx="373" cy="358" r="7" fill="var(--skin)"/>')
# legs + shoes
a(f'<path {S} d="M262 434 L258 484 L276 484 L278 434 Z" fill="var(--pants)"/>')
a(f'<path {S} d="M286 434 L292 482 L308 482 L302 434 Z" fill="var(--pants)"/>')
a(f'<path {S} d="M252 486 Q252 478 266 478 L280 480 Q284 490 268 490 Z" fill="var(--shoe)"/>')
a(f'<path {S} d="M288 484 Q288 476 302 476 L314 478 Q318 488 302 488 Z" fill="var(--shoe)"/>')
# head
a(f'<circle {S} cx="276" cy="306" r="34" fill="var(--skin)"/>')
a(f'<path {S} d="M243 300 Q244 262 280 266 Q314 266 312 300 Q300 286 286 292 Q276 280 262 290 Q252 288 243 300 Z" fill="var(--hair)"/>')
a(f'<path {T} d="M256 278 q8 -6 18 -4 M276 274 q10 -2 22 6" fill="none"/>')
# headscarf
a(f'<path {S} d="M246 290 Q276 270 310 288 L312 296 Q278 280 244 298 Z" fill="var(--g3)"/>')
a(f'<path {S} d="M246 294 L232 300 L238 288 Z M246 294 L234 290 L240 302 Z" fill="var(--g3)"/>')
for k in range(5):
    a(f'<circle cx="{254+k*12}" cy="{288-k*0.6}" r="1.4" fill="#fff" opacity=".9"/>')
# ear
a(f'<path {S} d="M246 306 q-8 2 -4 12 q4 2 6 -2" fill="var(--skin)"/>')
# face (looking at the pot)
a(f'<path d="M282 308 q4 -4 8 0" stroke="var(--line)" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
a(f'<path d="M298 306 q4 -4 8 0" stroke="var(--line)" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
a(f'<ellipse cx="282" cy="320" rx="6" ry="3.4" fill="var(--cheek)" opacity=".75"/>')
a(f'<ellipse cx="306" cy="318" rx="4.6" ry="3" fill="var(--cheek)" opacity=".75"/>')
a(f'<path d="M292 322 q4 4 8 0" stroke="var(--line)" stroke-width="2" fill="none" stroke-linecap="round"/>')
a(f'<path {T} d="M262 318 l-3 -1 M262 322 l-3 1" fill="none"/>')
# freckles
for fx, fy in [(286, 316), (289, 318), (303, 314)]:
    a(f'<circle cx="{fx}" cy="{fy}" r=".9" fill="var(--line)" opacity=".5"/>')

# ---------- cat on rug ----------
ccx, ccy = 560, 488
a(f'<ellipse cx="{ccx}" cy="{ccy+6}" rx="44" ry="7" fill="url(#hatch)" opacity=".5"/>')
a(f'<path {S} d="M{ccx-40} {ccy} Q{ccx-44} {ccy-34} {ccx-6} {ccy-38} Q{ccx+38} {ccy-38} {ccx+38} {ccy-6} Q{ccx+38} {ccy+4} {ccx} {ccy+4} Q{ccx-38} {ccy+4} {ccx-40} {ccy} Z" fill="var(--cat)"/>')
a(f'<path {T} d="M{ccx-6} {ccy-34} q4 8 0 16 M{ccx+8} {ccy-34} q4 8 0 16 M{ccx+20} {ccy-30} q3 6 0 12" fill="none"/>')
a(f'<path {S} d="M{ccx-34} {ccy-22} L{ccx-36} {ccy-42} L{ccx-22} {ccy-32} Z" fill="var(--cat)"/>')
a(f'<path {S} d="M{ccx-14} {ccy-34} L{ccx-8} {ccy-50} L{ccx-2} {ccy-32} Z" fill="var(--cat)"/>')
a(f'<path d="M{ccx-33} {ccy-28} L{ccx-34} {ccy-37} L{ccx-27} {ccy-31} Z" fill="var(--cheek)"/>')
a(f'<path d="M{ccx-30} {ccy-16} q4 3 8 0 M{ccx-18} {ccy-18} q4 3 8 0" stroke="var(--line)" stroke-width="1.8" fill="none" stroke-linecap="round"/>')
a(f'<path d="M{ccx-21} {ccy-11} l-2 2 l-2 -2" stroke="var(--line)" stroke-width="1.4" fill="none"/>')
a(f'<ellipse cx="{ccx-32}" cy="{ccy-9}" rx="3.4" ry="2" fill="var(--cheek)" opacity=".8"/>')
a(f'<path {T} d="M{ccx-40} {ccy-10} l-10 -2 M{ccx-40} {ccy-6} l-10 2" fill="none"/>')
a(f'<path {S} d="M{ccx+36} {ccy-4} Q{ccx+62} {ccy-2} {ccx+56} {ccy-24} Q{ccx+52} {ccy-32} {ccx+46} {ccy-26}" fill="none"/>')
a(f'<path {S} d="M{ccx-26} {ccy+2} q4 4 10 0 M{ccx-6} {ccy+2} q4 4 10 0" fill="var(--cat)"/>')
a(f'<text x="{ccx+20}" y="{ccy-52}" font-family="\'Patrick Hand\', \'Comic Sans MS\', cursive" font-size="16" fill="var(--line)" opacity=".7">z</text>')
a(f'<text x="{ccx+32}" y="{ccy-66}" font-family="\'Patrick Hand\', \'Comic Sans MS\', cursive" font-size="12" fill="var(--line)" opacity=".55">z</text>')
a(f'<text x="{ccx+40}" y="{ccy-78}" font-family="\'Patrick Hand\', \'Comic Sans MS\', cursive" font-size="9" fill="var(--line)" opacity=".4">z</text>')
# yarn ball / clay ball near cat
a(f'<circle {S} cx="{ccx+70}" cy="{ccy}" r="9" fill="var(--g1)"/>')
a(f'<path {T} d="M{ccx+63} {ccy-4} q7 4 14 -2 M{ccx+64} {ccy+4} q7 2 13 -4" fill="none"/>')
a(f'<path {T} d="M{ccx+78} {ccy+4} q10 6 20 2" fill="none"/>')

# broom leaning on wall
a(f'<path {S} d="M214 370 L236 230" fill="none" style="stroke:var(--woodDark);stroke-width:5"/>')
a(f'<path {S} d="M214 370 L236 230" fill="none"/>')
a(f'<path {S} d="M200 376 L206 340 L224 344 L230 380 Z" fill="var(--sun)"/>')
a(f'<path {T} d="M208 372 L212 346 M216 374 L218 346 M224 376 L222 346" fill="none"/>')

print('\n'.join(out))
