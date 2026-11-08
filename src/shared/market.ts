import { EFFECTS, getForm, getStationDef, own } from './content';
import type { GameState, GoodsStack } from './types';

export const QUALITY_MUL: Record<1 | 2 | 3, number> = { 1: 0.8, 2: 1, 3: 1.3 };
export const STALL_PRICE_FACTOR = 0.8;

export function pieceValue(state: GameState, stack: Pick<GoodsStack, 'designId' | 'quality' | 'effect'>): number {
  const design = state.designs.find((d) => d.id === stack.designId);
  const base = design ? getForm(design.form).baseValue : 5;
  const eff = stack.effect ? own(EFFECTS, stack.effect)?.valueMul ?? 1 : 1;
  return base * QUALITY_MUL[stack.quality] * eff;
}

export function stallRate(state: GameState): number {
  const st = state.stations.find((s) => s.kind === 'marketStall');
  if (!st) return 0;
  return getStationDef('marketStall').capacity![st.level - 1];
}

function formOf(state: GameState, designId: string): string | undefined {
  return state.designs.find((d) => d.id === designId)?.form;
}

/** Pieces per form the stall may sell: everything above what open orders of that form need. */
function sellableByForm(state: GameState): Map<string, number> {
  const stock = new Map<string, number>();
  for (const g of state.goods) {
    const f = formOf(state, g.designId);
    if (f) stock.set(f, (stock.get(f) ?? 0) + g.count);
  }
  const reserved = new Map<string, number>();
  for (const o of state.orders) reserved.set(o.form, (reserved.get(o.form) ?? 0) + o.count);
  const out = new Map<string, number>();
  for (const [f, n] of stock) out.set(f, Math.max(0, n - (reserved.get(f) ?? 0)));
  return out;
}

/** How many pieces the stall can sell right now (offered designs, minus the order reserve). */
export function stallStock(state: GameState): number {
  const budget = sellableByForm(state);
  const offered = new Map<string, number>();
  for (const g of state.goods) {
    if (!state.stallDesignIds.includes(g.designId)) continue;
    const f = formOf(state, g.designId)!;
    offered.set(f, (offered.get(f) ?? 0) + g.count);
  }
  let n = 0;
  for (const [f, k] of offered) n += Math.min(k, budget.get(f) ?? 0);
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
  const budget = sellableByForm(state);
  const order = state.goods.filter((g) => state.stallDesignIds.includes(g.designId));
  if (order.length > 1) order.sort((a, b) => a.quality - b.quality);
  for (const g of order) {
    if (sold >= n) break;
    const f = formOf(state, g.designId)!;
    const k = Math.min(g.count, n - sold, budget.get(f) ?? 0);
    if (k <= 0) continue;
    budget.set(f, (budget.get(f) ?? 0) - k);
    g.count -= k;
    sold += k;
    taler += k * pieceValue(state, g) * STALL_PRICE_FACTOR;
  }
  if (state.goods.some((g) => g.count === 0)) state.goods = state.goods.filter((g) => g.count > 0);
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
