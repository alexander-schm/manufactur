import { TIERS, tierRank } from '../../../shared/content';
import type { Tier } from '../../../shared/types';
import { inkStyle } from '../ink';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

export const tierName = (t: Tier): string => TIERS.find((x) => x.id === t)?.name ?? t[0].toUpperCase() + t.slice(1);

function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`;
  });
  return <path d={`M${pts.join(' L')} Z`} fill="var(--sun)" style={inkStyle(1.4)} />;
}

function Sprig({ x, y, flip }: { x: number; y: number; flip: boolean }) {
  const f = flip ? -1 : 1;
  return (
    <g>
      <path d={`M${x} ${y} q${8 * f} -4 ${14 * f} -14`} fill="none" stroke="var(--g2Dark)" stroke-width="1.8" stroke-linecap="round" />
      {[0, 1, 2].map((i) => <ellipse cx={x + (4 + i * 4) * f} cy={y - 3 - i * 4.5} rx="3.6" ry="2" transform={`rotate(${-40 * f} ${x + (4 + i * 4) * f} ${y - 3 - i * 4.5})`} fill="var(--g2)" style={inkStyle(1)} />)}
    </g>
  );
}

/** The workshop's name board, hanging from a nail at (x, y). It grows a little finer with every tier. */
export function TierSign({ tier, x, y }: { tier: Tier; x: number; y: number }) {
  const name = tierName(tier);
  const rank = tierRank(tier);
  const w = Math.max(132, 46 + name.length * 12.5), h = 46;
  const l = x - w / 2, r = x + w / 2, top = y + 24, bot = top + h;
  return (
    <g class="tier-sign" data-tier-sign={tier}>
      <path d={`M${l + 16} ${top + 2} L${x} ${y} L${r - 16} ${top + 2}`} fill="none" style={T} />
      <path d={`M${l + 6} ${top + 6} L${r + 6} ${top + 4} L${r + 7} ${bot + 6} L${l + 5} ${bot + 7} Z`} fill="url(#hatch)" opacity="0.35" />
      <path d={`M${l} ${top + 2} Q${x} ${top - 2} ${r} ${top} L${r + 1} ${bot - 1} Q${x} ${bot + 2} ${l - 1} ${bot} Z`} fill={rank > 0 ? 'var(--woodDark)' : 'var(--wood)'} style={S} />
      <path d={`M${l + 6} ${top + 7} Q${x} ${top + 4} ${r - 6} ${top + 6} L${r - 5} ${bot - 6} Q${x} ${bot - 4} ${l + 5} ${bot - 5} Z`} fill={rank > 0 ? 'var(--paper)' : 'var(--wood)'} style={inkStyle(1.2)} />
      {rank === 0 && <path d={`M${l + 14} ${bot - 10} q${w * 0.2} -3 ${w * 0.32} 1 M${r - 40} ${top + 12} q12 -2 24 1`} fill="none" style={T} />}
      <text x={x} y={top + h / 2 + 8} text-anchor="middle" font-size="23" font-family="var(--font-hand)" fill="var(--line)">{name}</text>
      {[l + 10, r - 10].map((cx) => <circle cx={cx} cy={top + h / 2 + 1} r="2.2" fill="var(--line)" opacity="0.6" />)}
      {rank > 0 && (
        <g>
          <Sprig x={l + 2} y={bot - 2} flip={true} />
          <Sprig x={r - 2} y={bot - 2} flip={false} />
          <Star x={x} y={bot + 4} r={8} />
          {rank > 1 && <Star x={x - 16} y={bot + 2} r={5.5} />}
          {rank > 1 && <Star x={x + 16} y={bot + 2} r={5.5} />}
        </g>
      )}
      <circle cx={x} cy={y} r="3.4" fill="var(--line)" />
    </g>
  );
}
