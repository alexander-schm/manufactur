import type { CSSProperties } from 'preact';
import { useId } from 'preact/hooks';
import { mix } from '../../shared/discovery';
import { hashSeed } from '../../shared/rng';
import type { BodyId, Design, MakerMark } from '../../shared/types';
import { inkStyle } from './ink';
import { Figure } from './Figure';
import { MarkFrame } from './markFrame';
import { BASE_Y, CX, potShape, type PotShape } from './potShape';
import { Tile } from './Tile';

export type PotProps = {
  design: Pick<Design, 'form' | 'profile' | 'handle' | 'rim' | 'pattern' | 'patternColor'> & { id?: string; body?: BodyId; variant?: string };
  glazeColor: string;
  effect?: string | null;
  size?: number | string;
  mark?: MakerMark | null;
  /** quality tier: 3 adds a little sparkle */
  quality?: 1 | 2 | 3;
  wobble?: boolean;
  /** crop the view to the piece (for big previews) instead of a uniform scale */
  fit?: boolean;
  /** placement when nested inside another SVG */
  x?: number;
  y?: number;
  height?: number;
  class?: string;
  title?: string;
  /** an undiscovered piece: dashed ink outline only, no glaze, effect, pattern or mark */
  silhouette?: boolean;
};

type Props = PotProps;

/** Stable per-design seed for speckles, effects and pattern jitter. */
export const pieceSeed = (design: { id?: string; form: string }) => hashSeed((design.id ?? design.form).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0, 3);

export const rnd = (seed: number, i: number) => hashSeed(seed, i) / 0xffffffff;

/** How the clay body shows: the unglazed foot colour, dark iron speckles for stoneware, a soft white glow for porcelain. */
const BODY_LOOK: Record<string, { foot: string; speckles: boolean; glow?: boolean }> = {
  irdenware: { foot: 'var(--clayRaw)', speckles: false },
  steinzeug: { foot: '#9c8f80', speckles: true },
  porzellan: { foot: '#fbf8f2', speckles: false, glow: true },
};
export const bodyLook = (b: BodyId | undefined) => BODY_LOOK[b ?? 'irdenware'] ?? BODY_LOOK.irdenware;
export const SILHOUETTE_INK = { ...inkStyle(1.6), strokeDasharray: '4 3.2', opacity: 0.7 };
export const SILHOUETTE_FILL = '#e8dccb';

/** The soft white halo behind a porcelain piece (gradient lives in ArtDefs). */
export function Glow({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse data-glow cx={cx.toFixed(1)} cy={cy.toFixed(1)} rx={rx.toFixed(1)} ry={ry.toFixed(1)} fill="url(#porcelain-glow)" />;
}

/** A small four-point sparkle for quality-3 pieces. */
export function Sparkle({ x, y }: { x: number; y: number }) {
  return <path d={`M${x.toFixed(1)} ${y.toFixed(1)} l1.5 -4 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 Z`} fill="#fffbe0" style={inkStyle(0.8)} />;
}

/** Fish scales: rows of downward arcs, every other row shifted by half a scale. Each scale carries data-scale. */
export function Scales({ x0, x1, y0, rows, r, color }: { x0: number; x1: number; y0: number; rows: number; r: number; color: string }) {
  const out: preact.JSX.Element[] = [];
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * r * 1.15;
    const shift = row % 2 ? r : 0;
    for (let x = x0 + shift - (row % 2 ? 2 * r : 0); x <= x1; x += 2 * r) {
      out.push(<path data-scale d={`M${(x).toFixed(1)} ${y.toFixed(1)} A${r} ${r} 0 0 0 ${(x + 2 * r).toFixed(1)} ${y.toFixed(1)}`} fill={color} fill-opacity="0.22" stroke={color} stroke-width={Math.max(0.8, r * 0.32).toFixed(2)} stroke-linecap="round" />);
    }
  }
  return <g>{out}</g>;
}

/** Seeded dark speckles over the glaze (stoneware), placed inside the given box. */
export function Speckles({ seed, x, y, w, h }: { seed: number; x: number; y: number; w: number; h: number }) {
  return (
    <g fill="#3a2e26" opacity="0.35">
      {Array.from({ length: 11 }, (_, i) => (
        <circle data-speckle cx={(x + rnd(seed, i + 200) * w).toFixed(1)} cy={(y + rnd(seed, i + 230) * h).toFixed(1)} r={(0.7 + rnd(seed, i + 260) * 0.7).toFixed(2)} />
      ))}
    </g>
  );
}

export function Pattern({ s, kind, color, seed }: { s: PotShape; kind: Design['pattern']; color: string; seed: number }) {
  const y = s.bandY, w = s.bandHalfWidth;
  const st = { stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, fill: 'none' };
  switch (kind) {
    case 'stripes':
      return <g><path d={`M${CX - w - 2} ${y - 4} L${CX + w + 2} ${y - 4}`} style={st} /><path d={`M${CX - w - 2} ${y + 3} L${CX + w + 2} ${y + 3}`} style={{ ...st, strokeWidth: 1.4 }} /></g>;
    case 'dots': {
      const n = Math.max(3, Math.round(w / 5));
      return <g>{Array.from({ length: n }, (_, i) => <circle cx={CX - w + ((i + 0.5) * 2 * w) / n} cy={y} r={1.9} fill={color} />)}</g>;
    }
    case 'waves': {
      let d = `M${CX - w - 2} ${y}`;
      const n = Math.max(3, Math.round(w / 6));
      const step = (2 * w + 4) / n;
      for (let i = 0; i < n; i++) d += ` q${step / 2} ${i % 2 ? 4 : -4} ${step} 0`;
      return <path d={d} style={st} />;
    }
    case 'leaves': {
      const n = Math.max(2, Math.round(w / 8));
      return (
        <g>
          <path d={`M${CX - w - 2} ${y + 1} L${CX + w + 2} ${y + 1}`} style={{ ...st, strokeWidth: 1 }} />
          {Array.from({ length: n }, (_, i) => {
            const x = CX - w + ((i + 0.5) * 2 * w) / n;
            const flip = (i + seed) % 2 ? 1 : -1;
            return <path d={`M${x} ${y + 1} q${3 * flip} -7 ${7 * flip} -6 q-2 5 ${-7 * flip} 6 Z`} fill={color} />;
          })}
        </g>
      );
    }
    case 'ranken': {
      // a wavy stem; a curling tendril on every crest and a leaf on the way down
      const n = Math.max(2, Math.round(w / 10));
      const step = (2 * w + 4) / n;
      const x0 = CX - w - 2;
      let d = `M${x0} ${y}`;
      for (let i = 0; i < n; i++) d += ` q${(step / 2).toFixed(1)} ${i % 2 ? 6 : -6} ${step.toFixed(1)} 0`;
      const f = (v: number) => v.toFixed(1);
      return (
        <g>
          <path d={d} style={{ ...st, strokeWidth: 1.6 }} />
          {Array.from({ length: n }, (_, i) => {
            const up = i % 2 ? 1 : -1;
            const mx = x0 + (i + 0.5) * step, my = y + up * 3;
            const lx = x0 + (i + 0.82) * step, ly = y + up * 1.6;
            const deg = up < 0 ? 35 : -35;
            return (
              <g>
                <path d={`M${f(mx)} ${f(my)} q${f(-0.6)} ${f(up * 3.2)} ${f(2.2)} ${f(up * 3.6)} q${f(2)} ${f(-up * 0.2)} ${f(1.4)} ${f(-up * 2)} q${f(-0.6)} ${f(-up * 1.2)} ${f(-1.8)} ${f(-up * 0.4)}`} style={{ ...st, strokeWidth: 1.2 }} />
                <ellipse cx={f(lx + 1.4)} cy={f(ly - up * 2.2)} rx="1.7" ry="3.3" transform={`rotate(${deg} ${f(lx + 1.4)} ${f(ly - up * 2.2)})`} fill={color} />
              </g>
            );
          })}
        </g>
      );
    }
    case 'karo': {
      // two rows of small alternating squares between two thin lines
      const q = 3.4;
      const n = Math.max(4, Math.floor((2 * w + 2) / q));
      const x0 = CX - (n * q) / 2;
      return (
        <g>
          <path d={`M${CX - w - 2} ${y - q - 1.6} L${CX + w + 2} ${y - q - 1.6} M${CX - w - 2} ${y + q + 1.6} L${CX + w + 2} ${y + q + 1.6}`} style={{ ...st, strokeWidth: 0.9 }} />
          {Array.from({ length: n }, (_, i) => <rect x={(x0 + i * q + 0.25).toFixed(2)} y={(i % 2 ? y : y - q).toFixed(2)} width={q - 0.5} height={q - 0.5} fill={color} />)}
        </g>
      );
    }
    case 'schuppen':
      return <Scales x0={CX - w - 6} x1={CX + w + 2} y0={y - 5} rows={3} r={Math.max(2.4, Math.min(3.6, w / 5))} color={color} />;
    default:
      return null;
  }
}

export function Effect({ s, effect, seed, base }: { s: PotShape; effect: string; seed: number; base: string }) {
  const top = s.topY, h = BASE_Y - top, w = s.maxHalfWidth;
  switch (effect) {
    case 'craquele': {
      const lines: string[] = [];
      for (let i = 0; i < 14; i++) {
        let x = CX - w + rnd(seed, i) * 2 * w, y = top + 3 + rnd(seed, i + 50) * (h - 8);
        let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
        for (let k = 0; k < 3; k++) { x += (rnd(seed, i * 7 + k) - 0.5) * 12; y += (rnd(seed, i * 11 + k) - 0.5) * 10; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
        lines.push(d);
      }
      return <g opacity="0.45">{lines.map((d) => <path d={d} stroke="#3a2a20" stroke-width="0.6" fill="none" />)}</g>;
    }
    case 'seladon':
      return <rect x="0" y={top} width="100" height={h} fill="#cfe8d0" opacity="0.28" />;
    case 'tenmoku':
      return (
        <g>
          <path d={`M0 ${top} H100 V${top + h * 0.22} Q75 ${top + h * 0.3} 50 ${top + h * 0.2} Q25 ${top + h * 0.3} 0 ${top + h * 0.2} Z`} fill="#a4512a" opacity="0.75" />
          {Array.from({ length: 6 }, (_, i) => <path d={`M${CX - w + rnd(seed, i) * 2 * w} ${top + h * 0.22} l${rnd(seed, i + 9) * 2 - 1} ${6 + rnd(seed, i + 3) * 10}`} stroke="#a4512a" stroke-width="1.6" stroke-linecap="round" opacity=".7" />)}
        </g>
      );
    case 'kupferrot':
      return <g>{Array.from({ length: 7 }, (_, i) => <ellipse cx={CX - w + rnd(seed, i) * 2 * w} cy={top + rnd(seed, i + 20) * h} rx={4 + rnd(seed, i + 40) * 8} ry={3 + rnd(seed, i + 60) * 6} fill={i % 2 ? mix(base, '#3a0610', 0.4) : mix(base, '#ff9aa0', 0.35)} opacity="0.55" />)}</g>;
    case 'kristall':
      return (
        <g>
          {Array.from({ length: 6 }, (_, i) => {
            const x = CX - w * 0.8 + rnd(seed, i) * 1.6 * w, y = top + 6 + rnd(seed, i + 30) * (h - 12), r = 2.5 + rnd(seed, i + 70) * 4;
            return <g stroke="#fffbe8" stroke-width="0.9" stroke-linecap="round" opacity="0.9">{[0, 60, 120].map((a) => <path d={`M${x - r * Math.cos((a * Math.PI) / 180)} ${y - r * Math.sin((a * Math.PI) / 180)} L${x + r * Math.cos((a * Math.PI) / 180)} ${y + r * Math.sin((a * Math.PI) / 180)}`} />)}</g>;
          })}
        </g>
      );
    case 'oelfleck':
      // silvery oil-spot drops floating on the upper two thirds, each with a tiny bright core
      return (
        <g data-effect="oelfleck">
          {Array.from({ length: 12 }, (_, i) => {
            const x = CX - w * 0.85 + rnd(seed, i) * 1.7 * w, y = top + 4 + rnd(seed, i + 20) * h * 0.6, r = 1 + rnd(seed, i + 40) * 1.5;
            return (
              <g>
                <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} fill="#e8eef2" opacity="0.6" />
                <circle cx={(x - r * 0.3).toFixed(1)} cy={(y - r * 0.3).toFixed(1)} r={(r * 0.4).toFixed(2)} fill="#fff" opacity="0.75" />
              </g>
            );
          })}
        </g>
      );
    case 'hasenfell': {
      // fine brown hare's-fur streaks running down from below the rim
      const n = 12;
      return (
        <g data-effect="hasenfell" stroke-linecap="round" fill="none" opacity="0.65">
          {Array.from({ length: n }, (_, i) => {
            const x = CX - w + ((i + 0.5) / n) * 2 * w + (rnd(seed, i) - 0.5) * 2.4;
            const y0 = top + h * 0.15 + rnd(seed, i + 30) * 3, len = h * (0.3 + rnd(seed, i + 60) * 0.3);
            const bend = (rnd(seed, i + 90) - 0.5) * 3;
            return <path d={`M${x.toFixed(1)} ${y0.toFixed(1)} q${bend.toFixed(1)} ${(len / 2).toFixed(1)} ${(bend * 0.4).toFixed(1)} ${len.toFixed(1)}`} stroke={i % 3 === 1 ? '#e8b878' : '#5a3418'} stroke-width={(0.8 + rnd(seed, i + 120) * 0.6).toFixed(2)} />;
          })}
        </g>
      );
    }
    case 'shino':
      // milky glaze with a few warm, soft blushes (two layers each so the edge stays soft)
      return (
        <g data-effect="shino">
          {Array.from({ length: 4 }, (_, i) => {
            const x = CX - w * 0.75 + rnd(seed, i) * 1.5 * w, y = top + 6 + rnd(seed, i + 10) * (h - 14);
            const rx = 6 + rnd(seed, i + 20) * 6, ry = 4 + rnd(seed, i + 30) * 4;
            return (
              <g fill="#e89a6a">
                <ellipse cx={x.toFixed(1)} cy={y.toFixed(1)} rx={(rx * 1.35).toFixed(1)} ry={(ry * 1.35).toFixed(1)} opacity="0.18" />
                <ellipse cx={x.toFixed(1)} cy={y.toFixed(1)} rx={rx.toFixed(1)} ry={ry.toFixed(1)} opacity="0.3" />
              </g>
            );
          })}
        </g>
      );
    case 'salzglasur': {
      // orange-peel skin: a dense stipple a shade darker than the glaze
      const ink = mix(base, '#000000', 0.25);
      return (
        <g data-effect="salzglasur" fill={ink} opacity="0.5">
          {Array.from({ length: 36 }, (_, i) => <circle cx={(CX - w + rnd(seed, i) * 2 * w).toFixed(1)} cy={(top + 2 + rnd(seed, i + 50) * (h - 4)).toFixed(1)} r={(0.6 + rnd(seed, i + 100) * 0.4).toFixed(2)} />)}
        </g>
      );
    }
    case 'blancdechine':
      // warm ivory wash with one soft vertical highlight
      return (
        <g data-effect="blancdechine">
          <rect x="0" y={top} width="100" height={h} fill="#fff4dc" opacity="0.3" />
          <path d={`M${(CX + w * 0.4).toFixed(1)} ${(top + h * 0.15).toFixed(1)} L${(CX + w * 0.36).toFixed(1)} ${(top + h * 0.8).toFixed(1)}`} stroke="#fffdf6" stroke-width="3" stroke-linecap="round" opacity="0.4" />
        </g>
      );
    case 'blauweiss': {
      // one or two cobalt brush tendrils with little leaves, painted under the clear glaze
      const tendrils = 1 + Math.floor(rnd(seed, 1) * 2);
      return (
        <g data-effect="blauweiss" stroke="#22408a" fill="none" stroke-linecap="round" opacity="0.8">
          {Array.from({ length: tendrils }, (_, t) => {
            const y = top + h * (tendrils === 1 ? 0.45 : 0.3 + t * 0.35) + (rnd(seed, t + 5) - 0.5) * 4;
            const amp = 3 + rnd(seed, t + 7) * 2, x0 = CX - w - 2, step = (2 * w + 4) / 4;
            let d = `M${x0.toFixed(1)} ${y.toFixed(1)}`;
            for (let k = 0; k < 4; k++) d += ` q${(step / 2).toFixed(1)} ${(k % 2 ? amp : -amp).toFixed(1)} ${step.toFixed(1)} 0`;
            const leaves = Array.from({ length: 4 }, (_, k) => {
              const lx = x0 + step * (k + 0.5), ly = y + (k % 2 ? amp : -amp) * 0.5, dir = k % 2 ? 1 : -1;
              return <path d={`M${lx.toFixed(1)} ${ly.toFixed(1)} q${(3 * dir).toFixed(1)} ${(-4.5 * dir).toFixed(1)} ${(6.5 * dir).toFixed(1)} ${(-2 * dir).toFixed(1)} q${(-3 * dir).toFixed(1)} ${(3.4 * dir).toFixed(1)} ${(-6.5 * dir).toFixed(1)} ${(2 * dir).toFixed(1)} Z`} fill="#22408a" stroke-width="0.6" />;
            });
            return <g><path d={d} stroke-width="1.4" />{leaves}</g>;
          })}
        </g>
      );
    }
    case 'ochsenblut':
      // deep red pooling towards the foot, fading up to the glaze colour, and a lighter line where the glaze thins at the rim
      return (
        <g data-effect="ochsenblut">
          <rect x="0" y={top} width="100" height={h} fill="url(#ochsenblut-pool)" />
          <path d={`M${(CX - w).toFixed(1)} ${(top + 3).toFixed(1)} Q${CX} ${(top + 6).toFixed(1)} ${(CX + w).toFixed(1)} ${(top + 3).toFixed(1)}`} stroke={mix(base, '#ffffff', 0.45)} stroke-width="1.4" fill="none" opacity="0.6" />
        </g>
      );
    case 'eierschale':
      // eggshell-thin: a pale, translucent band at the top and a faint glow from inside
      return (
        <g data-effect="eierschale">
          <ellipse cx={CX} cy={(top + h * 0.55).toFixed(1)} rx={(w * 0.65).toFixed(1)} ry={(h * 0.3).toFixed(1)} fill="#fffaf0" opacity="0.18" />
          <path d={`M0 ${top} H100 V${(top + h * 0.2).toFixed(1)} Q75 ${(top + h * 0.24).toFixed(1)} 50 ${(top + h * 0.2).toFixed(1)} Q25 ${(top + h * 0.16).toFixed(1)} 0 ${(top + h * 0.2).toFixed(1)} Z`} fill="#ffffff" opacity="0.35" />
        </g>
      );
    default:
      return null;
  }
}

export function Mark({ mark, x, y, scale = 1 }: { mark: MakerMark; x: number; y: number; scale?: number }) {
  const r = mark.frame === 'sonne' ? 6.2 : 7.2;
  const shape = {
    circle: <circle cx={x} cy={y} r="4.2" />,
    heart: <path d={`M${x} ${y + 4} C${x - 6} ${y - 1} ${x - 3} ${y - 6} ${x} ${y - 2.5} C${x + 3} ${y - 6} ${x + 6} ${y - 1} ${x} ${y + 4} Z`} />,
    star: <path d={`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y - 1.2} L${x + 2.3} ${y + 1.2} L${x + 3.1} ${y + 4.8} L${x} ${y + 2.8} L${x - 3.1} ${y + 4.8} L${x - 2.3} ${y + 1.2} L${x - 5} ${y - 1.2} L${x - 1.5} ${y - 1.5} Z`} />,
    leaf: <path d={`M${x - 4.5} ${y + 3} Q${x - 4} ${y - 5} ${x + 4.5} ${y - 4} Q${x + 4} ${y + 4} ${x - 4.5} ${y + 3} Z`} />,
  }[mark.shape];
  return (
    <g opacity="0.85" transform={scale < 1 ? `translate(${x} ${y}) scale(${scale.toFixed(2)}) translate(${-x} ${-y})` : undefined}>
      <MarkFrame frame={mark.frame} x={x} y={y} r={r} color={mark.color} />
      <g fill="none" stroke={mark.color} stroke-width="1.1">{shape}</g>
      <text x={x} y={y + 1.6} text-anchor="middle" font-size="4.6" fill={mark.color} font-family="var(--font-hand)">{mark.letter}</text>
    </g>
  );
}

/** Places the mark on the body; a framed mark shrinks to fit between rim and foot on squat pieces. */
function UprightMark({ s, mark }: { s: PotShape; mark: MakerMark }) {
  if (!mark.frame) return <Mark mark={mark} x={CX + s.bandHalfWidth * 0.45} y={Math.min(s.footY - 6, s.bandY + 10)} />;
  const top = s.topY + s.rim.ry, bottom = s.footY, R = 9;
  const scale = Math.min(1, (bottom - top) / (2 * R + 2));
  const y = Math.max(top + R * scale + 1, Math.min(s.bandY + 6, bottom - R * scale - 1));
  // squat pieces taper fast below the band, so the shrunk mark moves towards the middle
  const x = CX + (scale < 1 ? s.bandHalfWidth * 0.15 : Math.min(s.bandHalfWidth * 0.45, Math.max(0, s.bandHalfWidth - R - 3)));
  return <Mark mark={mark} x={x} y={y} scale={scale} />;
}

function ringPoints(rx: number, ry: number, cy: number, n: number): [number, number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [CX + rx * Math.cos(a), cy + ry * Math.sin(a), a];
  });
}

/** Plates are drawn from slightly above so the decoration shows. */
function Plate({ design, glazeColor, effect, seed, uid, mark, quality, silhouette }: { design: Props['design']; glazeColor: string; effect?: string | null; seed: number; uid: string; mark?: MakerMark | null; quality?: 1 | 2 | 3; silhouette?: boolean }) {
  const p = design.profile;
  const rx = 34 + p.rim * 10 + (design.rim === 'flared' ? 3 : 0);
  const ry = rx * 0.42;
  const cy = 62;
  const depth = 3 + p.height * 5;
  const well = 0.5 + p.belly * 0.2;
  const clip = `pl-${uid}`;
  const inner = mix(glazeColor, '#2b2420', 0.08);
  const c = design.patternColor;
  const bandRx = rx * ((1 + well) / 2), bandRy = ry * ((1 + well) / 2);
  let pattern = null;
  switch (design.pattern) {
    case 'stripes': pattern = <g fill="none" stroke={c} stroke-width="1.8"><ellipse cx={CX} cy={cy} rx={rx * 0.9} ry={ry * 0.9} /><ellipse cx={CX} cy={cy} rx={rx * (well + 0.06)} ry={ry * (well + 0.06)} stroke-width="1.1" /></g>; break;
    case 'dots': pattern = <g>{ringPoints(bandRx, bandRy, cy, 14).map(([x, y]) => <circle cx={x} cy={y} r="1.9" fill={c} />)}</g>; break;
    case 'waves': {
      const pts = ringPoints(bandRx, bandRy, cy, 48);
      const d = pts.map(([x, y, a], i) => `${i ? 'L' : 'M'}${(x + Math.cos(a) * Math.sin(a * 8) * 2.2).toFixed(1)} ${(y + Math.sin(a) * Math.sin(a * 8) * 1.2).toFixed(1)}`).join(' ') + ' Z';
      pattern = <path d={d} fill="none" stroke={c} stroke-width="1.8" />;
      break;
    }
    case 'leaves': pattern = <g>{ringPoints(bandRx, bandRy, cy, 10).map(([x, y], i) => <path d={`M${x - 3} ${y + 1} q${i % 2 ? 3 : -3} -5 6 -2 q-2 3 -6 2 Z`} fill={c} />)}</g>; break;
    case 'ranken': {
      const pts = ringPoints(bandRx, bandRy, cy, 60);
      const d = pts.map(([x, y, a], i) => `${i ? 'L' : 'M'}${(x + Math.cos(a) * Math.sin(a * 6) * 2.4).toFixed(1)} ${(y + Math.sin(a) * Math.sin(a * 6) * 1.3).toFixed(1)}`).join(' ') + ' Z';
      pattern = (
        <g>
          <path d={d} fill="none" stroke={c} stroke-width="1.3" />
          {ringPoints(bandRx, bandRy, cy, 12).map(([x, y], i) => i % 2
            ? <path d={`M${(x - 3).toFixed(1)} ${(y + 0.5).toFixed(1)} q1 -4.5 5 -3.5 q-1 3.5 -5 3.5 Z`} fill={c} />
            : <path d={`M${x.toFixed(1)} ${y.toFixed(1)} q2 -3 3.6 -1 q0.6 1.6 -1.2 1.4`} fill="none" stroke={c} stroke-width="1" stroke-linecap="round" />)}
        </g>
      );
      break;
    }
    case 'schuppen': pattern = <g>{[0, 1].map((k) => ringPoints(bandRx * (1 - k * 0.12), bandRy * (1 - k * 0.12), cy, 16).map(([x, y], i) => <path data-scale d={`M${(x - 2.6).toFixed(1)} ${(y - 1).toFixed(1)} A2.6 2.6 0 0 0 ${(x + 2.6).toFixed(1)} ${(y - 1).toFixed(1)}`} transform={k ? `rotate(${(i * 11.25).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})` : undefined} fill={c} fill-opacity="0.22" stroke={c} stroke-width="1" />))}</g>; break;
    case 'karo': pattern = <g>{ringPoints(bandRx, bandRy, cy, 28).map(([x, y, a], i) => { const o = i % 2 ? 1.9 : -1.9; return <rect x={(x + Math.cos(a) * o - 1.4).toFixed(1)} y={(y + Math.sin(a) * o * 0.45 - 1.4).toFixed(1)} width="2.8" height="2.8" fill={c} />; })}</g>; break;
  }
  if (silhouette) {
    return (
      <>
        <path d={`M${CX - rx} ${cy} Q${CX - rx + 2} ${cy + ry + depth} ${CX} ${cy + ry + depth} Q${CX + rx - 2} ${cy + ry + depth} ${CX + rx} ${cy} Z`} fill={SILHOUETTE_FILL} opacity="0.55" style={SILHOUETTE_INK} />
        <ellipse cx={CX} cy={cy} rx={rx} ry={ry} fill={SILHOUETTE_FILL} fill-opacity="0.45" style={SILHOUETTE_INK} />
        <ellipse cx={CX} cy={cy + 1} rx={rx * well} ry={ry * well} fill="none" style={{ ...SILHOUETTE_INK, strokeWidth: 1.1 }} />
      </>
    );
  }
  const look = bodyLook(design.body);
  return (
    <>
      <defs><clipPath id={clip}><ellipse cx={CX} cy={cy} rx={rx} ry={ry} /></clipPath></defs>
      {look.glow && <Glow cx={CX} cy={cy + depth / 2} rx={rx + 12} ry={ry + depth + 10} />}
      <ellipse cx={CX} cy={cy + depth + 3} rx={rx + 2} ry={ry * 0.8} fill="url(#hatch)" opacity="0.45" />
      <path d={`M${CX - rx} ${cy} Q${CX - rx + 2} ${cy + ry + depth} ${CX} ${cy + ry + depth} Q${CX + rx - 2} ${cy + ry + depth} ${CX + rx} ${cy} Z`} fill={look.speckles ? mix(look.foot, '#2b2420', 0.1) : look.glow ? look.foot : mix(glazeColor, '#2b2420', 0.25)} style={inkStyle(2)} />
      <ellipse cx={CX} cy={cy} rx={rx} ry={ry} fill={glazeColor} />
      <g clip-path={`url(#${clip})`}>
        <ellipse cx={CX} cy={cy + 1} rx={rx * well} ry={ry * well} fill={inner} />
        <ellipse cx={CX} cy={cy + 1} rx={rx * well} ry={ry * well} fill="none" stroke={mix(glazeColor, '#2b2420', 0.3)} stroke-width="1" />
        {effect && <Effect s={{ body: '', rim: { cx: CX, cy, rx, ry }, footY: 100, bandY: cy, bandHalfWidth: rx, topY: cy - ry, maxHalfWidth: rx }} effect={effect} seed={seed} base={glazeColor} />}
        {pattern}
        {look.speckles && <Speckles seed={seed} x={CX - rx} y={cy - ry} w={rx * 2} h={ry * 2} />}
        <path d={`M${CX - rx * 0.7} ${cy - ry * 0.45} Q${CX - rx * 0.2} ${cy - ry * 0.85} ${CX + rx * 0.3} ${cy - ry * 0.78}`} stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.6" />
      </g>
      <ellipse cx={CX} cy={cy} rx={rx} ry={ry} fill="none" style={inkStyle(design.rim === 'rolled' ? 3.2 : 2)} />
      {quality === 3 && <Sparkle x={CX + rx * 0.55} y={cy - ry * 0.5} />}
      {mark && <Mark mark={mark} x={CX} y={cy + 1} />}
    </>
  );
}

/** A lid sitting on the rim: dome, a little gallery line and a knob. */
function Lid({ lid, fill, style }: { lid: NonNullable<PotShape['lid']>; fill: string; style: CSSProperties }) {
  const { cx, cy, rx, ry, knob } = lid;
  const h = rx * 0.5;
  const top = cy - h * 0.78;
  return (
    <g>
      <path d={`M${cx - rx} ${cy} C${cx - rx} ${cy - h} ${cx + rx} ${cy - h} ${cx + rx} ${cy} C${cx + rx * 0.6} ${cy + ry} ${cx - rx * 0.6} ${cy + ry} ${cx - rx} ${cy} Z`} fill={fill} style={style} />
      <path d={`M${cx - knob * 0.6} ${top + 0.6} L${cx - knob * 0.45} ${top - knob * 0.9} L${cx + knob * 0.45} ${top - knob * 0.9} L${cx + knob * 0.6} ${top + 0.6} Z`} fill={fill} style={style} />
      <ellipse cx={cx} cy={top - knob * 1.15} rx={knob} ry={knob * 0.72} fill={fill} style={style} />
    </g>
  );
}

export function Pot(props: Props) {
  if (props.design.form === 'figur') return <Figure {...props} />;
  if (props.design.form === 'fliese') return <Tile {...props} />;
  return <Vessel {...props} />;
}

function Vessel({ design, glazeColor, effect, size = 96, mark, quality, wobble = true, fit = false, x, y, height, class: cls, title, silhouette }: Props) {
  const box = { x, y, width: size, height: height ?? size };
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const s = potShape(design.form, design.profile, design.rim, design.handle);
  const seed = pieceSeed(design);
  const body: BodyId = design.body ?? 'irdenware';
  const look = bodyLook(body);
  const inside = mix(glazeColor, '#2b2420', 0.28);
  const clip = `pc-${uid}`;
  const shade = `ps-${uid}`;
  const glazeTop = effect === 'seladon' ? mix(glazeColor, '#d8f0d8', 0.3) : glazeColor;
  const sil = silhouette ? true : undefined;
  let viewBox = '-10 -8 120 110';
  if (fit) {
    const lidTop = s.lid ? s.lid.cy - s.lid.rx * 0.39 - s.lid.knob * 2 : s.topY;
    const top = design.form === 'teller' ? 30 : Math.min(s.topY, lidTop) - 8;
    const half = Math.max(design.form === 'teller' ? 48 : s.maxHalfWidth + (s.handle || s.lid ? 20 : 8), (BASE_Y + 8 - top) / 2);
    viewBox = `${CX - half} ${top} ${half * 2} ${Math.max(BASE_Y + 8 - top, half * 1.2)}`;
  }
  if (design.form === 'teller') {
    return (
      <svg viewBox={viewBox} {...box} class={cls} role="img" aria-label={title ?? 'Teller'} data-pot data-path={s.body} data-body={body} data-silhouette={sil}>
        {title && <title>{title}</title>}
        <g filter={wobble ? 'url(#wobble-soft)' : undefined}>
          <Plate design={design} glazeColor={glazeColor} effect={effect} seed={seed} uid={uid} mark={mark} quality={quality} silhouette={silhouette} />
        </g>
      </svg>
    );
  }
  if (silhouette) {
    return (
      <svg viewBox={viewBox} {...box} class={cls} role="img" aria-label={title ?? 'Unbekannt'} data-pot data-path={s.body} data-body={body} data-silhouette>
        {title && <title>{title}</title>}
        <g filter={wobble ? 'url(#wobble-soft)' : undefined}>
          <ellipse cx={CX} cy={BASE_Y + 1.5} rx={s.maxHalfWidth + 4} ry="4" fill="url(#hatch)" opacity="0.3" />
          {s.handle && <path d={s.handle} fill="none" style={{ ...SILHOUETTE_INK, strokeWidth: 5, opacity: 0.25 }} />}
          {s.handle && <path d={s.handle} fill="none" style={SILHOUETTE_INK} />}
          {s.spout && <path d={s.spout} fill={SILHOUETTE_FILL} fill-opacity="0.45" style={SILHOUETTE_INK} />}
          <path d={s.body} fill={SILHOUETTE_FILL} fill-opacity="0.45" style={SILHOUETTE_INK} />
          {s.lid
            ? <Lid lid={s.lid} fill={SILHOUETTE_FILL} style={{ ...SILHOUETTE_INK, fillOpacity: 0.45 }} />
            : <ellipse cx={s.rim.cx} cy={s.rim.cy} rx={s.rim.rx} ry={s.rim.ry} fill="none" style={SILHOUETTE_INK} />}
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox={viewBox} {...box} class={cls} role="img" aria-label={title ?? 'Keramik'} data-pot data-path={s.body} data-body={body}>
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={clip}><path d={s.body} /></clipPath>
        <linearGradient id={shade} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0.18" />
          <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.8" stop-color="#000" stop-opacity="0.08" />
          <stop offset="1" stop-color="#000" stop-opacity="0.22" />
        </linearGradient>
      </defs>
      <g filter={wobble ? 'url(#wobble-soft)' : undefined}>
        {look.glow && <Glow cx={CX} cy={(s.topY + BASE_Y) / 2} rx={s.maxHalfWidth + (s.handle || s.spout ? 16 : 11)} ry={(BASE_Y - s.topY) / 2 + 10} />}
        <ellipse cx={CX} cy={BASE_Y + 1.5} rx={s.maxHalfWidth + 4} ry="4" fill="url(#hatch)" opacity="0.45" />
        {s.handle && <path d={s.handle} fill="none" style={{ ...inkStyle(8.5), strokeLinecap: 'round' }} />}
        {s.handle && <path d={s.handle} fill="none" stroke={glazeColor} stroke-width="5" stroke-linecap="round" />}
        {s.spout && <path d={s.spout} fill={glazeColor} style={inkStyle(1.8)} />}
        <g clip-path={`url(#${clip})`}>
          <rect x="0" y="0" width="100" height="100" fill={glazeTop} />
          {effect && <Effect s={s} effect={effect} seed={seed} base={glazeColor} />}
          <Pattern s={s} kind={design.pattern} color={design.patternColor} seed={seed} />
          {look.speckles && <Speckles seed={seed} x={CX - s.maxHalfWidth} y={s.topY} w={s.maxHalfWidth * 2} h={s.footY - s.topY} />}
          <rect x="0" y="0" width="100" height="100" fill={`url(#${shade})`} />
          <path d={`M0 ${s.footY} q12 -1.4 25 0 t25 0 t25 0 t25 0 V100 H0 Z`} fill={look.foot} />
          <path d={`M0 ${s.footY} q12 -1.4 25 0 t25 0 t25 0 t25 0`} fill="none" stroke={mix(glazeColor, '#2b2420', 0.35)} stroke-width="1.2" />
        </g>
        <path d={s.body} fill="none" style={inkStyle(2)} />
        <ellipse cx={s.rim.cx} cy={s.rim.cy} rx={s.rim.rx} ry={s.rim.ry} fill={inside} style={inkStyle(design.rim === 'rolled' ? 3.2 : 1.8)} />
        {s.lid && <Lid lid={s.lid} fill={glazeTop} style={inkStyle(1.8)} />}
        <path d={`M${CX - s.maxHalfWidth * 0.55} ${s.footY - 6} Q${CX - s.maxHalfWidth * 0.72} ${(s.footY + s.topY) / 2} ${CX - s.rim.rx * 0.6} ${s.topY + 6}`} stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55" />
        {quality === 3 && <Sparkle x={CX + s.maxHalfWidth * 0.5} y={s.topY + 8} />}
        {mark && <UprightMark s={s} mark={mark} />}
      </g>
    </svg>
  );
}
