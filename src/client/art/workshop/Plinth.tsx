import type { MasterworkRecord, Prestige } from '../../../shared/types';
import { inkStyle } from '../ink';
import { ScenePot } from './stations/Stations';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

export const PRESTIGE_COLOR: Record<Prestige, string> = { bronze: '#c98a55', silver: '#cfd4da', gold: 'var(--sun)' };
const STONE = '#e2dccf';
const PLAQUE_MAX = 12;

/** Free back-floor spot of room 1, between the drying rack and the glaze table: centre x, base y and column height. */
const SPOTS = [{ x: 610, y: 490, h: 50 }, { x: 678, y: 486, h: 66 }, { x: 746, y: 490, h: 50 }];

export const plaqueText = (name: string): string => (name.length > PLAQUE_MAX ? `${name.slice(0, PLAQUE_MAX - 1)}…` : name);

function Rosette({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <path d={`M${x - 3} ${y + 2} L${x - 7} ${y + 15} L${x - 3} ${y + 12} L${x} ${y + 16} Z M${x + 3} ${y + 2} L${x + 7} ${y + 15} L${x + 3} ${y + 12} L${x} ${y + 16} Z`} fill={color} style={inkStyle(1.1)} />
      <circle cx={x} cy={y} r="6.5" fill={color} style={inkStyle(1.3)} />
      <circle cx={x} cy={y} r="2.6" fill="#fff" opacity="0.7" />
    </g>
  );
}

function Plinth({ r, x, y, h, onClick }: { r: MasterworkRecord; x: number; y: number; h: number; onClick?: () => void }) {
  const top = y - h;
  const label = plaqueText(r.design.name);
  const pw = Math.min(64, Math.max(30, label.length * 4.9 + 8));
  const py = top + h - 22; // plaque sits on the column, so neighbouring plinths of different heights don't collide
  return (
    <g class="plinth" data-plinth={r.prestige} role={onClick ? 'button' : undefined} aria-label={onClick ? r.design.name : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}>
      <ellipse cx={x + 4} cy={y + 2} rx="26" ry="5" fill="url(#hatch)" opacity="0.5" />
      {/* base, column, capital */}
      <path d={`M${x - 22} ${y} L${x - 21} ${y - 9} L${x + 21} ${y - 9} L${x + 22} ${y} Z`} fill={STONE} style={S} />
      <path d={`M${x - 16} ${y - 9} L${x - 15} ${top + 8} L${x + 15} ${top + 8} L${x + 16} ${y - 9} Z`} fill={STONE} style={S} />
      <path d={`M${x + 7} ${y - 11} L${x + 7} ${top + 10}`} fill="none" style={{ ...T, opacity: 0.35 }} />
      <rect x={x + 8} y={top + 9} width="7" height={h - 19} fill="url(#hatch)" opacity="0.35" />
      <path d={`M${x - 21} ${top + 8} L${x - 20} ${top} L${x + 20} ${top} L${x + 21} ${top + 8} Z`} fill={STONE} style={S} />
      <ScenePot x={x} y={top + 1} size={42} design={r.design} color={r.glazeColor} effect={r.effect} quality={r.quality} />
      <Rosette x={x} y={top + 17} color={PRESTIGE_COLOR[r.prestige]} />
      {/* brass plaque */}
      <g transform={`rotate(${(x >> 2) % 2 ? -2 : 2} ${x} ${py})`}>
        <rect x={x - pw / 2} y={py - 8} width={pw} height="15" rx="2" fill="var(--paper)" style={inkStyle(1.3)} />
        <text x={x} y={py + 3} text-anchor="middle" font-size="10.5" font-family="var(--font-hand)" fill="var(--line)">{label}</text>
      </g>
    </g>
  );
}

/** The newest three masterworks, each on its own stone plinth with a prestige ribbon and a name plaque. */
export function Plinths({ records, onClick }: { records: MasterworkRecord[]; onClick?: () => void }) {
  const shown = records.slice(-SPOTS.length); // records are kept in the order they were finished
  if (shown.length === 0) return null;
  return <g class="plinths">{shown.map((r, i) => <Plinth r={r} x={SPOTS[i].x} y={SPOTS[i].y} h={SPOTS[i].h} onClick={onClick} />)}</g>;
}
