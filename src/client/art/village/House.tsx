import { makeCharacter } from '../../../shared/character';
import { mix } from '../../../shared/discovery';
import type { Member } from '../../../shared/village/types';
import { SPECIALTIES } from '../../../shared/village/specialties';
import { Character } from '../character/Character';
import { inkStyle } from '../ink';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

function Emblem({ m, x, y }: { m: Member; x: number; y: number }) {
  const c = m.makerMark.color;
  const shape = {
    circle: <circle cx={x} cy={y} r="9" />,
    heart: <path d={`M${x} ${y + 9} C${x - 13} ${y - 1} ${x - 7} ${y - 13} ${x} ${y - 5} C${x + 7} ${y - 13} ${x + 13} ${y - 1} ${x} ${y + 9} Z`} />,
    star: <path d={`M${x} ${y - 10} L${x + 3} ${y - 3} L${x + 10} ${y - 3} L${x + 4.5} ${y + 2} L${x + 6.5} ${y + 10} L${x} ${y + 5.5} L${x - 6.5} ${y + 10} L${x - 4.5} ${y + 2} L${x - 10} ${y - 3} L${x - 3} ${y - 3} Z`} />,
    leaf: <path d={`M${x - 10} ${y + 6} Q${x - 9} ${y - 11} ${x + 10} ${y - 9} Q${x + 9} ${y + 8} ${x - 10} ${y + 6} Z`} />,
  }[m.makerMark.shape];
  return (
    <g>
      <circle cx={x} cy={y} r="14" fill="#fffaf0" style={inkStyle(1.8)} />
      <g fill="none" stroke={c} stroke-width="2">{shape}</g>
      <text x={x} y={y + 4} text-anchor="middle" font-size="10" font-family="var(--font-hand)" fill={c}>{m.makerMark.letter}</text>
    </g>
  );
}

/** A little prop in the yard showing the land's specialty. */
export function YardProp({ kind, x, y }: { kind: string; x: number; y: number }) {
  switch (SPECIALTIES[kind]?.prop) {
    case 'clay':
      return <g><path d={`M${x - 22} ${y} Q${x - 18} ${y - 22} ${x} ${y - 24} Q${x + 20} ${y - 22} ${x + 24} ${y} Z`} fill="var(--clay)" style={S} /><path d={`M${x - 8} ${y - 14} q6 -4 12 0`} fill="none" style={T} /><path d={`M${x + 18} ${y - 2} L${x + 30} ${y - 34}`} stroke="var(--woodDark)" stroke-width="4" /><path d={`M${x + 27} ${y - 36} l8 -6 l4 8 Z`} fill="var(--bucket)" style={inkStyle(1.4)} /></g>;
    case 'ore':
      return <g><path d={`M${x - 24} ${y - 22} L${x + 22} ${y - 22} L${x + 18} ${y - 4} L${x - 20} ${y - 4} Z`} fill="var(--woodDark)" style={S} /><circle cx={x - 12} cy={y - 1} r="5" fill="#555" style={inkStyle(1.4)} /><circle cx={x + 10} cy={y - 1} r="5" fill="#555" style={inkStyle(1.4)} />{[[-12, -28], [0, -32], [10, -27]].map(([dx, dy]) => <path d={`M${x + dx - 7} ${y + dy + 6} l5 -9 l9 2 l2 8 Z`} fill="#a4512a" style={inkStyle(1.4)} />)}</g>;
    case 'copper':
      return <g><path d={`M${x - 20} ${y - 26} Q${x - 22} ${y} ${x} ${y} Q${x + 22} ${y} ${x + 20} ${y - 26} Z`} fill="#c87a3e" style={S} /><ellipse cx={x} cy={y - 26} rx="20" ry="5" fill="#4f9a7a" style={inkStyle(1.6)} /><path d={`M${x - 20} ${y - 18} q-8 -2 -8 6 M${x + 20} ${y - 18} q8 -2 8 6`} fill="none" style={inkStyle(1.6)} /></g>;
    case 'crystal':
      return <g>{[[-14, 0, 22], [0, 0, 32], [14, 0, 18]].map(([dx, dy, h]) => <path d={`M${x + dx - 7} ${y + dy} L${x + dx - 5} ${y - h} L${x + dx} ${y - h - 8} L${x + dx + 5} ${y - h} L${x + dx + 7} ${y + dy} Z`} fill="#3d5fb5" style={inkStyle(1.6)} />)}<path d={`M${x - 3} ${y - 28} l3 -6`} stroke="#fff" stroke-width="2" /></g>;
    case 'wood':
      return <g>{[[-14, -8], [8, -8], [-3, -24], [-25, -24], [19, -24]].map(([dx, dy]) => <g><circle cx={x + dx} cy={y + dy} r="9" fill="var(--wood)" style={inkStyle(1.6)} /><circle cx={x + dx} cy={y + dy} r="4" fill="none" style={T} /></g>)}<path d={`M${x + 26} ${y} L${x + 38} ${y - 30}`} stroke="var(--woodDark)" stroke-width="4" /><path d={`M${x + 34} ${y - 34} l10 4 l-6 8 Z`} fill="#9aa4ad" style={inkStyle(1.4)} /></g>;
    default:
      return null;
  }
}

/** One member's cottage at (x, y) = centre of the front step. */
export function House({ m, x, y, me, active, onClick }: { m: Member; x: number; y: number; me: boolean; active: boolean; onClick: () => void }) {
  const roof = mix(m.makerMark.color, '#2b2420', 0.12);
  const roofDark = mix(m.makerMark.color, '#2b2420', 0.35);
  return (
    <g class="house" data-house={m.playerId} onClick={onClick} role="button" tabIndex={0} aria-label={`Werkstatt von ${m.name}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}>
      <ellipse cx={x} cy={y + 6} rx="92" ry="20" fill="url(#hatch)" opacity="0.35" />
      <g filter="url(#wobble-soft)">
        {/* walls with timber frame */}
        <path d={`M${x - 62} ${y} L${x - 62} ${y - 78} L${x + 62} ${y - 78} L${x + 62} ${y} Z`} fill="#fbf0dc" style={S} />
        <path d={`M${x - 62} ${y - 40} L${x + 62} ${y - 40} M${x - 30} ${y - 78} L${x - 30} ${y} M${x + 30} ${y - 78} L${x + 30} ${y} M${x - 62} ${y - 78} L${x - 30} ${y - 40} M${x + 62} ${y - 78} L${x + 30} ${y - 40}`} stroke="var(--woodDark)" stroke-width="5" />
        <path d={`M${x - 62} ${y} L${x - 62} ${y - 78} L${x + 62} ${y - 78} L${x + 62} ${y} Z`} fill="none" style={S} />
        {/* chimney + smoke */}
        <path d={`M${x + 30} ${y - 120} L${x + 30} ${y - 146} L${x + 46} ${y - 146} L${x + 46} ${y - 104} Z`} fill="var(--kilnDark)" style={S} />
        {/* roof */}
        <path d={`M${x - 78} ${y - 72} L${x} ${y - 140} L${x + 78} ${y - 72} Z`} fill={roof} style={S} />
        <path d={`M${x - 54} ${y - 92} L${x - 18} ${y - 92} M${x - 36} ${y - 108} L${x + 10} ${y - 108} M${x + 14} ${y - 92} L${x + 52} ${y - 92} M${x - 14} ${y - 124} L${x + 14} ${y - 124}`} stroke={roofDark} stroke-width="2" stroke-linecap="round" />
        {/* door + window */}
        <path d={`M${x - 14} ${y} L${x - 14} ${y - 34} Q${x} ${y - 46} ${x + 14} ${y - 34} L${x + 14} ${y} Z`} fill={roofDark} style={S} />
        <circle cx={x + 8} cy={y - 16} r="2" fill="var(--sun)" />
        <rect x={x - 54} y={y - 34} width="26" height="22" fill="var(--sky)" style={S} />
        <path d={`M${x - 41} ${y - 34} L${x - 41} ${y - 12} M${x - 54} ${y - 23} L${x - 28} ${y - 23}`} style={inkStyle(1.4)} />
        <path d={`M${x - 58} ${y - 12} L${x - 24} ${y - 12} L${x - 26} ${y - 5} L${x - 56} ${y - 5} Z`} fill="var(--wood)" style={inkStyle(1.6)} />
        {[0, 1, 2, 3].map((k) => <circle cx={x - 52 + k * 8} cy={y - 14} r="3" fill={k % 2 ? 'var(--g3)' : 'var(--sun)'} />)}
        <rect x={x + 26} y={y - 34} width="26" height="22" fill="var(--sky)" style={S} />
        <path d={`M${x + 39} ${y - 34} L${x + 39} ${y - 12}`} style={inkStyle(1.4)} />
      </g>
      {active && [0, 1, 2].map((i) => <circle class="smoke" cx={x + 38} cy={y - 160} r={7 + i * 2} fill="var(--smoke)" style={{ ...inkStyle(1.4), animationDelay: `${i * 0.9}s` }} />)}
      <Emblem m={m} x={x} y={y - 58} />
      <YardProp kind={m.specialty} x={x + 104} y={y} />
      <g transform={`translate(${x - 112} ${y - 84})`}>
        <Character look={makeCharacter(m.avatarSeed)} pose={me ? 'wave' : active ? 'idle' : 'sleep'} seed={m.avatarSeed} size={56} />
      </g>
      {/* name sign */}
      <path d={`M${x - 46} ${y + 34} L${x - 46} ${y + 12}`} stroke="var(--woodDark)" stroke-width="4" />
      <g transform={`rotate(-3 ${x - 46} ${y + 30})`}>
        <rect x={x - 96} y={y + 28} width="100" height="28" fill="#fffaf0" style={inkStyle(1.8)} />
        <text x={x - 46} y={y + 48} text-anchor="middle" font-size="18" font-family="var(--font-hand)" fill="var(--line)">{me ? `${m.name} (du)` : m.name}</text>
      </g>
    </g>
  );
}

export function FreePlot({ x, y }: { x: number; y: number }) {
  return (
    <g data-plot-free>
      <ellipse cx={x} cy={y - 20} rx="74" ry="32" fill="#a7cf86" opacity="0.6" style={{ ...inkStyle(1.4), strokeDasharray: '6 6' }} />
      <path d={`M${x} ${y} L${x} ${y - 60}`} stroke="var(--woodDark)" stroke-width="5" />
      <g transform={`rotate(4 ${x} ${y - 60})`}>
        <rect x={x - 44} y={y - 84} width="88" height="30" fill="#fffaf0" style={inkStyle(1.8)} />
        <text x={x} y={y - 63} text-anchor="middle" font-size="15" font-family="var(--font-hand)" fill="var(--line)">noch frei</text>
      </g>
    </g>
  );
}
