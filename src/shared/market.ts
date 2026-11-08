import { EFFECTS, getForm, getStationDef, own } from './content';
import type { GameState, GoodsStack } from './types';

export const QUALITY_MUL: Record<1 | 2 | 3, number> = { 1: 0.8, 2: 1, 3: 1.3 };
export const STALL_PRICE_FACTOR = 0.8;
export const MARKTHALLE_PRICE_FACTOR = 0.9;
export const stallPriceFactor = (s: GameState) => (s.village?.buildings.includes('markthalle') ? MARKTHALLE_PRICE_FACTOR : STALL_PRICE_FACTOR);

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
  const ds = state.designs;
  for (let i = 0; i < ds.length; i++) if (ds[i].id === designId) return ds[i].form;
  return undefined;
}

/**
 * Pieces per form the stall may sell: everything above what open orders of that form need.
 * Written with plain arrays — this runs inside the catch-up loop.
 */
function sellableByForm(state: GameState): { forms: string[]; left: number[] } {
  const forms: string[] = [];
  const left: number[] = [];
  for (const g of state.goods) {
    const f = formOf(state, g.designId);
    if (f === undefined) continue;
    const i = forms.indexOf(f);
    if (i < 0) { forms.push(f); left.push(g.count); } else left[i] += g.count;
  }
  for (const o of state.orders) {
    const i = forms.indexOf(o.form);
    if (i >= 0) left[i] = Math.max(0, left[i] - o.count);
  }
  return { forms, left };
}

/** Pieces offered at the stall at all (ignoring the order reserve) — cheap. */
function offeredCount(state: GameState): number {
  let n = 0;
  for (const g of state.goods) if (state.stallDesignIds.includes(g.designId)) n += g.count;
  return n;
}

/** How many pieces the stall can sell right now (offered designs, minus the order reserve). */
export function stallStock(state: GameState): number {
  if (offeredCount(state) === 0) return 0;
  const b = sellableByForm(state);
  const offered = b.forms.map(() => 0);
  for (const g of state.goods) {
    if (!state.stallDesignIds.includes(g.designId)) continue;
    const i = b.forms.indexOf(formOf(state, g.designId)!);
    if (i >= 0) offered[i] += g.count;
  }
  let n = 0;
  for (let i = 0; i < offered.length; i++) n += Math.min(offered[i], b.left[i]);
  return n;
}

/**
 * Sell from the stall between two instants. Mutates state.
 * Sells lowest-quality pieces first (best ones are kept for orders), and never touches
 * the pieces open orders need.
 */
export function stallSalesBetween(state: GameState, from: number, to: number): { sold: number; taler: number } {
  const rate = stallRate(state);
  if (to <= from || rate <= 0) return { sold: 0, taler: 0 };
  if (offeredCount(state) === 0) { state.stallCarry = 0; return { sold: 0, taler: 0 }; }
  const exact = state.stallCarry + (rate * (to - from)) / 60_000;
  let n = Math.floor(exact);
  state.stallCarry = exact - n;
  if (n === 0) return { sold: 0, taler: 0 };
  const stock = stallStock(state);
  if (stock === 0) { state.stallCarry = 0; return { sold: 0, taler: 0 }; }
  if (n >= stock) { n = stock; state.stallCarry = 0; }
  let sold = 0;
  let taler = 0;
  const budget = sellableByForm(state);
  const order = state.goods.filter((g) => state.stallDesignIds.includes(g.designId));
  if (order.length > 1) order.sort((a, b) => a.quality - b.quality);
  for (const g of order) {
    if (sold >= n) break;
    const i = budget.forms.indexOf(formOf(state, g.designId)!);
    if (i < 0) continue;
    const k = Math.min(g.count, n - sold, budget.left[i]);
    if (k <= 0) continue;
    budget.left[i] -= k;
    g.count -= k;
    sold += k;
    taler += k * pieceValue(state, g) * stallPriceFactor(state);
  }
  if (state.goods.some((g) => g.count === 0)) state.goods = state.goods.filter((g) => g.count > 0);
  taler = Math.round(taler * 100) / 100;
  state.taler = Math.round((state.taler + taler) * 100) / 100;
  state.stats.sold += sold;
  return { sold, taler };
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

export function addGoods(state: GameState, stack: GoodsStack): void {
  const same = state.goods.find((g) => g.designId === stack.designId && g.quality === stack.quality && g.effect === stack.effect);
  if (same) same.count += stack.count;
  else state.goods.push({ ...stack });
}
