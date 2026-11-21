/**
 * The outside of room 1's window, drawn by `Room` between the glass and the muntins/curtains/sill (its `outside` slot):
 * the light of the time of day (the sky colour itself is CSS on `.window-sky`), the night's moon and stars, New Year fireworks,
 * visitors on the outer sill (the owl, the morning birds), the weather (December snow, rain streaks), then whatever
 * later tasks put outside (`children`). Everything is clipped to the glass, so the curtains and the sill decor stay in front.
 */
import type { ComponentChildren } from 'preact';
import { inkStyle } from '../ink';
import { SPOTS } from '../../surprises/spots';
import type { Mood, SurpriseView } from '../../surprises/types';
import { showing } from './SurpriseLayer';
import './surprises.css';

const W = SPOTS.window;

/** Flakes as (x offset, y offset, radius) inside the glass; each loop draws its set twice, one glass-height apart, so the fall tiles. */
const NEAR: [number, number, number][] = [[18, 22, 4.6], [64, 70, 4], [112, 18, 4.8], [150, 96, 4.2], [184, 44, 4.4], [38, 132, 4.2], [132, 150, 4.6]];
const FAR: [number, number, number][] = [[8, 60, 2.8], [48, 8, 2.6], [88, 112, 3], [122, 66, 2.6], [168, 140, 2.8], [194, 104, 2.4], [76, 166, 2.6]];

function Flakes({ set, dy = 0 }: { set: [number, number, number][]; dy?: number }) {
  return <>{set.map(([fx, fy, r]) => <circle class="flake" cx={W.x + fx} cy={W.y + fy + dy} r={r} fill="#fff" stroke="#9db7cb" stroke-width="1" />)}</>;
}

/** About fourteen flakes in two loops (near and far); still: one copy of each set, resting in place. */
function Snow({ still }: { still: boolean }) {
  if (still) {
    return <g class="snow still"><Flakes set={FAR} /><Flakes set={NEAR} /></g>;
  }
  return (
    <g class="snow">
      <g class="snow-loop far"><Flakes set={FAR} /><Flakes set={FAR} dy={-W.h} /></g>
      <g class="snow-loop near"><Flakes set={NEAR} /><Flakes set={NEAR} dy={-W.h} /></g>
    </g>
  );
}

const STREAKS: [number, number][] = [[14, 20], [46, 92], [78, 40], [108, 128], [140, 70], [172, 10], [190, 150], [30, 156], [96, 4], [158, 112]];

/** Thin slanted streaks and a grey wash; still: the streaks stay put. */
function Rain({ still }: { still: boolean }) {
  return (
    <g data-rain>
      <rect x={W.x} y={W.y} width={W.w} height={W.h} fill="#7d8b99" opacity="0.28" />
      <g class={still ? 'rain still' : 'rain rain-loop'}>
        {[0, -W.h].map((dy) => STREAKS.map(([sx, sy]) => <path d={`M${W.x + sx} ${W.y + sy + dy} l-5 14`} stroke="#eaf3fa" stroke-width="2" stroke-linecap="round" opacity="0.85" />))}
      </g>
    </g>
  );
}

/** The glass's tint for the time of day: warm at evening, deep blue at night (hills darken), a breath of peach in the morning. */
const TINT: Record<Mood['daypart'], [string, number] | null> = { morning: ['#ffd9b8', 0.18], day: null, evening: ['#f08a6a', 0.2], night: ['#1d2748', 0.42] };

/** Night: a sleepy crescent moon where the sun stands by day, and a few twinkling stars. */
function NightSky() {
  const mx = W.x + 150, my = W.y + 44;
  const stars: [number, number, number][] = [[22, 18, 3.4], [68, 30, 2.6], [112, 14, 3], [184, 22, 2.4], [96, 70, 2.2], [34, 84, 2.6], [178, 88, 3]];
  return (
    <g class="night-sky">
      <circle cx={mx} cy={my} r="26" fill="#fff6d8" opacity="0.18" />
      <path data-moon d={`M${mx + 4} ${my - 18} A18 18 0 1 0 ${mx + 4} ${my + 18} A7 18 0 0 1 ${mx + 4} ${my - 18} Z`} fill="#fbf1cf" style={inkStyle(1.4)} />
      <path d={`M${mx - 11.6} ${my - 3} q2.2 2.2 4.4 0`} fill="none" stroke="var(--line)" stroke-width="1.3" stroke-linecap="round" />
      <ellipse cx={mx - 8.6} cy={my + 4} rx="2.4" ry="1.4" fill="var(--cheek)" opacity="0.8" />
      {stars.map(([sx, sy, r], i) => (
        <path data-star class="star" style={{ animationDelay: `${i * 0.7}s` }}
          d={`M${W.x + sx} ${W.y + sy - r * 1.6} Q${W.x + sx} ${W.y + sy} ${W.x + sx + r * 1.6} ${W.y + sy} Q${W.x + sx} ${W.y + sy} ${W.x + sx} ${W.y + sy + r * 1.6} Q${W.x + sx} ${W.y + sy} ${W.x + sx - r * 1.6} ${W.y + sy} Q${W.x + sx} ${W.y + sy} ${W.x + sx} ${W.y + sy - r * 1.6} Z`}
          fill="#fff3b8" />
      ))}
    </g>
  );
}

/** One firework burst centred on (x, y): twelve rays and a ring of sparks. */
export function Burst({ x, y, r, color, cls }: { x: number; y: number; r: number; color: string; cls?: string }) {
  return (
    <g data-burst class={cls}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6, c = Math.cos(a), s = Math.sin(a);
        return <path d={`M${(x + c * r * 0.35).toFixed(1)} ${(y + s * r * 0.35).toFixed(1)} L${(x + c * r * 0.8).toFixed(1)} ${(y + s * r * 0.8).toFixed(1)}`} stroke={color} stroke-width="2.6" stroke-linecap="round" />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 0.5) * Math.PI) / 6;
        return <circle cx={(x + Math.cos(a) * r).toFixed(1)} cy={(y + Math.sin(a) * r).toFixed(1)} r="1.8" fill={color} />;
      })}
      <circle cx={x} cy={y} r="2.6" fill="#fffbe6" />
    </g>
  );
}

/** New Year: small bursts in three colours over the hills, staggered; still: two frozen bursts. */
function Fireworks({ still }: { still: boolean }) {
  if (still) {
    return (
      <g data-surprise="silvester" class="fireworks still">
        <Burst x={W.x + 52} y={W.y + 48} r={26} color="#ff8fb1" />
        <Burst x={W.x + 128} y={W.y + 104} r={22} color="#ffd166" />
      </g>
    );
  }
  return (
    <g data-surprise="silvester" class="fireworks">
      <Burst x={W.x + 52} y={W.y + 48} r={26} color="#ff8fb1" cls="burst b1" />
      <Burst x={W.x + 150} y={W.y + 60} r={24} color="#ffd166" cls="burst b2" />
      <Burst x={W.x + 104} y={W.y + 116} r={21} color="#8fd3ff" cls="burst b3" />
    </g>
  );
}

const OWL = '#b98a5e', OWL_DARK = '#8f6542', OWL_BELLY = '#f1dfbf';

/** A round owl sitting on the outer sill at (x, y) (between its feet): ear tufts, big eyes, a slow blink and a head tilt. */
export function Owl({ x, y, still }: { x: number; y: number; still: boolean }) {
  const eye = (ex: number) => (
    <g>
      <circle cx={ex} cy={y - 36} r="7.6" fill="#fffaf0" style={inkStyle(1.3)} />
      <circle cx={ex + 0.6} cy={y - 35.6} r="2.6" fill="var(--line)" />
      <circle cx={ex + 1.6} cy={y - 37} r="0.9" fill="#fff" />
      {!still && <ellipse class="owl-lid" cx={ex} cy={y - 36} rx="8.4" ry="8.4" fill={OWL} style={inkStyle(1.3)} />}
    </g>
  );
  return (
    <g class={`owl${still ? ' still' : ''}`}>
      <ellipse cx={x} cy={y - 1} rx="17" ry="2.6" fill="url(#hatch)" opacity="0.4" />
      {/* body with a pale belly and chevrons, wings folded */}
      <path d={`M${x - 17} ${y - 18} Q${x - 19} ${y - 2} ${x} ${y - 1} Q${x + 19} ${y - 2} ${x + 17} ${y - 18} Q${x + 16} ${y - 34} ${x} ${y - 34} Q${x - 16} ${y - 34} ${x - 17} ${y - 18} Z`} fill={OWL} style={inkStyle(2)} />
      <path d={`M${x - 9} ${y - 14} Q${x - 10} ${y - 3} ${x} ${y - 3} Q${x + 10} ${y - 3} ${x + 9} ${y - 14} Q${x + 8} ${y - 24} ${x} ${y - 24} Q${x - 8} ${y - 24} ${x - 9} ${y - 14} Z`} fill={OWL_BELLY} style={inkStyle(1.1)} />
      {[[-4, -17], [4, -17], [0, -12], [-4, -8], [4, -8]].map(([dx, dy]) => <path d={`M${x + dx - 2} ${y + dy} q2 2 4 0`} fill="none" stroke={OWL_DARK} stroke-width="1.2" stroke-linecap="round" />)}
      <path d={`M${x - 16} ${y - 22} Q${x - 22} ${y - 10} ${x - 13} ${y - 4}`} fill="none" stroke={OWL_DARK} stroke-width="1.6" stroke-linecap="round" />
      <path d={`M${x + 16} ${y - 22} Q${x + 22} ${y - 10} ${x + 13} ${y - 4}`} fill="none" stroke={OWL_DARK} stroke-width="1.6" stroke-linecap="round" />
      <path d={`M${x - 6} ${y - 1} l0 2 M${x - 3} ${y - 1} l0 2 M${x + 3} ${y - 1} l0 2 M${x + 6} ${y - 1} l0 2`} stroke="#e0a03c" stroke-width="2.2" stroke-linecap="round" />
      {/* the head, which tilts */}
      <g class="owl-head">
        <path d={`M${x - 18} ${y - 48} L${x - 15} ${y - 60} L${x - 7} ${y - 51} Q${x} ${y - 54} ${x + 7} ${y - 51} L${x + 15} ${y - 60} L${x + 18} ${y - 48} Q${x + 22} ${y - 30} ${x} ${y - 25} Q${x - 22} ${y - 30} ${x - 18} ${y - 48} Z`} fill={OWL} style={inkStyle(2)} />
        <path d={`M${x - 15} ${y - 57} l2 4 M${x + 15} ${y - 57} l-2 4`} stroke={OWL_DARK} stroke-width="1.4" stroke-linecap="round" />
        {eye(x - 8)}
        {eye(x + 8)}
        <path d={`M${x - 2.6} ${y - 31} L${x + 2.6} ${y - 31} L${x} ${y - 26.6} Z`} fill="#e0a03c" style={inkStyle(1)} />
        <ellipse cx={x - 13} cy={y - 28.6} rx="3" ry="1.8" fill="var(--cheek)" opacity="0.75" />
        <ellipse cx={x + 13} cy={y - 28.6} rx="3" ry="1.8" fill="var(--cheek)" opacity="0.75" />
      </g>
    </g>
  );
}

const BIRD_COLORS = ['var(--g1)', 'var(--g3)', 'var(--sun)'];

/** A round little songbird sitting at (x, y), facing right unless `flip`; `beak` open while it sings. */
export function SillBird({ x, y, color, flip, beak = true }: { x: number; y: number; color: string; flip?: boolean; beak?: boolean }) {
  return (
    <g transform={flip ? `translate(${2 * x} 0) scale(-1 1)` : undefined}>
      <path d={`M${x - 8} ${y - 7} L${x - 14} ${y - 12} L${x - 12} ${y - 4} Z`} fill={color} style={inkStyle(1.1)} />
      <ellipse cx={x} cy={y - 8} rx="9.5" ry="8" fill={color} style={inkStyle(1.5)} />
      <path d={`M${x - 5} ${y - 9} q4 4 8 0`} fill="none" style={inkStyle(1)} />
      <path d={`M${x - 2} ${y} l-1 2.6 M${x + 2} ${y} l1 2.6`} stroke="#e0a03c" stroke-width="1.4" stroke-linecap="round" />
      <circle cx={x + 4.4} cy={y - 11} r="1.2" fill="var(--line)" />
      <ellipse cx={x + 4.6} cy={y - 7.6} rx="1.8" ry="1.1" fill="var(--cheek)" opacity="0.8" />
      <path d={beak ? `M${x + 8.6} ${y - 11} l4.2 -1.4 l-4 1.2 l4 2 Z` : `M${x + 8.6} ${y - 11} l4 1 l-4 1.6 Z`} fill="#e0a03c" style={inkStyle(0.8)} />
    </g>
  );
}

/** A tiny eighth note. */
function Note({ x, y, cls }: { x: number; y: number; cls?: string }) {
  return (
    <g class={cls}>
      <ellipse cx={x} cy={y} rx="2.8" ry="2.1" fill="var(--line)" transform={`rotate(-20 ${x} ${y})`} />
      <path d={`M${x + 2.4} ${y - 0.6} L${x + 2.4} ${y - 11} q3 1.4 4.4 4.6`} fill="none" stroke="var(--line)" stroke-width="1.3" stroke-linecap="round" />
    </g>
  );
}

/** Three little birds on the outer sill, hopping in turn, tiny notes rising; still: they sit, notes in the air. */
function MorningBirds({ still }: { still: boolean }) {
  const y = W.y + W.h - 1;
  const birds: [number, boolean][] = [[W.x + 38, false], [W.x + 70, true], [W.x + 160, true]];
  return (
    <g data-surprise="morgenvoegel" class={`morning-birds${still ? ' still' : ''}`}>
      {birds.map(([bx, flip], i) => (
        <g class="bird-hop" style={{ animationDelay: `${i * 0.45}s` }}>
          <g transform={`translate(${bx} ${y}) scale(1.35) translate(${-bx} ${-y})`}>
            <ellipse cx={bx} cy={y + 0.4} rx="9" ry="1.6" fill="url(#hatch)" opacity="0.4" />
            <SillBird x={bx} y={y} color={BIRD_COLORS[i]!} flip={flip} />
          </g>
        </g>
      ))}
      <Note x={W.x + 54} y={y - 34} cls="note" />
      <Note x={W.x + 146} y={y - 38} cls="note n2" />
      <Note x={W.x + 84} y={y - 48} cls="note n3" />
    </g>
  );
}

export function WindowLayer({ sx, children }: { sx: SurpriseView; children?: ComponentChildren }) {
  const december = sx.calendar.includes('dezember');
  const tint = TINT[sx.mood.daypart];
  const owl = sx.plays.some((p) => p.id === 'eule');
  const birds = sx.plays.some((p) => p.id === 'morgenvoegel');
  return (
    <g class="window-layer">
      <defs>
        <clipPath id="window-clip"><rect x={W.x} y={W.y} width={W.w} height={W.h} /></clipPath>
      </defs>
      <g clip-path="url(#window-clip)" data-surprise={december ? 'dezember' : undefined}>
        {tint && <rect class="window-tint" x={W.x} y={W.y} width={W.w} height={W.h} fill={tint[0]} opacity={tint[1]} />}
        {sx.mood.daypart === 'night' && <NightSky />}
        {december && <rect x={W.x} y={W.y} width={W.w} height={W.h} fill="#b9cddd" opacity={sx.mood.daypart === 'night' ? 0.12 : 0.32} />}
        {showing(sx, 'silvester') && <Fireworks still={sx.still} />}
        {(owl || birds) && (
          <g data-sill>
            {owl && <g data-surprise="eule"><Owl x={W.x + 58} y={W.y + W.h} still={sx.still} /></g>}
            {birds && <MorningBirds still={sx.still} />}
          </g>
        )}
        {december && <Snow still={sx.still} />}
        {sx.mood.rain && <Rain still={sx.still} />}
        {children}
      </g>
    </g>
  );
}
