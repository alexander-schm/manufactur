/**
 * Porcelain figurines: a sitting cat, an owl and a hedgehog, drawn around the pot frame (centre x 50, base y 96).
 * Each animal is a stack of glazed shapes; every shape gets the glaze, effect, pattern band and body look clipped to it,
 * then its own ink line, so later shapes (the head) cleanly cover earlier ones (the body).
 */
import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { mix } from '../../shared/discovery';
import type { BodyId } from '../../shared/types';
import { inkStyle } from './ink';
import { Effect, Glow, Mark, Pattern, SILHOUETTE_FILL, SILHOUETTE_INK, Sparkle, Speckles, bodyLook, pieceSeed, type PotProps } from './Pot';
import { BASE_Y, CX, type PotShape } from './potShape';

type Shape = { d: string; tone?: 'dark' | 'light'; /** drawn on the fresh glaze, under pattern and effect */ under?: ComponentChildren; /** drawn after this shape's ink line */ over?: ComponentChildren };

interface Animal {
  shapes: Shape[];
  /** drawn behind everything (a tail), stroked like a handle */
  tail?: string;
  face: ComponentChildren;
  /** pattern band: y and half width */
  band: [number, number];
  /** extent before scaling: left, right, top */
  box: [number, number, number];
  mark: [number, number];
  shine: string;
  sparkle: [number, number];
}

const LINE = 'var(--line)';
const CHEEK = 'var(--cheek)';

function Eye({ x, y, rx = 2.5, ry = 3 }: { x: number; y: number; rx?: number; ry?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={LINE} />
      <circle cx={x + rx * 0.35} cy={y - ry * 0.4} r={rx * 0.38} fill="#fff" />
    </g>
  );
}

function cat(): Animal {
  const ear = (f: 1 | -1) => `M${CX - 17.5 * f} 46 Q${CX - 21 * f} 30 ${CX - 18.5 * f} 28.5 Q${CX - 16 * f} 28 ${CX - 5 * f} 36.5 Z`;
  const innerEar = (f: 1 | -1) => <path d={`M${CX - 15.5 * f} 41 Q${CX - 17.6 * f} 33 ${CX - 16.4 * f} 32.2 Q${CX - 14.6 * f} 32.4 ${CX - 9.5 * f} 36.6 Z`} fill={CHEEK} opacity="0.7" />;
  return {
    tail: 'M64 92 C80 95 87 84 83 74 C81 68 75 67 74 72',
    shapes: [
      { d: ear(1), over: innerEar(1) },
      { d: ear(-1), over: innerEar(-1) },
      { d: 'M50 60 C64 60 71 74 70 86 C70 92 66 96 60 96 L40 96 C34 96 30 92 30 86 C29 74 36 60 50 60 Z' },
      { d: 'M38 96 C36.5 89.5 46.5 89.5 46 96 Z' },
      { d: 'M54 96 C53.5 89.5 63.5 89.5 62 96 Z' },
      { d: 'M50 34 C63 34 71 41 71 51 C71 61 62 67 50 67 C38 67 29 61 29 51 C29 41 37 34 50 34 Z' },
    ],
    face: (
      <g>
        <ellipse cx="36.5" cy="57.5" rx="3.6" ry="2.1" fill={CHEEK} opacity="0.6" />
        <ellipse cx="63.5" cy="57.5" rx="3.6" ry="2.1" fill={CHEEK} opacity="0.6" />
        <Eye x={42} y={51.5} />
        <Eye x={58} y={51.5} />
        <path d="M48.2 55.6 L51.8 55.6 L50 57.6 Z" fill="#e58a9a" style={inkStyle(0.7)} />
        <path d="M50 57.6 Q49 59.9 46.8 59 M50 57.6 Q51 59.9 53.2 59" fill="none" style={inkStyle(0.9)} />
        <path d="M31 54.5 L24 53 M31 57.5 L24 58.5 M69 54.5 L76 53 M69 57.5 L76 58.5" fill="none" style={{ ...inkStyle(0.8), opacity: 0.6 }} />
        <path d="M41.5 93 l0 2.4 M44 93 l0 2.4 M56 93 l0 2.4 M58.5 93 l0 2.4" fill="none" style={{ ...inkStyle(0.7), opacity: 0.55 }} />
      </g>
    ),
    band: [80, 19],
    box: [23, 89, 28],
    mark: [61, 83],
    shine: 'M36 81 Q34.5 71 40 65.5',
    sparkle: [64, 40],
  };
}

function owl(): Animal {
  const wing = (f: 1 | -1) => `M${CX - 19 * f} 58 C${CX - 26 * f} 66 ${CX - 25 * f} 82 ${CX - 16 * f} 90 C${CX - 13 * f} 80 ${CX - 13 * f} 66 ${CX - 19 * f} 58 Z`;
  const feathers = (
    <g fill="none" style={{ ...inkStyle(0.8), opacity: 0.4 }}>
      {[[44, 74], [50, 74], [56, 74], [47, 80], [53, 80], [44, 86], [50, 86], [56, 86]].map(([x, y]) => <path d={`M${x - 2} ${y} Q${x} ${y + 2.4} ${x + 2} ${y}`} />)}
    </g>
  );
  return {
    shapes: [
      {
        d: 'M50 38 C58 38 63 36 67 31 C69 36 70 40 69 44 C73 52 74 66 72 78 C70 90 62 96 50 96 C38 96 30 90 28 78 C26 66 27 52 31 44 C30 40 31 36 33 31 C37 36 42 38 50 38 Z',
        under: <ellipse cx="50" cy="80" rx="13.5" ry="14" fill="#fff" opacity="0.3" />,
        over: feathers,
      },
      { d: wing(1), tone: 'dark' },
      { d: wing(-1), tone: 'dark' },
    ],
    face: (
      <g>
        <path d="M33.5 43 Q41 39.5 48 45 M66.5 43 Q59 39.5 52 45" fill="none" style={{ ...inkStyle(1.2), opacity: 0.75 }} />
        <ellipse cx="34.5" cy="60" rx="3" ry="1.8" fill={CHEEK} opacity="0.6" />
        <ellipse cx="65.5" cy="60" rx="3" ry="1.8" fill={CHEEK} opacity="0.6" />
        {[41, 59].map((x) => (
          <g>
            <circle cx={x} cy="51.5" r="8.2" fill="#fffaf0" style={inkStyle(1.5)} />
            <circle cx={x + (x < 50 ? 0.8 : -0.8)} cy="52.3" r="4.2" fill={LINE} />
            <circle cx={x + (x < 50 ? 2.2 : 0.6)} cy="50.6" r="1.5" fill="#fff" />
          </g>
        ))}
        <path d="M47.4 57.5 Q50 56.4 52.6 57.5 L50 62.5 Z" fill="var(--g5)" style={inkStyle(1)} />
        {[43.5, 56.5].map((x) => <path d={`M${x - 3.6} 96.6 q1.2 -3 2.4 0 q1.2 -3 2.4 0 q1.2 -3 2.4 0 Z`} fill="var(--g5)" style={inkStyle(0.9)} />)}
      </g>
    ),
    band: [70, 22],
    box: [24, 76, 31],
    mark: [57, 89],
    shine: 'M33 72 Q32 58 37 50',
    sparkle: [68, 40],
  };
}

/** Spike outline of the hedgehog's back: alternating base and tip points along an arc over (57, 96). */
function spikes(): string {
  const n = 13, cx = 57, cy = 96;
  const pts: string[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI * (0.86 - (0.86 * i) / (n * 2));
    const tip = i % 2 === 1;
    const r = tip ? 37 : 30.5;
    const lean = tip ? -0.08 : 0; // tips point a little backwards
    const x = cx + r * Math.cos(a + lean), y = cy - r * Math.sin(a + lean) * 1.08;
    pts.push(`${x.toFixed(2)} ${Math.min(96, y).toFixed(2)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(' L')} L${cx + 28} 96 L36 96 Z`;
}

function hedgehog(): Animal {
  const quills = [[60, 72], [70, 76], [52, 70], [64, 82], [76, 86], [56, 84], [46, 76], [70, 90]];
  return {
    shapes: [
      { d: spikes(), tone: 'dark', over: <g fill="none" style={{ ...inkStyle(0.9), opacity: 0.45 }}>{quills.map(([x, y]) => <path d={`M${x} ${y} l3.5 -3`} />)}</g> },
      {
        d: 'M46 96 C34 97 22 94 15 88 C11 85 11 81 15 80 C22 78 27 69 36 66 C43 64 49 68 50 75 C51 84 50 92 46 96 Z',
        tone: 'light',
        over: (
          <g>
            <circle cx="42" cy="67.5" r="3.6" fill="currentColor" style={inkStyle(1.2)} />
            <circle cx="42" cy="67.8" r="1.6" fill={CHEEK} opacity="0.75" />
          </g>
        ),
      },
    ],
    face: (
      <g>
        <ellipse cx="33" cy="85" rx="3.4" ry="2" fill={CHEEK} opacity="0.6" />
        <Eye x={29} y={78.5} rx={2.4} ry={2.8} />
        <circle cx="12.6" cy="83.4" r="2.7" fill={LINE} />
        <circle cx="11.8" cy="82.4" r="0.8" fill="#fff" />
        <path d="M18.5 88 Q22 90.6 25.5 88.6" fill="none" style={inkStyle(0.9)} />
        {[30, 66].map((x) => <ellipse cx={x} cy="96" rx="4" ry="2" fill={LINE} opacity="0.8" />)}
      </g>
    ),
    band: [84, 26],
    box: [10, 95, 56],
    mark: [69, 87],
    shine: 'M66 69 Q76 72 82 81',
    sparkle: [80, 64],
  };
}

const ANIMALS: Record<string, () => Animal> = { katze: cat, eule: owl, igel: hedgehog };

/** Body look scale: porcelain figurines come out a touch daintier, stoneware a touch sturdier. */
const BODY_SCALE: Record<BodyId, number> = { irdenware: 1, steinzeug: 1.04, porzellan: 0.95 };

export const figureVariant = (v: string | undefined) => (v && Object.hasOwn(ANIMALS, v) ? v : 'katze');

export function Figure({ design, glazeColor, effect, size = 96, mark, quality, wobble = true, fit = false, x, y, height, class: cls, title, silhouette }: PotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const variant = figureVariant(design.variant);
  const a = ANIMALS[variant]();
  const body: BodyId = design.body ?? 'irdenware';
  const look = bodyLook(body);
  const seed = pieceSeed(design);
  const p = design.profile;
  const k = BODY_SCALE[body] ?? 1;
  const sx = (0.86 + p.belly * 0.24) * k, sy = (0.85 + p.height * 0.3) * k;
  const X = (v: number) => CX + (v - CX) * sx, Y = (v: number) => BASE_Y - (BASE_Y - v) * sy;
  const [left, right, top] = a.box;
  let viewBox = '-10 -8 120 110';
  if (fit) {
    const t = Y(top) - 8;
    const half = Math.max(Math.max(CX - X(left), X(right) - CX) + 8, (BASE_Y + 8 - t) / 2);
    viewBox = `${(CX - half).toFixed(1)} ${t.toFixed(1)} ${(half * 2).toFixed(1)} ${Math.max(BASE_Y + 8 - t, half * 1.2).toFixed(1)}`;
  }
  const transform = `translate(${CX} ${BASE_Y}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-CX} ${-BASE_Y})`;
  const box = { x, y, width: size, height: height ?? size };
  const sil = silhouette ? true : undefined;
  const glazeTop = effect === 'seladon' ? mix(glazeColor, '#d8f0d8', 0.3) : glazeColor;
  const fillOf = (sh: Shape) => (sh.tone === 'dark' ? mix(glazeTop, '#2b2420', 0.16) : sh.tone === 'light' ? mix(glazeTop, '#ffffff', 0.22) : glazeTop);
  const [bandY, bandW] = a.band;
  const ps: PotShape = { body: '', rim: { cx: CX, cy: top, rx: 1, ry: 1 }, footY: 93.5, bandY, bandHalfWidth: bandW, topY: top, maxHalfWidth: (right - left) / 2 };
  const footD = 'M0 93.5 q12 -1.2 25 0 t25 0 t25 0 t25 0 V100 H0 Z';
  return (
    <svg viewBox={viewBox} {...box} class={cls} role="img" aria-label={title ?? (silhouette ? 'Unbekannt' : 'Figur')} data-pot data-figure data-variant={variant} data-path={`${variant} ${sx.toFixed(3)} ${sy.toFixed(3)}`} data-body={body} data-silhouette={sil}>
      {title && <title>{title}</title>}
      <g filter={wobble ? 'url(#wobble-soft)' : undefined}>
        <g transform={transform}>
          {!silhouette && look.glow && <Glow cx={(left + right) / 2} cy={(top + BASE_Y) / 2} rx={(right - left) / 2 + 9} ry={(BASE_Y - top) / 2 + 9} />}
          <ellipse cx={(left + right) / 2} cy={BASE_Y + 1.5} rx={(right - left) / 2} ry="4" fill="url(#hatch)" opacity={silhouette ? 0.3 : 0.45} />
          {silhouette ? (
            <g>
              {a.tail && <path d={a.tail} fill="none" style={SILHOUETTE_INK} />}
              {a.shapes.map((sh) => <path d={sh.d} fill={SILHOUETTE_FILL} fill-opacity="0.45" style={SILHOUETTE_INK} />)}
            </g>
          ) : (
            <g>
              {a.tail && <path d={a.tail} fill="none" style={{ ...inkStyle(8.5), strokeLinecap: 'round' }} />}
              {a.tail && <path d={a.tail} fill="none" stroke={glazeTop} stroke-width="5" stroke-linecap="round" />}
              {a.shapes.map((sh, i) => {
                const clip = `fc-${uid}-${i}`;
                return (
                  <g style={{ color: fillOf(sh) }}>
                    <defs><clipPath id={clip}><path d={sh.d} /></clipPath></defs>
                    <path d={sh.d} fill={fillOf(sh)} />
                    <g clip-path={`url(#${clip})`}>
                      {sh.under}
                      {effect && <Effect s={ps} effect={effect} seed={seed} base={glazeColor} />}
                      <Pattern s={ps} kind={design.pattern} color={design.patternColor} seed={seed} />
                      {look.speckles && <Speckles seed={seed + i} x={left} y={top} w={right - left} h={BASE_Y - top} />}
                      <path d={footD} fill={look.foot} />
                      <path d="M0 93.5 q12 -1.2 25 0 t25 0 t25 0 t25 0" fill="none" stroke={mix(glazeColor, '#2b2420', 0.35)} stroke-width="1" />
                    </g>
                    <path d={sh.d} fill="none" style={inkStyle(1.9)} />
                    {sh.over}
                  </g>
                );
              })}
              <path d={a.shine} stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55" />
              {a.face}
              {quality === 3 && <Sparkle x={a.sparkle[0]} y={a.sparkle[1]} />}
              {mark && <Mark mark={mark} x={a.mark[0]} y={a.mark[1]} scale={0.62} />}
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
