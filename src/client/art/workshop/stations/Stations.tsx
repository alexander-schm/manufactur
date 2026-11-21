/**
 * Workshop stations. Each is drawn around (x, y) = centre of its footprint on the floor.
 */
import type { ComponentChildren } from 'preact';
import { bodyOf } from '../../../../shared/content';
import type { Batch, Design, GameState, GoodsStack, Station } from '../../../../shared/types';
import { inkStyle } from '../../ink';
import { Pot } from '../../Pot';

export type StationProps = { x: number; y: number; state: GameState; station: Station; now: number; running: Batch[]; waiting: Batch[] };

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };
const CLAY = '#c8784c';
const GREEN = '#dcc2a6';
const BISQUE = '#efd6bc';
const COPPER = '#c27a48';
const BRASS = '#d9a93a';

const STONE_CLAY = '#b9b1a5';
const STONE_GREEN = '#dad5cc';
const KAOLIN = '#ebe5da';
const KAOLIN_GREEN = '#f4f0e8';
const GOLD = '#d9a636';
/** Raw clay colour of a design's body on the wheel. */
const rawClay = (d: Design) => ({ steinzeug: STONE_CLAY, porzellan: KAOLIN }[bodyOf(d) as string] ?? CLAY);
/** Leather-hard colour on the drying rack. */
const greenware = (d: Design) => ({ steinzeug: STONE_GREEN, porzellan: KAOLIN_GREEN }[bodyOf(d) as string] ?? GREEN);

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

/** A little gold star ribbon on a masterwork in progress. */
/** A little rosette star marking a masterwork, anchored at its centre; `scale` shrinks it in place. */
function MasterworkTag({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4 : 9;
    return `${(x + r * Math.cos(a)).toFixed(1)} ${(y + r * Math.sin(a)).toFixed(1)}`;
  });
  return (
    <g class="masterwork-tag" data-masterwork="" transform={scale !== 1 ? `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})` : undefined}>
      <path d={`M${x - 4} ${y + 4} L${x - 9} ${y + 20} L${x - 4} ${y + 16} L${x - 1} ${y + 21} Z M${x + 4} ${y + 4} L${x + 9} ${y + 20} L${x + 4} ${y + 16} L${x + 1} ${y + 21} Z`} fill="var(--kiln)" style={inkStyle(1.1)} />
      <path d={`M${pts.join(' L')} Z`} fill="var(--sun)" style={inkStyle(1.5)} />
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
      {pots.map((p, i) => <ScenePot x={left + 24 + (i % 5) * 31} y={i < 5 ? top + 70 : top + 150} size={42} design={p.d} color={greenware(p.d)} />)}
      <path d={`M${left + 20} ${top + 12} q10 -8 20 0 q10 -8 20 0`} fill="none" style={T} class="steam" />
      <Label x={x} y={y + 22}>Trocknen</Label>
    </g>
  );
}

/** The court's gilded crest on the kiln dome (level 8): a shield with a white vase, a crown and two laurel sprigs. */
function KilnCrest({ x, y }: { x: number; y: number }) {
  const shield = (w: number, t: number, b: number) => `M${x - w} ${t} L${x + w} ${t} L${x + w} ${t + (b - t) * 0.45} Q${x + w} ${b - (b - t) * 0.18} ${x} ${b} Q${x - w} ${b - (b - t) * 0.18} ${x - w} ${t + (b - t) * 0.45} Z`;
  const leaves = (f: 1 | -1) => (
    <g>
      <path d={`M${x + 8 * f} ${y + 24} Q${x + 24 * f} ${y + 20} ${x + 26 * f} ${y - 2}`} fill="none" stroke="var(--g2Dark)" stroke-width="2" stroke-linecap="round" />
      {[0, 1, 2, 3].map((i) => {
        const lx = x + (13 + i * 3.6) * f, ly = y + 21 - i * 6.4;
        return <ellipse cx={lx} cy={ly} rx="2.2" ry="4.4" transform={`rotate(${(30 + i * 12) * f} ${lx} ${ly})`} fill={GOLD} style={inkStyle(1)} />;
      })}
    </g>
  );
  return (
    <g class="kiln-crest" data-kiln-crest="">
      {leaves(1)}
      {leaves(-1)}
      <path d={shield(15, y - 14, y + 22)} fill={GOLD} style={inkStyle(1.8)} />
      <path d={shield(10.5, y - 10, y + 16)} fill="var(--g1)" style={inkStyle(1.1)} />
      <path d={`M${x - 2.6} ${y - 6} L${x + 2.6} ${y - 6} L${x + 2} ${y - 3} Q${x + 7} ${y + 2} ${x + 4} ${y + 8} L${x - 4} ${y + 8} Q${x - 7} ${y + 2} ${x - 2} ${y - 3} Z`} fill="#fbf8f2" style={inkStyle(0.9)} />
      <path d={`M${x - 9} ${y - 14} L${x - 10} ${y - 24} L${x - 4.5} ${y - 18.5} L${x} ${y - 26} L${x + 4.5} ${y - 18.5} L${x + 10} ${y - 24} L${x + 9} ${y - 14} Z`} fill={GOLD} style={inkStyle(1.4)} />
      {[-10, 0, 10].map((dx) => <circle cx={x + dx} cy={y - (dx ? 25 : 27)} r="1.8" fill="#fffbe0" style={inkStyle(0.8)} />)}
      <path d={`M${x - 11} ${y - 8} q3 -2 6 -1`} stroke="#fffbe0" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.9" />
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
  const door = (o: number) => `M${x - 58 - o} ${y} L${x - 58 - o} ${doorTop + 40} Q${x - 58 - o} ${doorTop - o} ${x} ${doorTop - o} Q${x + 58 + o} ${doorTop - o} ${x + 58 + o} ${doorTop + 40} L${x + 58 + o} ${y}`;
  const doorGap = station.level >= 7 ? 72 : 62;
  const band = (bx0: number, bx1: number, by: number) => (
    <g>
      <path d={`M${bx0} ${by} L${bx1} ${by} L${bx1} ${by + 12} L${bx0} ${by + 12} Z`} fill={COPPER} style={inkStyle(1.8)} />
      <path d={`M${bx0 + 3} ${by + 3.5} L${bx1 - 3} ${by + 3.5}`} stroke="#eab48a" stroke-width="2" opacity="0.8" />
      {Array.from({ length: Math.max(1, Math.floor((bx1 - bx0) / 30)) }, (_, i) => <circle cx={bx0 + 10 + i * 30} cy={by + 7.5} r="1.8" fill="var(--line)" opacity="0.6" />)}
    </g>
  );
  return (
    <g data-kiln-level={station.level}>
      <path d={`M${x0 - 16} ${y} L${x0 - 16} ${top + 60} Q${x0 - 10} ${top - 14} ${x} ${top - 16} L${x1 + 16} ${top + 30} L${x1 + 16} ${y} Z`} fill="url(#hatch)" opacity="0.3" />
      <path d={`M${x0} ${y} L${x0} ${top + 70} Q${x0} ${top} ${x} ${top - 2} Q${x1} ${top} ${x1} ${top + 70} L${x1} ${y} Z`} fill="var(--kiln)" style={S} />
      {bricks}
      <path d={`M${x0 + 30} ${top + 66} Q${x} ${top + 4} ${x1 - 30} ${top + 66}`} fill="none" style={T} />
      {station.level >= 6 && (
        <g class="kiln-bands">
          {band(x0, x1, top + 70)}
          {band(x0, x - doorGap, y - 46)}
          {band(x + doorGap, x1, y - 46)}
        </g>
      )}
      {station.level >= 8 && <KilnCrest x={x} y={top + 40} />}
      {station.level >= 7 && <path d={door(7)} fill="none" stroke={BRASS} stroke-width="11" />}
      {station.level >= 7 && <path d={door(12)} fill="none" style={inkStyle(1.8)} />}
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
      {station.level >= 7 && (
        <g class="kiln-gauge2">
          <circle cx={x0 + 30} cy={top + 96} r="14" fill="var(--paper)" style={{ ...S, stroke: 'var(--line)' }} />
          <circle cx={x0 + 30} cy={top + 96} r="17" fill="none" stroke={BRASS} stroke-width="3" />
          <path d={`M${x0 + 19} ${top + 99} A11 11 0 0 1 ${x0 + 41} ${top + 99}`} stroke="var(--g1)" stroke-width="3" fill="none" />
          <path d={`M${x0 + 30} ${top + 98} L${firing ? x0 + 38 : x0 + 22} ${top + 89}`} fill="none" style={inkStyle(1.8)} />
        </g>
      )}
      {/* firewood */}
      {[[x0 - 34, y - 12], [x0 - 10, y - 12], [x0 - 22, y - 34], [x0 - 46, y - 34], [x0 - 34, y - 56]].map(([lx, ly]) => (
        <g><circle cx={lx} cy={ly} r="12" fill="var(--wood)" style={S} /><circle cx={lx} cy={ly} r="6" fill="none" style={T} /></g>
      ))}
      <Progress x={x1 - 30} y={top + 140} batch={running[0]} now={now} />
    </g>
  );
}

export function GlazeTable({ x, y, state, running, waiting, now }: StationProps) {
  const w = 200, left = x - w / 2, top = y - 92;
  const items: { b: Batch; on: boolean }[] = running.length > 0 ? running.map((b) => ({ b, on: true })) : waiting.slice(0, 1).map((b) => ({ b, on: false }));
  const glazes = state.glazes.slice(items.length > 2 ? -1 : items.length > 1 ? -2 : -3);
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
      {items.map(({ b, on }, i) => {
        const d = designOf(state, b.designId);
        const px = items.length > 2 ? left + 80 + i * 48 : items.length > 1 ? left + 124 + i * 52 : left + w - 28;
        return d ? (
          <g>
            <g style={{ animationDelay: `${i * 0.4}s` }} class={on ? 'dip' : undefined}>
              <ScenePot x={px} y={top} size={items.length > 2 ? 40 : items.length > 1 ? 46 : 52} design={d} color={on ? glazeColorOf(state, d) : BISQUE} />
            </g>
            {b.masterwork && items.length <= 2 && <MasterworkTag x={px + 16} y={top - 34} scale={0.7} />}
          </g>
        ) : null;
      })}
      <path d={`M${left} ${top} L${left + w} ${top} L${left + w} ${top + 12} L${left} ${top + 12} Z`} fill="var(--wood)" style={S} />
      <path d={`M${left + 10} ${top + 12} L${left + 8} ${y} M${left + w - 10} ${top + 12} L${left + w - 8} ${y} M${left + 10} ${top + 56} L${left + w - 10} ${top + 56}`} fill="none" style={S} />
      <path d={`M${left + 20} ${top + 18} L${left + 60} ${top + 17}`} fill="none" style={T} />
      {running.length > 2
        ? running.map((b, i) => <Progress x={left + 80 + i * 48} y={top + 36} batch={b} now={now} />)
        : running.length > 1
        ? running.map((b, i) => <Progress x={left + w + 14} y={top - 22 - i * 50} batch={b} now={now} />)
        : <Progress x={left + w + 10} y={top - 70} batch={running[0]} now={now} />}
      {/* three bays crowd the worker behind the pots, so the star pins onto that bay's gauge instead */}
      {items.length > 2 && items.map(({ b }, i) => (b.masterwork ? <MasterworkTag x={left + 80 + i * 48 + 15} y={top + 18} scale={0.7} /> : null))}
    </g>
  );
}

export function Wheel({ x, y, state, running, waiting, now }: StationProps) {
  const top = y - 70;
  // one wheel head per running batch: two bays share one wider bench
  const heads: { b?: Batch; d?: Design }[] = running.length > 0
    ? running.map((b) => ({ b, d: designOf(state, b.designId) }))
    : [{ d: waiting[0] && designOf(state, waiting[0].designId) }];
  const n = heads.length;
  const half = n > 1 ? 70 + n * 20 : 70; // bench half-width
  const gap = n > 1 ? (2 * half - 40) / n : 0;
  const potSize = n > 1 ? 72 : 86;
  return (
    <g>
      <path d={`M${x - half - 20} ${y + 10} Q${x} ${y + 24} ${x + half + 20} ${y + 10} Q${x + half + 20} ${y + 30} ${x} ${y + 32} Q${x - half - 20} ${y + 30} ${x - half - 20} ${y + 10} Z`} fill="url(#hatch)" opacity="0.45" />
      <path d={`M${x - half} ${top + 10} L${x + half} ${top + 10} L${x + half - 8} ${y} L${x - half + 8} ${y} Z`} fill="var(--wood)" style={S} />
      <path d={`M${x - half + 18} ${top + 26} L${x - 6} ${top + 25} M${x + 14} ${top + 40} L${x + half - 16} ${top + 39}`} fill="none" style={T} />
      <path d={`M${x - half - 8} ${top} Q${x} ${top - 16} ${x + half + 8} ${top} L${x + half + 8} ${top + 14} Q${x} ${top + 26} ${x - half - 8} ${top + 14} Z`} fill="var(--wheelTray)" style={S} />
      {heads.map(({ b, d }, i) => {
        const hx = n > 1 ? x - half + 20 + gap * (i + 0.5) : x;
        return (
          <g>
            <ellipse cx={hx} cy={top - 2} rx={n > 1 ? 40 : 50} ry={n > 1 ? 9 : 11} fill="var(--woodDark)" style={S} />
            {d ? (
              <g class={b ? 'spinning' : undefined} style={{ transformOrigin: `${hx}px ${top}px`, animationDelay: `${i * 0.17}s` }}>
                <ScenePot x={hx} y={top + 2} size={potSize} design={{ ...d, pattern: 'none', handle: 'none' }} color={rawClay(d)} />
              </g>
            ) : (
              <path d={`M${hx - 22} ${top - 2} Q${hx - 24} ${top - 30} ${hx} ${top - 32} Q${hx + 24} ${top - 30} ${hx + 22} ${top - 2} Z`} fill={CLAY} style={S} />
            )}
            {b && <path d={`M${hx - 50} ${top - 30} Q${hx - 60} ${top - 14} ${hx - 48} ${top} M${hx + 50} ${top - 30} Q${hx + 60} ${top - 14} ${hx + 48} ${top}`} fill="none" style={T} class="whoosh" />}
            {b?.masterwork && <MasterworkTag x={hx + 30} y={top - 58} />}
            {/* with several bays each gauge hangs on the bench front, right under its own pot */}
            <Progress x={n > 1 ? hx : x + 86} y={n > 1 ? top + 38 : top - 60} batch={b} now={now} />
          </g>
        );
      })}
    </g>
  );
}

export function PrepBench({ x, y, state, running, now }: StationProps) {
  const w = 190, left = x - w / 2, top = y - 88;
  const ton = Math.floor(state.materials.ton ?? 0);
  const glaze = Math.floor(state.materials.glasurbasis ?? 0);
  const lumps: (Batch | undefined)[] = running.length > 0 ? running : [undefined];
  const lumpStep = lumps.length > 2 ? 55 : 80; // three bays squeeze onto the same bench
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
      {lumps.map((b, i) => {
        const lx = left + (lumps.length > 2 ? 38 : 58) + i * lumpStep;
        const d = b && designOf(state, b.designId);
        return (
          <g>
            <path d={`M${lx - 30} ${top} Q${lx - 28} ${top - 30} ${lx} ${top - 32} Q${lx + 28} ${top - 30} ${lx + 30} ${top} Z`} fill={d ? rawClay(d) : CLAY} style={{ ...S, animationDelay: `${i * 0.3}s` }} class={b ? 'knead' : undefined} />
          </g>
        );
      })}
      {lumps.length < 2 && (
        <g>
          <path d={`M${left + 100} ${top - 4} L${left + 170} ${top - 12} L${left + 171} ${top - 2} L${left + 101} ${top + 6} Z`} fill="var(--wood)" style={S} />
          <path d={`M${left + 170} ${top - 8} L${left + 184} ${top - 9}`} fill="none" style={S} />
        </g>
      )}
      {sack(left - 28, y + 6, 1, 'TON', ton)}
      {sack(left + w + 30, y + 10, 0.85, 'Glasur', glaze)}
      {/* with several bays each gauge hangs on the bench front, right under its own lump */}
      {running.length > 1
        ? running.map((b, i) => <Progress x={left + (running.length > 2 ? 38 : 58) + i * lumpStep} y={top + 36} batch={b} now={now} />)
        : <Progress x={left + w - 10} y={top - 52} batch={running[0]} now={now} />}
      {/* the worker stands right behind the lumps, so the masterwork star pins onto its gauge */}
      {running.map((b, i) => (!b.masterwork ? null : running.length > 1
        ? <MasterworkTag x={left + (running.length > 2 ? 38 : 58) + i * lumpStep + 15} y={top + 18} scale={0.7} />
        : <MasterworkTag x={left + w + 5} y={top - 70} scale={0.7} />))}
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
