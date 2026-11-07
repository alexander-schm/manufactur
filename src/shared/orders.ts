import { CUSTOMERS, FORMS, getForm } from './content';
import { appeal } from './design';
import { newId } from './ids';
import { nextRandom, pick, randInt } from './rng';
import type { Design, GameState, GlazeRecipe, GoodsStack, Order, Taste } from './types';

export const ORDER_REFILL_MS = 4 * 60_000;
export const MIN_ORDERS = 3;
export const MAX_ORDERS = 5;
export const TIER_MUL: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.4, 3: 2 };

function unlockedForms(state: GameState): string[] {
  return Object.values(FORMS).filter((f) => state.unlocks.includes(f.unlock)).map((f) => f.id);
}

/** Generate a new order from the state's rng. Does not mutate state except nextId; returns the advanced rng. */
export function generateOrder(state: GameState): [Order, number] {
  let r = state.rng;
  let cust; [cust, r] = pick(r, CUSTOMERS);
  let taste: Taste; [taste, r] = pick(r, cust.tastes);
  taste = { ...taste };
  const forms = unlockedForms(state);
  if (taste.form && !forms.includes(taste.form)) delete taste.form;
  let form: string;
  if (taste.form) form = taste.form;
  else [form, r] = pick(r, forms);
  let count; [count, r] = randInt(r, 3, 8);
  count += Math.floor(state.ruf / 40);
  let q; [q, r] = nextRandom(r);
  const minQuality: 1 | 2 | 3 = state.ruf >= 60 && q < 0.2 ? 3 : state.ruf >= 15 && q < 0.4 ? 2 : 1;
  let seedV; [seedV, r] = nextRandom(r);
  const base = getForm(form).baseValue * count;
  const order: Order = {
    id: `o${state.nextId}`, customerSeed: Math.floor(seedV * 0xffffffff) >>> 0, customerName: cust.name, customerJob: cust.job,
    taste, form, count, minQuality,
    rewardTaler: Math.round(base * 1.3), rewardRuf: 1 + Math.floor(count / 3) + (minQuality - 1),
    bonusDeadline: null,
  };
  return [order, r];
}

export function addOrder(state: GameState, now: number): void {
  const [o, r] = generateOrder(state);
  newId(state, 'o');
  state.rng = r;
  state.orders.push(o);
  state.lastOrderAt = now;
}

export function orderReward(order: Order, stack: GoodsStack, design: Design, glaze: GlazeRecipe | undefined): { taler: number; ruf: number } {
  const a = appeal(design, glaze, order.taste);
  return {
    taler: Math.round(order.rewardTaler * (1 + a) * TIER_MUL[stack.quality]),
    ruf: Math.round(order.rewardRuf * (1 + a)),
  };
}

export function nextOrderTime(state: GameState, t: number): number | null {
  if (state.orders.length >= MAX_ORDERS) return null;
  if (state.orders.length < MIN_ORDERS) return t;
  return Math.max(t, state.lastOrderAt + ORDER_REFILL_MS);
}
