import { EFFECTS, getForm, getStationDef } from './content';
import type { GameState, GoodsStack } from './types';

export const QUALITY_MUL: Record<1 | 2 | 3, number> = { 1: 0.8, 2: 1, 3: 1.3 };
export const STALL_PRICE_FACTOR = 0.8;

export function pieceValue(state: GameState, stack: Pick<GoodsStack, 'designId' | 'quality' | 'effect'>): number {
  const design = state.designs.find((d) => d.id === stack.designId);
  const base = design ? getForm(design.form).baseValue : 5;
  const eff = stack.effect ? EFFECTS[stack.effect]?.valueMul ?? 1 : 1;
  return base * QUALITY_MUL[stack.quality] * eff;
}

export function stallRate(state: GameState): number {
  const st = state.stations.find((s) => s.kind === 'marketStall');
  if (!st) return 0;
  return getStationDef('marketStall').capacity![st.level - 1];
}

export function stallStock(state: GameState): number {
  let n = 0;
  for (const g of state.goods) if (state.stallDesignIds.includes(g.designId)) n += g.count;
  return n;
}

export function goodsTotal(state: GameState): number {
  let n = 0;
  for (const g of state.goods) n += g.count;
  return n;
}

export function shelfCapacity(state: GameState): number {
  const sh = state.stations.find((s) => s.kind === 'shelf')!;
  return getStationDef('shelf').capacity![sh.level - 1];
}

/**
 * Sell from the stall between two instants. Mutates state.
 * Sells lowest-quality pieces first (best ones are kept for orders).
 */
export function stallSalesBetween(state: GameState, from: number, to: number): { sold: number; taler: number } {
  const rate = stallRate(state);
  if (to <= from || rate <= 0) return { sold: 0, taler: 0 };
  let stock = stallStock(state);
  if (stock === 0) { state.stallCarry = 0; return { sold: 0, taler: 0 }; }
  const exact = state.stallCarry + (rate * (to - from)) / 60_000;
  let n = Math.floor(exact);
  state.stallCarry = exact - n;
  if (n >= stock) { n = stock; state.stallCarry = 0; }
  let sold = 0;
  let taler = 0;
  const order = state.goods
    .filter((g) => state.stallDesignIds.includes(g.designId))
    .sort((a, b) => a.quality - b.quality);
  for (const g of order) {
    if (sold >= n) break;
    const k = Math.min(g.count, n - sold);
    g.count -= k;
    sold += k;
    taler += k * pieceValue(state, g) * STALL_PRICE_FACTOR;
  }
  state.goods = state.goods.filter((g) => g.count > 0);
  taler = Math.round(taler * 100) / 100;
  state.taler = Math.round((state.taler + taler) * 100) / 100;
  state.stats.sold += sold;
  stock -= sold;
  return { sold, taler };
}

export function addGoods(state: GameState, stack: GoodsStack): void {
  const same = state.goods.find((g) => g.designId === stack.designId && g.quality === stack.quality && g.effect === stack.effect);
  if (same) same.count += stack.count;
  else state.goods.push({ ...stack });
}
