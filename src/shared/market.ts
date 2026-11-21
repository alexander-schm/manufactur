import { EFFECTS, bodyOf, getBody, getForm, getStationDef, own } from './content';
import type { Design, GameState, GoodsStack } from './types';

export const QUALITY_MUL: Record<1 | 2 | 3, number> = { 1: 0.8, 2: 1, 3: 1.3 };
export const STALL_PRICE_FACTOR = 0.8;
export const MARKTHALLE_PRICE_FACTOR = 0.9;
export const stallPriceFactor = (s: GameState) => (s.village?.buildings.includes('markthalle') ? MARKTHALLE_PRICE_FACTOR : STALL_PRICE_FACTOR);

export function pieceValue(state: GameState, stack: Pick<GoodsStack, 'designId' | 'quality' | 'effect'>): number {
  const design = state.designs.find((d) => d.id === stack.designId);
  const base = design ? getForm(design.form).baseValue : 5;
  const eff = stack.effect ? own(EFFECTS, stack.effect)?.valueMul ?? 1 : 1;
  const body = design ? getBody(bodyOf(design)).valueMul : 1;
  return base * QUALITY_MUL[stack.quality] * eff * body;
}

export function stallRate(state: GameState): number {
  const st = state.stations.find((s) => s.kind === 'marketStall');
  if (!st) return 0;
  return getStationDef('marketStall').capacity![st.level - 1];
}

function designOf(state: GameState, designId: string): Design | undefined {
  const ds = state.designs;
  for (let i = 0; i < ds.length; i++) if (ds[i].id === designId) return ds[i];
  return undefined;
}

/**
 * Pieces per (form, body) group the stall may sell: everything above what open orders of that group need.
 * An order without a body reserves earthenware. Written with parallel plain arrays — this runs inside the catch-up loop.
 */
function sellableByGroup(state: GameState): { forms: string[]; bodies: string[]; left: number[] } {
  const forms: string[] = [];
  const bodies: string[] = [];
  const left: number[] = [];
  for (const g of state.goods) {
    const d = designOf(state, g.designId);
    if (d === undefined) continue;
    const i = groupIndex(forms, bodies, d.form, bodyOf(d));
    if (i < 0) { forms.push(d.form); bodies.push(bodyOf(d)); left.push(g.count); } else left[i] += g.count;
  }
  for (const o of state.orders) {
    const i = groupIndex(forms, bodies, o.form, o.body ?? 'irdenware');
    if (i >= 0) left[i] = Math.max(0, left[i] - o.count);
  }
  return { forms, bodies, left };
}

function groupIndex(forms: string[], bodies: string[], form: string, body: string): number {
  for (let i = 0; i < forms.length; i++) if (forms[i] === form && bodies[i] === body) return i;
  return -1;
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
  const b = sellableByGroup(state);
  const offered = b.forms.map(() => 0);
  for (const g of state.goods) {
    if (!state.stallDesignIds.includes(g.designId)) continue;
    const d = designOf(state, g.designId);
    if (d === undefined) continue;
    const i = groupIndex(b.forms, b.bodies, d.form, bodyOf(d));
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
  const budget = sellableByGroup(state);
  const order = state.goods.filter((g) => state.stallDesignIds.includes(g.designId));
  if (order.length > 1) order.sort((a, b) => a.quality - b.quality);
  for (const g of order) {
    if (sold >= n) break;
    const d = designOf(state, g.designId);
    if (d === undefined) continue;
    const i = groupIndex(budget.forms, budget.bodies, d.form, bodyOf(d));
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
