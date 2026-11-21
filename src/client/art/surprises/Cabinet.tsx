import { inkStyle } from '../ink';
import './surprises.css';

const S = inkStyle(2.2);
const D = inkStyle(1.2);
const GOLD = '#e9b949';

/** One shelf object per this many album entries. */
export const CABINET_STEP = 6;

type Curio = (cx: number, base: number) => preact.JSX.Element;

/** feather, shell, tiny pot, acorn, key, star: in the order they appear. */
const CURIOS: [string, Curio][] = [
  ['feather', (cx, b) => (
    <g>
      <path d={`M${cx - 5} ${b} Q${cx - 6} ${b - 10} ${cx + 1} ${b - 17} Q${cx + 7} ${b - 12} ${cx + 2} ${b - 4} Q${cx - 1} ${b - 1} ${cx - 5} ${b} Z`} fill="var(--g4)" style={D} />
      <path d={`M${cx - 5} ${b + 1} Q${cx - 2} ${b - 8} ${cx + 1} ${b - 15}`} fill="none" style={D} />
    </g>
  )],
  ['shell', (cx, b) => (
    <g>
      <path d={`M${cx - 8} ${b - 6} Q${cx} ${b - 18} ${cx + 8} ${b - 6} L${cx + 2} ${b} L${cx - 2} ${b} Z`} fill="#f7c9b8" style={D} />
      <path d={`M${cx} ${b - 1} L${cx} ${b - 13} M${cx - 1.5} ${b - 1} L${cx - 5} ${b - 10} M${cx + 1.5} ${b - 1} L${cx + 5} ${b - 10}`} fill="none" stroke="#d88f7a" stroke-width="1" stroke-linecap="round" />
    </g>
  )],
  ['pot', (cx, b) => (
    <g>
      <path d={`M${cx - 3} ${b - 15} L${cx + 3} ${b - 15} L${cx + 2} ${b - 12} Q${cx + 8} ${b - 8} ${cx + 5} ${b - 2} Q${cx + 4} ${b} ${cx} ${b} Q${cx - 4} ${b} ${cx - 5} ${b - 2} Q${cx - 8} ${b - 8} ${cx - 2} ${b - 12} Z`} fill="var(--g1)" style={D} />
      <path d={`M${cx - 3} ${b - 8} Q${cx - 4} ${b - 5} ${cx - 2} ${b - 3}`} fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" />
    </g>
  )],
  ['acorn', (cx, b) => (
    <g>
      <path d={`M${cx - 5} ${b - 9} Q${cx - 5} ${b} ${cx} ${b} Q${cx + 5} ${b} ${cx + 5} ${b - 9} Z`} fill="var(--clay)" style={D} />
      <path d={`M${cx - 7} ${b - 9} Q${cx - 6} ${b - 15} ${cx} ${b - 15} Q${cx + 6} ${b - 15} ${cx + 7} ${b - 9} Z`} fill="var(--woodDark)" style={D} />
      <path d={`M${cx} ${b - 15} L${cx + 1} ${b - 18}`} fill="none" style={D} />
    </g>
  )],
  ['key', (cx, b) => (
    <g transform={`rotate(-28 ${cx} ${b - 7})`}>
      <circle cx={cx - 5} cy={b - 7} r="3.8" fill="none" stroke="var(--line)" stroke-width="3.6" />
      <circle cx={cx - 5} cy={b - 7} r="3.8" fill="none" stroke={GOLD} stroke-width="1.8" />
      <path d={`M${cx - 1} ${b - 7} L${cx + 9} ${b - 7} M${cx + 6} ${b - 7} L${cx + 6} ${b - 4} M${cx + 9} ${b - 7} L${cx + 9} ${b - 4}`} fill="none" stroke="var(--line)" stroke-width="3.4" stroke-linecap="round" />
      <path d={`M${cx - 1} ${b - 7} L${cx + 9} ${b - 7} M${cx + 6} ${b - 7} L${cx + 6} ${b - 4} M${cx + 9} ${b - 7} L${cx + 9} ${b - 4}`} fill="none" stroke={GOLD} stroke-width="1.6" stroke-linecap="round" />
    </g>
  )],
  ['star', (cx, b) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? 3 : 7;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      return `${(cx + Math.cos(a) * r).toFixed(1)},${(b - 10 + Math.sin(a) * r).toFixed(1)}`;
    });
    return (
      <g>
        <path d={`M${cx - 3} ${b} L${cx + 3} ${b} L${cx + 1} ${b - 4} L${cx - 1} ${b - 4} Z`} fill="var(--woodDark)" style={inkStyle(1)} />
        <polygon points={pts.join(' ')} fill="var(--sun)" style={D} />
      </g>
    );
  }],
];

function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  return <path d={`M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z`} fill="var(--sun)" style={inkStyle(1.1)} />;
}

/**
 * A small wall curio cabinet: arched crown, three shelves behind two glass doors.
 * `x` is the centre, `y` the top of the crown; its hit area spans x±34 and y-14…y+104.
 * Clickable (role button, Enter/Space) only when `onClick` is given.
 */
export function Cabinet({ x, y, found, fresh, onClick }: { x: number; y: number; found: number; fresh: boolean; onClick?: () => void }) {
  const shown = CURIOS.slice(0, Math.min(CURIOS.length, Math.floor(found / CABINET_STEP)));
  const shelves = [y + 42, y + 65, y + 88];
  return (
    <g class="cabinet" data-cabinet="" data-hit="cabinet" role={onClick ? 'button' : undefined} aria-label={onClick ? 'Kuriositätenkabinett' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } } : undefined}>
      <rect x={x - 34} y={y - 14} width="68" height="118" fill="transparent" />
      {/* nail and hanging cord */}
      <path d={`M${x - 18} ${y + 2} L${x} ${y - 10} L${x + 18} ${y + 2}`} fill="none" style={D} />
      <circle cx={x} cy={y - 10} r="2.6" fill="var(--line)" />
      {/* shadow on the wall */}
      <rect x={x - 24} y={y + 16} width="58" height="88" rx="4" fill="url(#hatch)" opacity="0.35" />
      {/* crown */}
      <path d={`M${x - 32} ${y + 15} Q${x - 32} ${y + 6} ${x - 22} ${y + 6} Q${x - 12} ${y + 6} ${x} ${y - 2} Q${x + 12} ${y + 6} ${x + 22} ${y + 6} Q${x + 32} ${y + 6} ${x + 32} ${y + 15} Z`} fill="var(--wood)" style={S} />
      <path d={`M${x - 4} ${y + 9} Q${x - 4} ${y + 5} ${x} ${y + 7} Q${x + 4} ${y + 5} ${x + 4} ${y + 9} Q${x + 3} ${y + 12} ${x} ${y + 14} Q${x - 3} ${y + 12} ${x - 4} ${y + 9} Z`} fill="var(--g3)" style={inkStyle(1)} />
      {/* body and inner back */}
      <rect x={x - 29} y={y + 14} width="58" height="82" rx="3" fill="var(--wood)" style={S} />
      <rect x={x - 24} y={y + 20} width="48" height="68" rx="1.5" fill="#f1dcb9" />
      <rect x={x - 24} y={y + 20} width="48" height="68" rx="1.5" fill="url(#hatch-light)" opacity="0.5" />
      {shelves.map((sy) => <path d={`M${x - 24} ${sy} L${x + 24} ${sy}`} fill="none" stroke="var(--woodDark)" stroke-width="3" />)}
      {shown.map(([id, draw], i) => <g data-curio={id}>{draw(x + (i % 2 ? 12 : -12), shelves[Math.floor(i / 2)] - 1.5)}</g>)}
      {/* glass doors */}
      {[x - 24, x].map((dx) => (
        <g>
          <rect x={dx} y={y + 20} width="24" height="68" rx="1.5" fill="#cfe6f0" opacity="0.28" />
          <rect x={dx} y={y + 20} width="24" height="68" rx="1.5" fill="none" style={inkStyle(1.8)} />
          <path d={`M${dx + 5} ${y + 34} L${dx + 13} ${y + 26} M${dx + 5} ${y + 42} L${dx + 9} ${y + 38}`} fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.85" />
        </g>
      ))}
      <circle cx={x - 4} cy={y + 56} r="2.4" fill={GOLD} style={inkStyle(1)} />
      <circle cx={x + 4} cy={y + 56} r="2.4" fill={GOLD} style={inkStyle(1)} />
      {/* base moulding with a little scalloped apron */}
      <path d={`M${x - 32} ${y + 95} L${x + 32} ${y + 95} L${x + 30} ${y + 101} L${x - 30} ${y + 101} Z`} fill="var(--woodDark)" style={S} />
      <path d={`M${x - 18} ${y + 101} Q${x - 12} ${y + 108} ${x - 6} ${y + 101} Q${x} ${y + 108} ${x + 6} ${y + 101} Q${x + 12} ${y + 108} ${x + 18} ${y + 101} Z`} fill="var(--wood)" style={inkStyle(1.6)} />
      {fresh && (
        <g class="cabinet-sparkle">
          <Sparkle x={x + 25} y={y + 2} r={6} />
          <Sparkle x={x - 29} y={y + 30} r={4.5} />
          <Sparkle x={x + 29} y={y + 66} r={4} />
        </g>
      )}
    </g>
  );
}
