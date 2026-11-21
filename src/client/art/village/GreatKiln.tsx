import { memo } from 'preact/compat';
import type { GreatKiln } from '../../../shared/village/types';
import { GREAT_KILN_CAPACITY } from '../../../shared/village/kilnRules';
import { inkStyle } from '../ink';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

export type KilnPhase = 'idle' | 'loading' | 'firing';

/** What the map shows of the great kiln right now. */
export function kilnPhase(k: GreatKiln, now: number): KilnPhase {
  if (k.doneAt !== null || (k.firesAt !== null && k.firesAt <= now)) return 'firing';
  return k.loads.length ? 'loading' : 'idle';
}

export const kilnFill = (k: GreatKiln): number => Math.min(1, k.loads.reduce((n, l) => n + l.count, 0) / GREAT_KILN_CAPACITY);

const POT_COLORS = ['var(--g1)', 'var(--g3)', 'var(--g2)', 'var(--g5)', 'var(--g4)', '#fffaf0'];
/** Slots in the open door, front row first. */
const POT_SLOTS = [[-12, -10], [4, -10], [18, -10], [-6, -28], [10, -28], [2, -45]];

function Pot({ x, y, c }: { x: number; y: number; c: string }) {
  return <path d={`M${x - 5} ${y} Q${x - 8} ${y - 8} ${x - 3} ${y - 12} L${x - 3} ${y - 15} L${x + 3} ${y - 15} L${x + 3} ${y - 12} Q${x + 8} ${y - 8} ${x + 5} ${y} Z`} fill={c} style={inkStyle(1.3)} />;
}

function Woodpile({ x, y }: { x: number; y: number }) {
  const logs = [[0, -8], [16, -8], [32, -8], [8, -23], [24, -23], [16, -38]];
  return (
    <g>
      <ellipse cx={x + 16} cy={y + 2} rx="30" ry="6" fill="url(#hatch)" opacity="0.4" />
      {logs.map(([dx, dy]) => <g><circle cx={x + dx} cy={y + dy} r="8" fill="var(--wood)" style={inkStyle(1.6)} /><circle cx={x + dx} cy={y + dy} r="3.5" fill="none" style={T} /></g>)}
    </g>
  );
}

/** The village's great wood kiln: a domed brick oven with a chimney and a woodpile. (x, y) = centre of the ground line. */
function GreatKilnDrawing({ x, y, phase, fill }: { x: number; y: number; phase: KilnPhase; fill: number }) {
  const pots = phase === 'loading' ? Math.max(1, Math.min(POT_SLOTS.length, Math.round(fill * POT_SLOTS.length))) : 0;
  const door = `M${x - 24} ${y - 8} L${x - 24} ${y - 40} Q${x - 24} ${y - 64} ${x} ${y - 64} Q${x + 24} ${y - 64} ${x + 24} ${y - 40} L${x + 24} ${y - 8} Z`;
  const dome = `M${x - 72} ${y - 8} L${x - 72} ${y - 48} Q${x - 70} ${y - 124} ${x} ${y - 126} Q${x + 70} ${y - 124} ${x + 72} ${y - 48} L${x + 72} ${y - 8} Z`;
  const clip = `kiln-bricks-${x}-${y}`;
  return (
    <g class={`great-kiln kiln-${phase}`} data-kiln={phase}>
      <ellipse cx={x + 10} cy={y + 4} rx="118" ry="20" fill="url(#hatch)" opacity="0.35" />
      {phase === 'firing' && <ellipse class="kiln-glow" cx={x} cy={y - 40} rx="110" ry="80" fill="url(#glow)" opacity="0.7" />}
      <g filter="url(#wobble-soft)">
        {/* chimney behind the dome */}
        <path d={`M${x + 26} ${y - 100} L${x + 28} ${y - 160} L${x + 50} ${y - 160} L${x + 52} ${y - 90} Z`} fill="var(--kilnDark)" style={S} />
        <path d={`M${x + 23} ${y - 160} L${x + 55} ${y - 160} L${x + 55} ${y - 168} L${x + 23} ${y - 168} Z`} fill="var(--kiln)" style={inkStyle(1.8)} />
        <path d={dome} fill="var(--brickLight)" style={S} />
        <clipPath id={clip}><path d={dome} /></clipPath>
        <g clip-path={`url(#${clip})`} fill="none" stroke="var(--kilnDark)" stroke-width="1.3" opacity="0.55">
          {Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => <rect x={x - 84 + c * 26 + (r % 2) * 13} y={y - 30 - r * 16} width="21" height="11" rx="2" />))}
        </g>
        <path d={dome} fill="none" style={S} />
        {/* stone footing */}
        <path d={`M${x - 80} ${y} L${x - 78} ${y - 12} L${x + 78} ${y - 12} L${x + 80} ${y} Z`} fill="#cfc3b0" style={S} />
        {[-56, -20, 16, 52].map((dx) => <path d={`M${x + dx} ${y - 12} l2 12`} style={T} />)}
        {/* door arch */}
        <path d={`M${x - 32} ${y - 8} L${x - 32} ${y - 40} Q${x - 32} ${y - 72} ${x} ${y - 72} Q${x + 32} ${y - 72} ${x + 32} ${y - 40} L${x + 32} ${y - 8} Z`} fill="var(--kiln)" style={S} />
        <path d={door} fill={phase === 'firing' ? 'var(--fire)' : 'var(--kilnInside)'} style={S} />
        {/* heat gauge, like the workshop kiln */}
        <circle cx={x + 46} cy={y - 74} r="11" fill="#fffaf0" style={inkStyle(1.8)} />
        <path d={`M${x + 46} ${y - 74} L${phase === 'firing' ? x + 53 : x + 39} ${y - 79}`} stroke="var(--kilnDark)" stroke-width="2" stroke-linecap="round" />
        <Woodpile x={x - 116} y={y} />
      </g>
      {phase === 'idle' && (
        <g>
          <path d={door} fill="var(--wood)" style={S} />
          <path d={`M${x - 8} ${y - 8} L${x - 8} ${y - 62} M${x + 8} ${y - 8} L${x + 8} ${y - 62}`} style={T} />
          <path d={`M${x - 22} ${y - 30} L${x + 22} ${y - 30}`} stroke="var(--woodDark)" stroke-width="4" />
        </g>
      )}
      {phase === 'loading' && (
        <g>
          {POT_SLOTS.slice(0, pots).map(([dx, dy], i) => <Pot x={x + dx} y={y + dy} c={POT_COLORS[i]} />)}
          {/* the door leans against the kiln while it is open */}
          <g transform={`rotate(-12 ${x + 62} ${y})`}><path d={`M${x + 48} ${y} L${x + 48} ${y - 40} Q${x + 48} ${y - 56} ${x + 64} ${y - 56} Q${x + 80} ${y - 56} ${x + 80} ${y - 40} L${x + 80} ${y} Z`} fill="var(--wood)" style={inkStyle(1.8)} /></g>
        </g>
      )}
      {phase === 'firing' && (
        <g>
          <g class="kiln-flame" style={{ transformOrigin: `${x}px ${y - 8}px` }}>
            <path d={`M${x - 18} ${y - 8} Q${x - 20} ${y - 30} ${x - 8} ${y - 44} Q${x - 6} ${y - 30} ${x} ${y - 34} Q${x + 2} ${y - 52} ${x + 12} ${y - 56} Q${x + 10} ${y - 38} ${x + 20} ${y - 30} Q${x + 22} ${y - 18} ${x + 18} ${y - 8} Z`} fill="var(--kiln)" style={inkStyle(1.4)} />
            <path d={`M${x - 8} ${y - 8} Q${x - 10} ${y - 22} ${x} ${y - 30} Q${x + 10} ${y - 22} ${x + 8} ${y - 8} Z`} fill="var(--fireCore)" />
          </g>
          {[0, 1, 2].map((i) => <circle class="smoke" cx={x + 39} cy={y - 182} r={9 + i * 3} fill="var(--smoke)" style={{ ...inkStyle(1.4), animationDelay: `${i * 0.9}s` }} />)}
        </g>
      )}
      <text x={x} y={y + 30} text-anchor="middle" font-size="18" font-family="var(--font-hand)" fill="var(--line)">Gemeinschaftsofen</text>
    </g>
  );
}

/** Only redraws when the phase or the fill changes, not on every clock tick. */
export const GreatKilnArt = memo(GreatKilnDrawing);
