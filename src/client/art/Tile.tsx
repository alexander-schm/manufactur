/**
 * A glazed tile: a square slab seen slightly from above (like Plate), its face decorated in the classic
 * corner-and-centre manner. The face pattern is drawn on a flat square and foreshortened by FORESHORTEN.
 */
import { useId } from 'preact/hooks';
import { mix } from '../../shared/discovery';
import type { BodyId, Design } from '../../shared/types';
import { inkStyle } from './ink';
import { Effect, Glow, Mark, SILHOUETTE_FILL, SILHOUETTE_INK, Scales, Sparkle, Speckles, bodyLook, pieceSeed, type PotProps } from './Pot';
import { BASE_Y, CX } from './potShape';

const FORESHORTEN = 0.76;
const f1 = (n: number) => n.toFixed(1);

/** Decoration on the flat face, centred on (0, 0) with half side S. */
function FacePattern({ kind, c, S, seed }: { kind: Design['pattern']; c: string; S: number; seed: number }) {
  const st = { stroke: c, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  switch (kind) {
    case 'stripes': {
      const a = S * 0.8, b = S * 0.64;
      return <g style={st}><rect x={f1(-a)} y={f1(-a)} width={f1(2 * a)} height={f1(2 * a)} stroke-width="2.6" /><rect x={f1(-b)} y={f1(-b)} width={f1(2 * b)} height={f1(2 * b)} stroke-width="1.3" /></g>;
    }
    case 'dots':
      return (
        <g fill={c}>
          {corners.map(([u, v]) => <circle cx={f1(u * S * 0.72)} cy={f1(v * S * 0.72)} r="3" />)}
          {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <circle cx={f1(Math.cos(a) * S * 0.36)} cy={f1(Math.sin(a) * S * 0.36)} r="2.2" />; })}
          <circle cx="0" cy="0" r="3.4" />
        </g>
      );
    case 'waves':
      return (
        <g style={{ ...st, strokeWidth: 2.4 }}>
          {[-0.5, 0, 0.5].map((v) => {
            let d = `M${f1(-S)} ${f1(v * S)}`;
            const n = 5, step = (2 * S) / n;
            for (let i = 0; i < n; i++) d += ` q${f1(step / 2)} ${i % 2 ? 6 : -6} ${f1(step)} 0`;
            return <path d={d} />;
          })}
        </g>
      );
    case 'leaves':
      return (
        <g fill={c}>
          {[45, 135, 225, 315].map((deg) => <path d={`M0 ${f1(-S * 0.14)} Q${f1(S * 0.1)} ${f1(-S * 0.42)} 0 ${f1(-S * 0.62)} Q${f1(-S * 0.1)} ${f1(-S * 0.42)} 0 ${f1(-S * 0.14)} Z`} transform={`rotate(${deg})`} opacity="0.85" />)}
          {[0, 90, 180, 270].map((deg) => <ellipse cx="0" cy={f1(-S * 0.24)} rx={f1(S * 0.15)} ry={f1(S * 0.2)} transform={`rotate(${deg})`} />)}
          {corners.map(([u, v]) => <path d={`M${f1(u * S)} ${f1(v * S * 0.55)} Q${f1(u * S * 0.6)} ${f1(v * S * 0.6)} ${f1(u * S * 0.55)} ${f1(v * S)} Q${f1(u * S * 0.85)} ${f1(v * S * 0.85)} ${f1(u * S)} ${f1(v * S * 0.55)} Z`} />)}
          <circle cx="0" cy="0" r={f1(S * 0.11)} fill="#fff8ec" stroke={c} stroke-width="1.6" />
        </g>
      );
    case 'ranken':
      return (
        <g>
          <circle cx="0" cy="0" r={f1(S * 0.34)} style={{ ...st, strokeWidth: 1.8 }} />
          {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + (seed % 2) * 0.5; return <ellipse cx={f1(Math.cos(a) * S * 0.34)} cy={f1(Math.sin(a) * S * 0.34)} rx="1.8" ry="3.6" transform={`rotate(${f1((a * 180) / Math.PI)} ${f1(Math.cos(a) * S * 0.34)} ${f1(Math.sin(a) * S * 0.34)})`} fill={c} />; })}
          {corners.map(([u, v]) => (
            <path d={`M${f1(u * S)} ${f1(v * S * 0.45)} Q${f1(u * S * 0.62)} ${f1(v * S * 0.62)} ${f1(u * S * 0.45)} ${f1(v * S)} M${f1(u * S * 0.66)} ${f1(v * S * 0.66)} q${f1(-u * 4)} ${f1(-v * 1)} ${f1(-u * 4.5)} ${f1(-v * 5)} q${f1(u * 0.5)} ${f1(-v * 2.5)} ${f1(u * 2.6)} ${f1(-v * 1)}`} style={{ ...st, strokeWidth: 1.6 }} />
          ))}
        </g>
      );
    case 'karo': {
      const n = 6, q = (2 * S * 0.84) / n, o = -S * 0.84;
      const cells = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2 === 0) cells.push(<rect x={f1(o + i * q)} y={f1(o + j * q)} width={f1(q)} height={f1(q)} />);
      return <g fill={c}>{cells}</g>;
    }
    case 'schuppen': {
      const r = S * 0.17;
      return <Scales x0={-S - r} x1={S} y0={-S + r * 0.2} rows={Math.ceil((2 * S) / (r * 1.15)) + 1} r={r} color={c} />;
    }
    default:
      return null;
  }
}

export function Tile({ design, glazeColor, effect, size = 96, mark, quality, wobble = true, fit = false, x, y, height, class: cls, title, silhouette }: PotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const body: BodyId = design.body ?? 'irdenware';
  const look = bodyLook(body);
  const seed = pieceSeed(design);
  const p = design.profile;
  const S = 25 + p.rim * 8 + p.belly * 3;
  const t = 3.5 + p.height * 10;
  const k = FORESHORTEN;
  const half = S * k;
  const cy = BASE_Y - 2 - t - half;
  const l = CX - S, r = CX + S, back = cy - half, front = cy + half;
  const face = `M${f1(l)} ${f1(back)} L${f1(r)} ${f1(back)} L${f1(r)} ${f1(front)} L${f1(l)} ${f1(front)} Z`;
  const edge = `M${f1(l)} ${f1(front)} L${f1(r)} ${f1(front)} L${f1(r - 0.6)} ${f1(front + t)} L${f1(l + 0.6)} ${f1(front + t)} Z`;
  let viewBox = '-10 -8 120 110';
  if (fit) {
    const top = back - 10;
    const hw = Math.max(S + 10, (BASE_Y + 8 - top) / 2);
    viewBox = `${f1(CX - hw)} ${f1(top)} ${f1(hw * 2)} ${f1(Math.max(BASE_Y + 8 - top, hw * 1.2))}`;
  }
  const box = { x, y, width: size, height: height ?? size };
  const clip = `tc-${uid}`;
  const glazeTop = effect === 'seladon' ? mix(glazeColor, '#d8f0d8', 0.3) : glazeColor;
  const shadow = <path d={`M${f1(l + 5)} ${f1(back + 7)} L${f1(r + 5)} ${f1(back + 7)} L${f1(r + 5)} ${f1(front + t + 3)} L${f1(l + 5)} ${f1(front + t + 3)} Z`} fill="url(#hatch)" opacity={silhouette ? 0.3 : 0.45} />;
  return (
    <svg viewBox={viewBox} {...box} class={cls} role="img" aria-label={title ?? (silhouette ? 'Unbekannt' : 'Fliese')} data-pot data-tile data-path={face} data-body={body} data-silhouette={silhouette ? true : undefined}>
      {title && <title>{title}</title>}
      <g filter={wobble ? 'url(#wobble-soft)' : undefined}>
        {!silhouette && look.glow && <Glow cx={CX} cy={cy + t / 2} rx={S + 11} ry={half + t + 10} />}
        {shadow}
        {silhouette ? (
          <g>
            <path d={edge} fill={SILHOUETTE_FILL} opacity="0.55" style={SILHOUETTE_INK} />
            <path d={face} fill={SILHOUETTE_FILL} fill-opacity="0.45" style={SILHOUETTE_INK} />
          </g>
        ) : (
          <g>
            <path d={edge} fill={look.speckles ? mix(look.foot, '#2b2420', 0.1) : look.foot} style={inkStyle(1.8)} />
            <path d={`M${f1(l + 2)} ${f1(front + 1.6)} L${f1(r - 2)} ${f1(front + 1.6)}`} stroke={mix(glazeColor, '#2b2420', 0.15)} stroke-width="2.2" />
            <defs><clipPath id={clip}><path d={face} /></clipPath></defs>
            <path d={face} fill={glazeTop} />
            <g clip-path={`url(#${clip})`}>
              {effect && <Effect s={{ body: '', rim: { cx: CX, cy, rx: S, ry: half }, footY: 100, bandY: cy, bandHalfWidth: S, topY: back, maxHalfWidth: S }} effect={effect} seed={seed} base={glazeColor} />}
              <g transform={`translate(${CX} ${f1(cy)}) scale(1 ${k})`}>
                <FacePattern kind={design.pattern} c={design.patternColor} S={S} seed={seed} />
              </g>
              {look.speckles && <Speckles seed={seed} x={l} y={back} w={2 * S} h={2 * half} />}
              <path d={`M${f1(l + 1.5)} ${f1(front - 1.2)} L${f1(l + 1.5)} ${f1(back + 1.5)} L${f1(r - 1.5)} ${f1(back + 1.5)}`} fill="none" stroke="#fff" stroke-width="1.6" opacity="0.5" />
              <path d={`M${f1(l + S * 0.25)} ${f1(back + half * 0.35)} L${f1(l + S * 0.7)} ${f1(back + half * 0.18)}`} stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.55" />
            </g>
            <path d={face} fill="none" style={inkStyle(2)} />
            {quality === 3 && <Sparkle x={r - S * 0.3} y={back + 3} />}
            {mark && <Mark mark={mark} x={r - S * 0.24} y={front - half * 0.32} scale={0.62} />}
          </g>
        )}
      </g>
    </svg>
  );
}
