/**
 * Workshop stations. Each is drawn around (x, y) = centre of its footprint on the floor.
 */
import type { ComponentChildren } from 'preact';
import type { Batch, Design, GameState, GoodsStack, Station } from '../../../../shared/types';
import { inkStyle } from '../../ink';
import { Pot } from '../../Pot';

export type StationProps = { x: number; y: number; state: GameState; station: Station; now: number; running: Batch[]; waiting: Batch[] };

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };
const CLAY = '#c8784c';
const GREEN = '#dcc2a6';
const BISQUE = '#efd6bc';

export const designOf = (s: GameState, id: string): Design | undefined => s.designs.find((d) => d.id === id);
export const glazeColorOf = (s: GameState, d?: Design) => d?.origin?.glazeColor ?? ((d && s.glazes.find((g) => g.id === d.glazeId)?.color) || '#e9c9a6');

/** A pot drawn inside the scene at (x, base y) with a given pixel height. */
export function ScenePot({ x, y, size, design, color, effect, quality, cls }: { x: number; y: number; size: number; design: Design; color: string; effect?: string | null; quality?: 1 | 2 | 3; cls?: string }) {
  // Pot's viewBox is 120×110 with the base at y≈104 → scale so the base sits on y
  const w = size, h = size * (110 / 120);
  return (
    <g class={cls}>
      <Pot x={x - w / 2} y={y - h * (104 / 110)} height={h} design={design} glazeColor={color} effect={effect} quality={quality} size={w} wobble={false} />
    </g>
  );
}

function Progress({ x, y, batch, now }: { x: number; y: number; batch?: Batch; now: number }) {
  if (!batch || batch.startedAt === null) return null;
  const p = batch.blocked ? 1 : Math.max(0, Math.min(1, (now - batch.startedAt) / Math.max(1, batch.durationMs)));
  const r = 17, c = 2 * Math.PI * r;
  return (
    <g class="progress" data-progress={p.toFixed(2)}>
      <circle cx={x} cy={y} r={r + 5} fill="var(--card)" style={S} />
      <circle cx={x} cy={y} r={r} fill="none" stroke="rgba(43,36,32,.12)" stroke-width="6" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={batch.blocked ? 'var(--kiln)' : 'var(--g2Dark)'} stroke-width="6" stroke-dasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`} transform={`rotate(-90 ${x} ${y})`} stroke-linecap="round" />
      <text x={x} y={y + 6} text-anchor="middle" font-size="17" font-family="var(--font-hand)" fill="var(--line)">{batch.blocked ? '!' : `×${batch.count}`}</text>
    </g>
  );
}

function Label({ x, y, children }: { x: number; y: number; children: ComponentChildren }) {
  return <text x={x} y={y} text-anchor="middle" font-size="18" font-family="var(--font-hand)" fill="var(--line)" opacity="0.75">{children}</text>;
}

function LevelPips({ x, y, level }: { x: number; y: number; level: number }) {
  return <g>{Array.from({ length: 5 }, (_, i) => <path d={`M${x - 26 + i * 13} ${y} l4 -8 l4 8 Z`} fill={i < level ? 'var(--sun)' : 'none'} style={inkStyle(1.2)} />)}</g>;
}

export function Shelf({ x, y, state }: StationProps) {
  const w = 220, h = 290;
  const left = x - w / 2, top = y - h;
  const pieces: GoodsStack[] = [];
  for (const g of state.goods) for (let i = 0; i < g.count && pieces.length < SHELF_VISIBLE_MAX; i++) pieces.push(g);
  const total = state.goods.reduce((a, g) => a + g.count, 0);
  const boards = [top + 92, top + 186, top + 280];
  return (
    <g>
      <path d={`M${left} ${top} L${left + w} ${top} L${left + w} ${y} L${left} ${y} Z`} fill="var(--wood)" style={S} />
      <rect x={left + 10} y={top + 10} width={w - 20} height={h - 20} fill="var(--woodDark)" opacity="0.5" />
      <rect x={left + 10} y={top + 10} width={w - 20} height={h - 20} fill="url(#hatch)" opacity="0.3" />
      {boards.map((by) => <path d={`M${left + 2} ${by} L${left + w - 2} ${by} L${left + w - 2} ${by + 10} L${left + 2} ${by + 10} Z`} fill="var(--wood)" style={S} />)}
      {pieces.map((g, i) => {
        const row = Math.floor(i / 6), col = i % 6;
        const d = designOf(state, g.designId);
        if (!d) return null;
        return <ScenePot x={left + 26 + col * 34} y={boards[row]} size={46} design={d} color={glazeColorOf(state, d)} effect={g.effect} quality={g.quality} />;
      })}
      {total > SHELF_VISIBLE_MAX && <Label x={left + w - 26} y={top - 8}>{`+${total - SHELF_VISIBLE_MAX}`}</Label>}
      {total === 0 && <Label x={x} y={top + 70}>leer</Label>}
    </g>
  );
}
export const SHELF_VISIBLE_MAX = 18;

export function DryingRack({ x, y, state, running, waiting }: StationProps) {
  const w = 170, h = 200, left = x - w / 2, top = y - h;
  const pots: { d: Design }[] = [];
  for (const b of [...running, ...waiting]) {
    const d = designOf(state, b.designId);
    if (d) for (let i = 0; i < b.count && pots.length < 10; i++) pots.push({ d });
  }
  return (
    <g>
      <path d={`M${left + 8} ${top} L${left + 8} ${y} M${left + w - 8} ${top} L${left + w - 8} ${y}`} stroke="var(--woodDark)" stroke-width="9" />
      <path d={`M${left + 8} ${top} L${left + 8} ${y} M${left + w - 8} ${top} L${left + w - 8} ${y}`} fill="none" style={S} />
      {[top + 70, top + 150].map((by) => <path d={`M${left} ${by} L${left + w} ${by} L${left + w} ${by + 9} L${left} ${by + 9} Z`} fill="var(--wood)" style={S} />)}
      {pots.map((p, i) => <ScenePot x={left + 24 + (i % 5) * 31} y={i < 5 ? top + 70 : top + 150} size={42} design={p.d} color={GREEN} />)}
      <path d={`M${left + 20} ${top + 12} q10 -8 20 0 q10 -8 20 0`} fill="none" style={T} class="steam" />
      <Label x={x} y={y + 22}>Trocknen</Label>
    </g>
  );
}

export function Kiln({ x, y, station, running, now }: StationProps) {
  const w = 230, h = 260;
  const x0 = x - w / 2, x1 = x + w / 2, top = y - h;
  const firing = running.length > 0;
  const bricks: preact.JSX.Element[] = [];
  for (let r = 0, by = top + 60; by < y - 10; r++, by += 18) {
    for (let bx = x0 + 6 - (r % 2 ? 16 : 0); bx < x1 - 30; bx += 32) {
      if (bx < x0 + 4) continue;
      bricks.push(<rect x={bx} y={by} width="28" height="13" rx="2" fill={(bx * 7 + by * 3) % 5 < 2 ? 'var(--kilnDark)' : 'var(--kiln)'} style={T} />);
    }
  }
  const doorTop = y - 128;
  return (
    <g>
      <path d={`M${x0 - 16} ${y} L${x0 - 16} ${top + 60} Q${x0 - 10} ${top - 14} ${x} ${top - 16} L${x1 + 16} ${top + 30} L${x1 + 16} ${y} Z`} fill="url(#hatch)" opacity="0.3" />
      <path d={`M${x0} ${y} L${x0} ${top + 70} Q${x0} ${top} ${x} ${top - 2} Q${x1} ${top} ${x1} ${top + 70} L${x1} ${y} Z`} fill="var(--kiln)" style={S} />
      {bricks}
      <path d={`M${x0 + 30} ${top + 66} Q${x} ${top + 4} ${x1 - 30} ${top + 66}`} fill="none" style={T} />
      {/* chimney + smoke */}
      <path d={`M${x - 18} ${top + 2} L${x - 20} ${top - 64} L${x + 20} ${top - 64} L${x + 18} ${top + 2} Z`} fill="var(--kilnDark)" style={S} />
      <path d={`M${x - 26} ${top - 64} L${x + 26} ${top - 64} L${x + 26} ${top - 74} L${x - 26} ${top - 74} Z`} fill="var(--kiln)" style={S} />
      {firing && [0, 1, 2].map((i) => <circle class="smoke" cx={x + 2} cy={top - 88} r={10 + i * 3} fill="var(--smoke)" style={{ ...S, animationDelay: `${i * 0.9}s` }} />)}
      {/* door */}
      <path d={`M${x - 58} ${y} L${x - 58} ${doorTop + 40} Q${x - 58} ${doorTop} ${x} ${doorTop} Q${x + 58} ${doorTop} ${x + 58} ${doorTop + 40} L${x + 58} ${y} Z`} fill="var(--kilnInside)" style={S} />
      {firing ? (
        <g>
          <ellipse cx={x} cy={y - 34} rx="66" ry="46" fill="url(#glow)" class="glow" />
          <g class="flame" style={{ transformOrigin: `${x}px ${y}px` }}>
            <path d={`M${x - 36} ${y - 4} Q${x - 44} ${y - 38} ${x - 22} ${y - 56} Q${x - 20} ${y - 32} ${x - 8} ${y - 36} Q${x - 12} ${y - 68} ${x + 8} ${y - 88} Q${x + 8} ${y - 54} ${x + 20} ${y - 52} Q${x + 22} ${y - 72} ${x + 32} ${y - 76} Q${x + 48} ${y - 38} ${x + 36} ${y - 4} Z`} fill="var(--fire)" style={S} />
            <path d={`M${x - 15} ${y - 6} Q${x - 18} ${y - 28} ${x - 3} ${y - 40} Q${x} ${y - 26} ${x + 10} ${y - 30} Q${x + 20} ${y - 14} ${x + 12} ${y - 6} Z`} fill="var(--fireCore)" />
          </g>
        </g>
      ) : (
        <path d={`M${x - 30} ${y - 6} q20 -10 40 -2 q10 -6 20 2`} fill="none" stroke="#7a4a3a" stroke-width="3" />
      )}
      <path d={`M${x - 38} ${y - 2} L${x + 38} ${y - 14} L${x + 40} ${y - 4} L${x - 36} ${y + 6} Z`} fill="var(--woodDark)" style={S} />
      {/* temperature dial */}
      <circle cx={x1 - 30} cy={top + 92} r="18" fill="var(--paper)" style={S} />
      <path d={`M${x1 - 45} ${top + 95} A15 15 0 0 1 ${x1 - 15} ${top + 95}`} stroke="var(--g3)" stroke-width="4" fill="none" />
      <path d={`M${x1 - 30} ${top + 94} L${firing ? x1 - 18 : x1 - 40} ${top + 82}`} fill="none" style={S} />
      {/* firewood */}
      {[[x0 - 34, y - 12], [x0 - 10, y - 12], [x0 - 22, y - 34], [x0 - 46, y - 34], [x0 - 34, y - 56]].map(([lx, ly]) => (
        <g><circle cx={lx} cy={ly} r="12" fill="var(--wood)" style={S} /><circle cx={lx} cy={ly} r="6" fill="none" style={T} /></g>
      ))}
      <Progress x={x1 - 30} y={top + 140} batch={running[0]} now={now} />
    </g>
  );
}

export function GlazeTable({ x, y, state, running, waiting, now, station }: StationProps) {
  const w = 200, left = x - w / 2, top = y - 92;
  const glazes = state.glazes.slice(-3);
  const b = running[0] ?? waiting[0];
  const d = b && designOf(state, b.designId);
  return (
    <g>
      {glazes.map((g, i) => {
        const bx = left + 34 + i * 48;
        return (
          <g>
            <path d={`M${bx - 18} ${top} L${bx - 21} ${top - 38} L${bx + 21} ${top - 38} L${bx + 18} ${top} Z`} fill="var(--bucket)" style={S} />
            <ellipse cx={bx} cy={top - 38} rx="21" ry="6" fill={g.color} style={S} />
            <path d={`M${bx - 10} ${top - 38} q-1 12 1 16 q2 -4 1 -16`} fill={g.color} style={inkStyle(1.4)} />
          </g>
        );
      })}
      {d && <ScenePot x={left + w - 28} y={top} size={52} design={d} color={running.length ? glazeColorOf(state, d) : BISQUE} cls={running.length ? 'dip' : undefined} />}
      <path d={`M${left} ${top} L${left + w} ${top} L${left + w} ${top + 12} L${left} ${top + 12} Z`} fill="var(--wood)" style={S} />
      <path d={`M${left + 10} ${top + 12} L${left + 8} ${y} M${left + w - 10} ${top + 12} L${left + w - 8} ${y} M${left + 10} ${top + 56} L${left + w - 10} ${top + 56}`} fill="none" style={S} />
      <path d={`M${left + 20} ${top + 18} L${left + 60} ${top + 17}`} fill="none" style={T} />
      <Progress x={left + w + 10} y={top - 70} batch={running[0]} now={now} />
    </g>
  );
}

export function Wheel({ x, y, state, running, waiting, now, station }: StationProps) {
  const b = running[0];
  const d = b ? designOf(state, b.designId) : waiting[0] && designOf(state, waiting[0].designId);
  const top = y - 70;
  return (
    <g>
      <path d={`M${x - 90} ${y + 10} Q${x} ${y + 24} ${x + 90} ${y + 10} Q${x + 90} ${y + 30} ${x} ${y + 32} Q${x - 90} ${y + 30} ${x - 90} ${y + 10} Z`} fill="url(#hatch)" opacity="0.45" />
      <path d={`M${x - 70} ${top + 10} L${x + 70} ${top + 10} L${x + 62} ${y} L${x - 62} ${y} Z`} fill="var(--wood)" style={S} />
      <path d={`M${x - 52} ${top + 26} L${x - 6} ${top + 25} M${x + 14} ${top + 40} L${x + 54} ${top + 39}`} fill="none" style={T} />
      <path d={`M${x - 78} ${top} Q${x} ${top - 16} ${x + 78} ${top} L${x + 78} ${top + 14} Q${x} ${top + 26} ${x - 78} ${top + 14} Z`} fill="var(--wheelTray)" style={S} />
      <ellipse cx={x} cy={top - 2} rx="50" ry="11" fill="var(--woodDark)" style={S} />
      {d ? (
        <g class={b ? 'spinning' : undefined} style={{ transformOrigin: `${x}px ${top}px` }}>
          <ScenePot x={x} y={top + 2} size={86} design={{ ...d, pattern: 'none', handle: 'none' }} color={CLAY} />
        </g>
      ) : (
        <path d={`M${x - 22} ${top - 2} Q${x - 24} ${top - 30} ${x} ${top - 32} Q${x + 24} ${top - 30} ${x + 22} ${top - 2} Z`} fill={CLAY} style={S} />
      )}
      {b && <path d={`M${x - 62} ${top - 30} Q${x - 72} ${top - 14} ${x - 60} ${top} M${x + 62} ${top - 30} Q${x + 72} ${top - 14} ${x + 60} ${top}`} fill="none" style={T} class="whoosh" />}
      <Progress x={x + 86} y={top - 60} batch={b} now={now} />
    </g>
  );
}

export function PrepBench({ x, y, state, running, now, station }: StationProps) {
  const w = 190, left = x - w / 2, top = y - 88;
  const ton = Math.floor(state.materials.ton ?? 0);
  const glaze = Math.floor(state.materials.glasurbasis ?? 0);
  const sack = (sx: number, sy: number, s: number, label: string, n: number) => (
    <g>
      <path d={`M${sx - 26 * s} ${sy} Q${sx - 33 * s} ${sy - 36 * s} ${sx - 21 * s} ${sy - 60 * s} L${sx - 12 * s} ${sy - 67 * s} Q${sx} ${sy - 60 * s} ${sx + 12 * s} ${sy - 69 * s} L${sx + 21 * s} ${sy - 60 * s} Q${sx + 33 * s} ${sy - 36 * s} ${sx + 26 * s} ${sy} Z`} fill="var(--sack)" style={S} />
      <path d={`M${sx - 14 * s} ${sy - 60 * s} Q${sx} ${sy - 55 * s} ${sx + 14 * s} ${sy - 60 * s}`} fill="none" style={T} />
      <text x={sx} y={sy - 30 * s} text-anchor="middle" font-size={15 * s} font-family="var(--font-hand)" fill="var(--line)">{label}</text>
      <text x={sx} y={sy - 12 * s} text-anchor="middle" font-size={14 * s} font-family="var(--font-hand)" fill="var(--line)" opacity="0.8">{n}</text>
    </g>
  );
  return (
    <g>
      <path d={`M${left} ${top} L${left + w} ${top} L${left + w} ${top + 12} L${left} ${top + 12} Z`} fill="var(--wood)" style={S} />
      <path d={`M${left + 10} ${top + 12} L${left + 8} ${y} M${left + w - 10} ${top + 12} L${left + w - 8} ${y} M${left + 10} ${top + 56} L${left + w - 10} ${top + 56}`} fill="none" style={S} />
      <path d={`M${left + 28} ${top} Q${left + 30} ${top - 30} ${left + 58} ${top - 32} Q${left + 86} ${top - 30} ${left + 88} ${top} Z`} fill={CLAY} style={S} class={running.length ? 'knead' : undefined} />
      <path d={`M${left + 100} ${top - 4} L${left + 170} ${top - 12} L${left + 171} ${top - 2} L${left + 101} ${top + 6} Z`} fill="var(--wood)" style={S} />
      <path d={`M${left + 170} ${top - 8} L${left + 184} ${top - 9}`} fill="none" style={S} />
      {sack(left - 28, y + 6, 1, 'TON', ton)}
      {sack(left + w + 30, y + 10, 0.85, 'Glasur', glaze)}
      <Progress x={left + w - 10} y={top - 52} batch={running[0]} now={now} />
    </g>
  );
}

export function MarketStall({ x, y, state }: StationProps) {
  const w = 210, left = x - w / 2, top = y - 190;
  const stock = state.goods.filter((g) => state.stallDesignIds.includes(g.designId));
  const shown = stock.slice(0, 3);
  const n = stock.reduce((a, g) => a + g.count, 0);
  return (
    <g>
      <path d={`M${left + 12} ${top + 30} L${left + 12} ${y} M${left + w - 12} ${top + 30} L${left + w - 12} ${y}`} stroke="var(--woodDark)" stroke-width="9" />
      <path d={`M${left + 12} ${top + 30} L${left + 12} ${y} M${left + w - 12} ${top + 30} L${left + w - 12} ${y}`} fill="none" style={S} />
      {Array.from({ length: 6 }, (_, i) => (
        <path d={`M${left - 10 + i * ((w + 20) / 6)} ${top} L${left - 10 + (i + 1) * ((w + 20) / 6)} ${top} L${left - 10 + (i + 1) * ((w + 20) / 6)} ${top + 34} Q${left - 10 + (i + 0.5) * ((w + 20) / 6)} ${top + 48} ${left - 10 + i * ((w + 20) / 6)} ${top + 34} Z`} fill={i % 2 ? '#fdf6e8' : 'var(--g3)'} style={S} />
      ))}
      <path d={`M${left} ${y - 70} L${left + w} ${y - 70} L${left + w} ${y} L${left} ${y} Z`} fill="var(--wood)" style={S} />
      <path d={`M${left} ${y - 70} L${left + w} ${y - 70} L${left + w} ${y - 60} L${left} ${y - 60} Z`} fill="var(--woodDark)" style={S} />
      {[left + 30, left + 80, left + 130, left + 180].map((px) => <path d={`M${px} ${y - 52} L${px} ${y - 6}`} fill="none" style={T} />)}
      {shown.map((g, i) => {
        const d = designOf(state, g.designId);
        return d ? <ScenePot x={left + 46 + i * 60} y={y - 70} size={56} design={d} color={glazeColorOf(state, d)} effect={g.effect} /> : null;
      })}
      <g transform={`rotate(-6 ${left + w - 20} ${top + 64})`}>
        <rect x={left + w - 64} y={top + 52} width="86" height="34" fill="var(--paper)" style={S} />
        <text x={left + w - 21} y={top + 75} text-anchor="middle" font-size="19" font-family="var(--font-hand)" fill="var(--line)">{n > 0 ? `${n} Stück` : 'leer'}</text>
      </g>
      {n > 0 && <g class="coin-pop"><circle cx={left + 30} cy={y - 96} r="10" fill="var(--sun)" style={S} /><text x={left + 30} y={y - 92} text-anchor="middle" font-size="11" font-family="var(--font-hand)">T</text></g>}
      <Label x={x} y={y + 24}>Marktstand</Label>
    </g>
  );
}
