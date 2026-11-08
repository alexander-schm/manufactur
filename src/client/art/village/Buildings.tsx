import { BUILDINGS } from '../../../shared/village/buildings';
import { inkStyle } from '../ink';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

function Tongrube({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y - 14} rx="86" ry="34" fill="var(--clayDark)" style={S} />
      <ellipse cx={x} cy={y - 18} rx="66" ry="22" fill="var(--clay)" />
      <path d={`M${x - 40} ${y - 18} q10 -6 22 0 q12 -8 26 0 M${x - 20} ${y - 8} q14 -4 30 0`} fill="none" style={T} />
      <path d={`M${x + 50} ${y - 30} L${x + 80} ${y - 74}`} stroke="var(--woodDark)" stroke-width="5" />
      <path d={`M${x + 76} ${y - 78} l12 -8 l6 12 Z`} fill="#9aa4ad" style={inkStyle(1.6)} />
      <path d={`M${x - 92} ${y - 30} L${x - 70} ${y - 30} L${x - 66} ${y - 6} L${x - 96} ${y - 6} Z`} fill="var(--wood)" style={S} />
      <circle cx={x - 90} cy={y - 2} r="5" fill="var(--woodDark)" style={inkStyle(1.4)} />
    </g>
  );
}

function Markthalle({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 100} ${y - 70} L${x} ${y - 120} L${x + 100} ${y - 70} Z`} fill="var(--kiln)" style={S} />
      {Array.from({ length: 5 }, (_, i) => <path d={`M${x - 90 + i * 45} ${y - 70} L${x - 90 + i * 45} ${y}`} stroke="var(--woodDark)" stroke-width="7" />)}
      <path d={`M${x - 100} ${y - 70} L${x + 100} ${y - 70}`} style={S} />
      {Array.from({ length: 8 }, (_, i) => <path d={`M${x - 100 + i * 25} ${y - 70} l12.5 14 l12.5 -14`} fill={i % 2 ? '#fdf6e8' : 'var(--g3)'} style={inkStyle(1.4)} />)}
      <path d={`M${x - 80} ${y - 22} L${x + 80} ${y - 22}`} stroke="var(--wood)" stroke-width="8" />
      {[-60, -20, 20, 60].map((dx, i) => <path d={`M${x + dx - 8} ${y - 26} q0 -14 8 -16 q8 2 8 16 Z`} fill={['var(--g1)', 'var(--g5)', 'var(--g2)', 'var(--g4)'][i]} style={inkStyle(1.4)} />)}
    </g>
  );
}

function Glasurbibliothek({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 46} ${y} L${x - 46} ${y - 130} L${x + 46} ${y - 130} L${x + 46} ${y} Z`} fill="#e8dcc4" style={S} />
      {Array.from({ length: 6 }, (_, r) => Array.from({ length: 3 }, (_, c) => <rect x={x - 42 + c * 30 + (r % 2) * 12} y={y - 124 + r * 20} width="24" height="12" rx="2" fill="none" style={T} />))}
      <path d={`M${x - 56} ${y - 128} L${x} ${y - 186} L${x + 56} ${y - 128} Z`} fill="var(--g4)" style={S} />
      <circle cx={x} cy={y - 96} r="16" fill="var(--sky)" style={S} />
      <path d={`M${x} ${y - 112} L${x} ${y - 80} M${x - 16} ${y - 96} L${x + 16} ${y - 96}`} style={inkStyle(1.4)} />
      <path d={`M${x - 14} ${y} L${x - 14} ${y - 36} Q${x} ${y - 48} ${x + 14} ${y - 36} L${x + 14} ${y} Z`} fill="var(--woodDark)" style={S} />
      {[0, 1, 2].map((i) => <rect x={x + 22 + i * 8} y={y - 22} width="7" height="22" fill={['var(--g1)', 'var(--g3)', 'var(--g5)'][i]} style={inkStyle(1.2)} />)}
    </g>
  );
}

function Gildenhaus({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 90} ${y} L${x - 90} ${y - 96} L${x + 90} ${y - 96} L${x + 90} ${y} Z`} fill="#fbf0dc" style={S} />
      <path d={`M${x - 90} ${y - 48} L${x + 90} ${y - 48} M${x - 45} ${y - 96} L${x - 45} ${y} M${x + 45} ${y - 96} L${x + 45} ${y}`} stroke="var(--woodDark)" stroke-width="6" />
      <path d={`M${x - 90} ${y} L${x - 90} ${y - 96} L${x + 90} ${y - 96} L${x + 90} ${y} Z`} fill="none" style={S} />
      <path d={`M${x - 106} ${y - 90} L${x} ${y - 160} L${x + 106} ${y - 90} Z`} fill="var(--kilnDark)" style={S} />
      <path d={`M${x} ${y - 160} L${x} ${y - 200}`} style={inkStyle(2.4)} />
      <path class="flag" d={`M${x} ${y - 200} L${x + 34} ${y - 192} L${x} ${y - 182} Z`} fill="var(--g5)" style={inkStyle(1.6)} />
      <path d={`M${x - 20} ${y} L${x - 20} ${y - 40} Q${x} ${y - 56} ${x + 20} ${y - 40} L${x + 20} ${y} Z`} fill="var(--woodDark)" style={S} />
      <path d={`M${x - 70} ${y - 70} L${x - 50} ${y - 70} L${x - 50} ${y - 20} L${x - 70} ${y - 20} Z M${x + 50} ${y - 70} L${x + 70} ${y - 70} L${x + 70} ${y - 20} L${x + 50} ${y - 20} Z`} fill="var(--sky)" style={S} />
      <path d={`M${x - 30} ${y - 64} L${x + 30} ${y - 64} L${x + 26} ${y - 82} L${x - 26} ${y - 82} Z`} fill="var(--g1)" style={inkStyle(1.6)} />
      <text x={x} y={y - 68} text-anchor="middle" font-size="12" font-family="var(--font-hand)" fill="#fff">Gilde</text>
    </g>
  );
}

const DRAW: Record<string, (p: { x: number; y: number }) => preact.JSX.Element> = { tongrube: Tongrube, markthalle: Markthalle, glasurbibliothek: Glasurbibliothek, gildenhaus: Gildenhaus };

export function VillageBuilding({ id, x, y, built, progress, onClick }: { id: string; x: number; y: number; built: boolean; progress: number; onClick: () => void }) {
  const Draw = DRAW[id];
  if (built) {
    return (
      <g class="vbuilding" data-building={id} onClick={onClick} role="button" aria-label={BUILDINGS[id].name}>
        <ellipse cx={x} cy={y + 4} rx="110" ry="20" fill="url(#hatch)" opacity="0.35" />
        <g filter="url(#wobble-soft)"><Draw x={x} y={y} /></g>
        <text x={x} y={y + (id === 'tongrube' ? 44 : 30)} text-anchor="middle" font-size="18" font-family="var(--font-hand)" fill="var(--line)">{BUILDINGS[id].name}</text>
      </g>
    );
  }
  return (
    <g class="vbuilding site" data-building-site={id} onClick={onClick} role="button" aria-label={`Baustelle: ${BUILDINGS[id].name}`}>
      <g opacity="0.35" style={{ strokeDasharray: '7 6' }}><Draw x={x} y={y} /></g>
      <path d={`M${x + 70} ${y} L${x + 70} ${y - 50}`} stroke="var(--woodDark)" stroke-width="4" />
      <g transform={`rotate(-4 ${x + 70} ${y - 50})`}>
        <rect x={x + 20} y={y - 78} width="100" height="34" fill="var(--sun)" style={inkStyle(1.8)} />
        <text x={x + 70} y={y - 56} text-anchor="middle" font-size="14" font-family="var(--font-hand)" fill="var(--line)">Baustelle {progress}/2</text>
      </g>
      <text x={x} y={y + 30} text-anchor="middle" font-size="16" font-family="var(--font-hand)" fill="var(--ink-soft)">{BUILDINGS[id].name}</text>
    </g>
  );
}
