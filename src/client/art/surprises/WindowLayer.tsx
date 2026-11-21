/**
 * The outside of room 1's window, drawn by `Room` between the glass and the muntins/curtains/sill (its `outside` slot):
 * a wintry sky tint, the weather (December snow, rain streaks), then whatever later tasks put outside (`children`).
 * Everything is clipped to the glass. Sill actors belong above the room, not here.
 */
import type { ComponentChildren } from 'preact';
import { SPOTS } from '../../surprises/spots';
import type { SurpriseView } from '../../surprises/types';
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

export function WindowLayer({ sx, children }: { sx: SurpriseView; children?: ComponentChildren }) {
  const december = sx.calendar.includes('dezember');
  return (
    <g class="window-layer">
      <defs>
        <clipPath id="window-clip"><rect x={W.x} y={W.y} width={W.w} height={W.h} /></clipPath>
      </defs>
      <g clip-path="url(#window-clip)" data-surprise={december ? 'dezember' : undefined}>
        {december && <rect x={W.x} y={W.y} width={W.w} height={W.h} fill="#b9cddd" opacity="0.32" />}
        {december && <Snow still={sx.still} />}
        {sx.mood.rain && <Rain still={sx.still} />}
        {children}
      </g>
    </g>
  );
}
