/**
 * Static room decor for the workshop (1200×700 per room). Ported from docs/art/gen_scene.py.
 * Wall 0..470, floor 470..700.
 */
import { memo } from 'preact/compat';
import type { Design, GlazeRecipe } from '../../../shared/types';
import { inkStyle } from '../ink';
import { Pot } from '../Pot';
import { DecorLayer } from './Decor';

export const WALL_H = 470;
const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

function StringLights({ x0, x1 }: { x0: number; x1: number }) {
  const n = Math.round((x1 - x0) / 70);
  const cols = ['var(--g3)', 'var(--sun)', 'var(--g1)', 'var(--g2)'];
  const sag = (x: number) => 34 + Math.abs(Math.sin(((x - x0) / (x1 - x0)) * Math.PI * 3)) * 40;
  let d = `M${x0} 30`;
  for (let x = x0; x <= x1; x += 20) d += ` L${x} ${sag(x)}`;
  return (
    <g>
      <path d={d} fill="none" style={T} />
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + 35 + i * 70;
        const y = sag(x);
        return (
          <g class="bulb" style={{ animationDelay: `${(i % 5) * 0.6}s` }}>
            <circle cx={x} cy={y + 10} r="13" fill={cols[i % 4]} opacity="0.28" />
            <path d={`M${x - 4} ${y} L${x + 4} ${y} L${x + 5} ${y + 13} Q${x} ${y + 18} ${x - 5} ${y + 13} Z`} fill={cols[i % 4]} style={S} />
          </g>
        );
      })}
    </g>
  );
}

function Window({ x, y }: { x: number; y: number }) {
  const w = 200, h = 180;
  return (
    <g>
      <path d={`M${x - 14} ${y - 10} L${x + w + 14} ${y - 10} L${x + w + 14} ${y + h + 8} L${x - 14} ${y + h + 8} Z`} fill="var(--woodDark)" style={S} />
      <rect x={x} y={y} width={w} height={h} fill="var(--sky)" style={S} />
      <circle class="sun" cx={x + 150} cy={y + 44} r="21" fill="var(--sun)" />
      <path d={`M${x + 26} ${y + 52} q8 -16 24 -8 q10 -13 24 0 q13 0 10 10 L${x + 24} ${y + 55} Z`} fill="var(--paper)" style={S} class="cloud" />
      <path d={`M${x} ${y + 140} Q${x + 53} ${y + 100} ${x + 106} ${y + 128} Q${x + 160} ${y + 106} ${x + w} ${y + 132} L${x + w} ${y + h} L${x} ${y + h} Z`} fill="var(--hill)" />
      <path d={`M${x} ${y + 158} Q${x + 80} ${y + 138} ${x + w} ${y + 156} L${x + w} ${y + h} L${x} ${y + h} Z`} fill="var(--g2)" opacity="0.9" />
      <path d={`M${x + 52} ${y + 138} L${x + 52} ${y + 114}`} style={S} />
      <circle cx={x + 52} cy={y + 106} r="15" fill="var(--g2)" style={S} />
      <path d={`M${x + 90} ${y + 74} q5 -5 10 0 q5 -5 10 0 M${x + 118} ${y + 88} q4 -4 8 0 q4 -4 8 0`} fill="none" style={T} class="birds" />
      <path d={`M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}`} stroke="var(--woodDark)" stroke-width="8" />
      <path d={`M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}`} fill="none" style={S} />
      <path d={`M${x + 14} ${y + 40} l18 -18 M${x + 14} ${y + 56} l32 -32`} stroke="#fff" stroke-width="4" opacity="0.6" stroke-linecap="round" />
      {/* curtains */}
      <path d={`M${x - 22} ${y - 16} L${x + 34} ${y - 16} Q${x + 22} ${y + 50} ${x + 40} ${y + 90} Q${x + 8} ${y + 116} ${x - 14} ${y + 194} L${x - 22} ${y + 194} Z`} fill="var(--curtain)" style={S} />
      <path d={`M${x + w + 22} ${y - 16} L${x + w - 34} ${y - 16} Q${x + w - 22} ${y + 50} ${x + w - 40} ${y + 90} Q${x + w - 8} ${y + 116} ${x + w + 14} ${y + 194} L${x + w + 22} ${y + 194} Z`} fill="var(--curtain)" style={S} />
      {[0, 1, 2, 3, 4, 5].map((k) => <circle cx={x - 8 + k * 9} cy={y + 26 + k * 18} r="2" fill="var(--line)" opacity="0.35" />)}
      {[0, 1, 2, 3, 4, 5].map((k) => <circle cx={x + w + 8 - k * 9} cy={y + 26 + k * 18} r="2" fill="var(--line)" opacity="0.35" />)}
      <path d={`M${x - 32} ${y - 16} L${x + w + 32} ${y - 16}`} stroke="var(--line)" stroke-width="5" stroke-linecap="round" />
      {/* sill + plants */}
      <path d={`M${x - 28} ${y + h + 8} L${x + w + 28} ${y + h + 8} L${x + w + 22} ${y + h + 22} L${x - 22} ${y + h + 22} Z`} fill="var(--wood)" style={S} />
      <Plant x={x + 14} y={y + h + 8} kind="cactus" />
      <Plant x={x + w / 2 + 26} y={y + h + 8} kind="flower" />
      <Plant x={x + w - 8} y={y + h + 8} kind="leafy" />
    </g>
  );
}

function Plant({ x, y, kind }: { x: number; y: number; kind: 'cactus' | 'flower' | 'leafy' }) {
  return (
    <g class="plant">
      {kind === 'cactus' && <g><path d={`M${x - 6} ${y - 22} L${x - 6} ${y - 48} Q${x} ${y - 58} ${x + 6} ${y - 48} L${x + 6} ${y - 22} Z`} fill="var(--g2)" style={S} /><path d={`M${x + 6} ${y - 34} L${x + 13} ${y - 34} L${x + 13} ${y - 42}`} fill="none" style={S} /><circle cx={x} cy={y - 58} r="4" fill="var(--g3)" /></g>}
      {kind === 'leafy' && [-50, -20, 10, 40].map((a) => <path d={`M${x} ${y - 22} Q${x + a * 0.5} ${y - 50} ${x + a * 0.75} ${y - 42} Q${x + a * 0.25} ${y - 34} ${x} ${y - 22}`} fill="var(--g2)" style={S} />)}
      {kind === 'flower' && (
        <g>
          <path d={`M${x} ${y - 22} L${x} ${y - 44} M${x} ${y - 32} Q${x + 10} ${y - 36} ${x + 12} ${y - 29}`} fill="none" style={S} />
          {[0, 72, 144, 216, 288].map((a) => <circle cx={x + 7 * Math.cos((a * Math.PI) / 180)} cy={y - 50 + 7 * Math.sin((a * Math.PI) / 180)} r="5" fill="var(--g3)" style={S} />)}
          <circle cx={x} cy={y - 50} r="3.6" fill="var(--sun)" />
        </g>
      )}
      <path d={`M${x - 11} ${y} L${x - 13} ${y - 17} L${x + 13} ${y - 17} L${x + 11} ${y} Z`} fill="var(--clay)" style={S} />
      <path d={`M${x - 15} ${y - 17} L${x + 15} ${y - 17} L${x + 15} ${y - 22} L${x - 15} ${y - 22} Z`} fill="var(--clay)" style={S} />
    </g>
  );
}

function HangingPlant({ x }: { x: number }) {
  return (
    <g class="hanging">
      <path d={`M${x} 20 L${x - 10} 86 M${x} 20 L${x + 10} 86`} fill="none" style={T} />
      <path d={`M${x - 20} 86 L${x + 20} 86 Q${x + 18} 108 ${x} 108 Q${x - 18} 108 ${x - 20} 86 Z`} fill="var(--g5)" style={S} />
      {[-16, -6, 5, 15].map((dx, k) => (
        <g>
          <path d={`M${x + dx} 94 Q${x + dx * 1.6} ${124 + k * 12} ${x + dx * 1.1} ${150 + k * 14}`} fill="none" stroke="var(--g2Dark)" stroke-width="2.6" />
          {[0, 1, 2].map((t) => <ellipse cx={x + dx * 1.3} cy={114 + k * 7 + t * 15} rx="5" ry="3.2" fill="var(--g2)" style={T} />)}
        </g>
      ))}
    </g>
  );
}

type Pin = { design: Design; glaze?: GlazeRecipe };

function Pinboard({ x, y, pins }: { x: number; y: number; pins: Pin[] }) {
  const cards: [number, number, number][] = [[x + 12, y + 12, -4], [x + 88, y + 10, 5], [x + 16, y + 92, 3], [x + 90, y + 90, -3]];
  return (
    <g>
      <path d={`M${x} ${y + 4} L${x + 170} ${y} L${x + 172} ${y + 168} L${x + 2} ${y + 172} Z`} fill="var(--cork)" style={S} />
      {Array.from({ length: 50 }, (_, i) => <circle cx={x + 10 + ((i * 37) % 150)} cy={y + 10 + ((i * 53) % 150)} r="1.1" fill="var(--line)" opacity="0.25" />)}
      {cards.map(([cx, cy, rot], i) => {
        const pin = pins[i];
        return (
          <g transform={`rotate(${rot} ${cx + 34} ${cy + 32})`}>
            <rect x={cx} y={cy} width="68" height="66" fill="var(--paper)" style={S} />
            {pin ? (
              <Pot x={cx + 4} y={cy + 6} design={pin.design} glazeColor={pin.glaze?.color ?? '#e9c9a6'} size={60} height={56} wobble={false} />
            ) : (
              <g>
                {[0, 1, 2, 3, 4, 5].map((k) => <rect x={cx + 8 + (k % 3) * 18} y={cy + 10 + Math.floor(k / 3) * 22} width="14" height="16" fill={['var(--g1)', 'var(--g3)', 'var(--g2)', 'var(--g4)', 'var(--g5)', 'var(--sun)'][k]} style={T} />)}
              </g>
            )}
            <circle cx={cx + 34} cy={cy + 4} r="4" fill="var(--g3)" style={S} />
          </g>
        );
      })}
    </g>
  );
}

function Clock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="26" fill="var(--paper)" style={S} />
      {Array.from({ length: 12 }, (_, k) => <circle cx={x + 20 * Math.cos((k * Math.PI) / 6)} cy={y + 20 * Math.sin((k * Math.PI) / 6)} r="1.4" fill="var(--line)" />)}
      <path class="clock-min" d={`M${x} ${y} L${x} ${y - 18}`} style={{ ...S, transformOrigin: `${x}px ${y}px` }} />
      <path d={`M${x} ${y} L${x + 12} ${y + 5}`} style={S} />
    </g>
  );
}

export function Cat({ x, y, sleeping = true }: { x: number; y: number; sleeping?: boolean }) {
  return (
    <g class="cat">
      <ellipse cx={x} cy={y + 7} rx="54" ry="8" fill="url(#hatch)" opacity="0.5" />
      <g class="cat-body" style={{ transformOrigin: `${x}px ${y}px` }}>
        <path d={`M${x - 50} ${y} Q${x - 55} ${y - 42} ${x - 8} ${y - 47} Q${x + 46} ${y - 47} ${x + 46} ${y - 8} Q${x + 46} ${y + 5} ${x} ${y + 5} Q${x - 46} ${y + 5} ${x - 50} ${y} Z`} fill="var(--cat)" style={S} />
        <path d={`M${x - 8} ${y - 42} q5 10 0 20 M${x + 10} ${y - 42} q5 10 0 20 M${x + 25} ${y - 37} q4 8 0 15`} fill="none" style={T} />
      </g>
      <path d={`M${x - 42} ${y - 27} L${x - 45} ${y - 52} L${x - 27} ${y - 40} Z`} fill="var(--cat)" style={S} />
      <path d={`M${x - 17} ${y - 42} L${x - 10} ${y - 62} L${x - 2} ${y - 40} Z`} fill="var(--cat)" style={S} />
      <path d={`M${x - 41} ${y - 34} L${x - 42} ${y - 45} L${x - 33} ${y - 38} Z`} fill="var(--cheek)" />
      {sleeping ? (
        <path d={`M${x - 37} ${y - 20} q5 4 10 0 M${x - 22} ${y - 22} q5 4 10 0`} stroke="var(--line)" stroke-width="2.2" fill="none" stroke-linecap="round" />
      ) : (
        <g><circle cx={x - 32} cy={y - 21} r="3" fill="var(--line)" /><circle cx={x - 17} cy={y - 23} r="3" fill="var(--line)" /></g>
      )}
      <path d={`M${x - 26} ${y - 14} l-2.5 2.5 l-2.5 -2.5`} stroke="var(--line)" stroke-width="1.6" fill="none" />
      <ellipse cx={x - 40} cy={y - 11} rx="4" ry="2.4" fill="var(--cheek)" opacity="0.8" />
      <path d={`M${x - 50} ${y - 12} l-12 -2 M${x - 50} ${y - 7} l-12 2`} fill="none" style={T} />
      <path class="cat-tail" d={`M${x + 44} ${y - 5} Q${x + 76} ${y - 2} ${x + 69} ${y - 30} Q${x + 64} ${y - 40} ${x + 57} ${y - 32}`} fill="none" style={{ ...S, transformOrigin: `${x + 44}px ${y - 5}px` }} />
      <path d={`M${x - 32} ${y + 2} q5 5 12 0 M${x - 7} ${y + 2} q5 5 12 0`} fill="var(--cat)" style={S} />
      {sleeping && (
        <g class="zzz" font-family="var(--font-hand)" fill="var(--line)">
          <text x={x + 24} y={y - 62} font-size="20" opacity="0.7">z</text>
          <text x={x + 38} y={y - 80} font-size="15" opacity="0.55">z</text>
          <text x={x + 48} y={y - 94} font-size="11" opacity="0.4">z</text>
        </g>
      )}
      <circle cx={x + 84} cy={y} r="11" fill="var(--g1)" style={S} />
      <path d={`M${x + 76} ${y - 5} q8 5 17 -2 M${x + 77} ${y + 5} q8 2 16 -5`} fill="none" style={T} />
    </g>
  );
}

function Rug({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} Q${x + 210} ${y - 18} ${x + 420} ${y + 2} Q${x + 432} ${y + 38} ${x + 408} ${y + 64} Q${x + 210} ${y + 80} ${x + 12} ${y + 64} Q${x - 10} ${y + 32} ${x} ${y} Z`} fill="var(--rug)" style={S} />
      <path d={`M${x + 20} ${y + 13} Q${x + 210} ${y - 4} ${x + 402} ${y + 15} M${x + 18} ${y + 52} Q${x + 210} ${y + 66} ${x + 400} ${y + 51}`} fill="none" style={{ ...T, strokeDasharray: '7 6' }} />
      {Array.from({ length: 10 }, (_, k) => <path d={`M${x + 42 + k * 38} ${y + 22} l10 10 l-10 10 l-10 -10 Z`} fill="var(--rugDeco)" opacity="0.85" />)}
      {Array.from({ length: 14 }, (_, k) => <path d={`M${x} ${y + 4 + k * 4.4} l-10 1 M${x + 420} ${y + 4 + k * 4.4} l10 1`} fill="none" style={T} />)}
    </g>
  );
}

function Broom({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} L${x + 30} ${y - 190}`} stroke="var(--woodDark)" stroke-width="7" />
      <path d={`M${x} ${y} L${x + 30} ${y - 190}`} fill="none" style={S} />
      <path d={`M${x - 18} ${y + 8} L${x - 10} ${y - 40} L${x + 14} ${y - 35} L${x + 22} ${y + 12} Z`} fill="var(--sun)" style={S} />
      <path d={`M${x - 8} ${y + 4} L${x - 4} ${y - 32} M${x + 2} ${y + 6} L${x + 3} ${y - 32} M${x + 12} ${y + 8} L${x + 9} ${y - 32}`} fill="none" style={T} />
    </g>
  );
}

function Walls({ x0, width }: { x0: number; width: number }) {
  return (
    <g>
      <rect x={x0} y="0" width={width} height={WALL_H} fill="var(--wall)" />
      {[[x0 + 300, 340], [x0 + 330, 356], [x0 + 760, 52], [x0 + 790, 68], [x0 + 730, 68], [x0 + 1080, 40], [x0 + 80, 30], [x0 + 560, 300]].map(([bx, by]) => (
        <rect x={bx} y={by} width="30" height="15" rx="3" fill="var(--brickLight)" style={T} />
      ))}
      {Array.from({ length: 16 }, (_, i) => {
        const cx = x0 + 20 + ((i * 271) % (width - 40)), cy = 20 + ((i * 113) % 420);
        return <path d={`M${cx} ${cy} q${(i % 5) - 2} ${4 + (i % 3)} ${6 + (i % 4)} ${7 + (i % 5)}`} fill="none" style={{ ...T, opacity: 0.25 }} />;
      })}
      <path d={`M${x0} 0 L${x0 + width} 0 L${x0 + width} 24 Q${x0 + width / 2} 30 ${x0} 24 Z`} fill="var(--woodDark)" style={S} />
      <path d={`M${x0} ${WALL_H - 10} Q${x0 + width / 2} ${WALL_H - 18} ${x0 + width} ${WALL_H - 8} L${x0 + width} ${WALL_H + 8} L${x0} ${WALL_H + 8} Z`} fill="var(--woodDark)" style={S} />
      <path d={`M${x0} ${WALL_H + 8} L${x0 + width} ${WALL_H + 8} L${x0 + width} 700 L${x0} 700 Z`} fill="var(--floor)" style={S} />
      {Array.from({ length: 22 }, (_, k) => {
        const xt = x0 + width / 2 + (k - 11) * 80, xb = x0 + width / 2 + (k - 11) * 170;
        return <path d={`M${xt} ${WALL_H + 8} L${xb} 700`} fill="none" style={{ ...T, opacity: 0.3 }} />;
      })}
      {[530, 580, 650].map((yy) => <path d={`M${x0} ${yy} Q${x0 + width / 2} ${yy - 4} ${x0 + width} ${yy + 1}`} fill="none" style={{ ...T, opacity: 0.18 }} />)}
    </g>
  );
}

/** Room 1 decor. Memoised: only redraws when the pinned designs change. */
export const Room = memo(function Room({ pins, room2, decor = [] }: { pins: Pin[]; room2: boolean; decor?: string[] }) {
  return (
    <g>
      <g filter="url(#wobble)">
        <Walls x0={0} width={1200} />
        <Window x={420} y={78} />
        <Pinboard x={700} y={90} pins={pins} />
        <Clock x={910} y={120} />
        <Rug x={370} y={600} />
        <Broom x={276} y={474} />
        {room2 && (
          <g>
            <Walls x0={1200} width={600} />
            <path d="M1170 470 L1170 210 Q1170 150 1200 150 Q1230 150 1230 210 L1230 470 Z" fill="var(--woodDark)" style={S} />
            <path d="M1180 470 L1180 214 Q1180 162 1200 162 Q1220 162 1220 214 L1220 470 Z" fill="var(--wall)" />
            <Window x={1420} y={90} />
            <Rug x={1300} y={610} />
          </g>
        )}
      </g>
      <DecorLayer placed={decor} />
      <StringLights x0={0} x1={room2 ? 1800 : 1200} />
      <HangingPlant x={340} />
      {room2 && <HangingPlant x={1680} />}
    </g>
  );
});
