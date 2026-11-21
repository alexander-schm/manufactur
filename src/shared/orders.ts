import { CUSTOMERS, FORMS, bodyAvailable, getBody, getForm } from './content';
import { appeal } from './design';
import { newId } from './ids';
import { nextRandom, pick, randInt } from './rng';
import type { Design, GameState, GlazeRecipe, GoodsStack, Order, Taste, Tier } from './types';

export const ORDER_REFILL_MS = 4 * 60_000;
/** faster refill while fewer than MIN_ORDERS are open */
export const ORDER_REFILL_LOW_MS = 2 * 60_000;
export const MIN_ORDERS = 3;
export const MAX_ORDERS = 5;
/** Extra pieces per order from Ruf (one per 40) stop here, so famous workshops don't get 70-piece orders. */
export const ORDER_RUF_COUNT_CAP = 20;
export const TIER_MUL: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.4, 3: 2 };

export const BODY_ORDER_PREMIUM = 1.25;
/** chance that a new order comes from a customer who wants a clay body */
export const TIER_ORDER_SHARE: Record<Tier, number> = { werkstatt: 0, manufaktur: 0.5, hofmanufaktur: 0.6 };

function unlockedForms(state: GameState): string[] {
  return Object.values(FORMS).filter((f) => state.unlocks.includes(f.unlock)).map((f) => f.id);
}

/** Generate a new order from the state's rng. Does not mutate state except nextId; returns the advanced rng. */
export function generateOrder(state: GameState): [Order, number] {
  let r = state.rng;
  const plain = CUSTOMERS.filter((c) => !c.body && (!c.unlock || state.unlocks.includes(c.unlock)));
  const fancy = [];
  for (const c of CUSTOMERS) {
    if (!c.body || !bodyAvailable(state, c.body) || (c.unlock && !state.unlocks.includes(c.unlock))) continue;
    fancy.push(c);
    if (getBody(c.body).tier === state.tier) fancy.push(c);
  }
  let pool = plain;
  if (fancy.length > 0) {
    let share; [share, r] = nextRandom(r);
    if (share < TIER_ORDER_SHARE[state.tier]) pool = fancy;
  }
  let cust; [cust, r] = pick(r, pool);
  let taste: Taste; [taste, r] = pick(r, cust.tastes);
  taste = { ...taste };
  const forms = unlockedForms(state);
  if (taste.form && !forms.includes(taste.form)) delete taste.form;
  let form: string;
  if (taste.form) form = taste.form;
  else [form, r] = pick(r, forms);
  let count; [count, r] = randInt(r, 3, 8);
  count += Math.min(ORDER_RUF_COUNT_CAP, Math.floor(state.ruf / 40));
  count = Math.round(count * (getForm(form).orderCountMul ?? 1));
  let q; [q, r] = nextRandom(r);
  const minQuality: 1 | 2 | 3 = state.ruf >= 60 && q < 0.2 ? 3 : state.ruf >= 15 && q < 0.4 ? 2 : 1;
  let seedV; [seedV, r] = nextRandom(r);
  const base = getForm(form).baseValue * count;
  const order: Order = {
    id: `o${state.nextId}`, customerSeed: Math.floor(seedV * 0xffffffff) >>> 0, customerName: cust.name, customerJob: cust.job,
    taste, form, count, minQuality,
    rewardTaler: Math.round(base * 1.3 * (cust.body ? getBody(cust.body).valueMul * BODY_ORDER_PREMIUM : 1)),
    rewardRuf: 1 + Math.floor(count / 3) + (minQuality - 1) + (cust.body ? getBody(cust.body).rufBonus : 0),
    bonusDeadline: null,
  };
  if (cust.body) order.body = cust.body;
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
  if (state.orders.length < MIN_ORDERS) return Math.max(t, state.lastOrderAt + ORDER_REFILL_LOW_MS);
  return Math.max(t, state.lastOrderAt + ORDER_REFILL_MS);
}
