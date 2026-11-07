import { describe, expect, it } from 'vitest';
import { advance } from '../../src/shared/advance';
import { generateOrder } from '../../src/shared/orders';
import { plainGame, T0 } from './helpers';

describe('orders', () => {
  it('new games start with open orders for unlocked forms only', () => {
    const s = advance(plainGame(), T0 + 1000);
    expect(s.orders.length).toBeGreaterThanOrEqual(2);
    for (const o of s.orders) expect(s.unlocks).toContain(o.form);
  });
  it('refills every 2 min below 3 open orders, then every 4 min up to 5', () => {
    const s0 = plainGame();
    expect(s0.orders.length).toBe(2);
    expect(advance(s0, T0 + 119_000).orders.length).toBe(2);
    const s1 = advance(s0, T0 + 120_000);
    expect(s1.orders.length).toBe(3);
    expect(advance(s1, T0 + 120_000 + 4 * 60_000 - 1).orders.length).toBe(3);
    expect(advance(s1, T0 + 120_000 + 4 * 60_000).orders.length).toBe(4);
    expect(advance(s0, T0 + 3 * 3_600_000).orders.length).toBe(5);
  });
  it('generateOrder is deterministic and has German customer text', () => {
    const s = plainGame();
    const [a] = generateOrder(s);
    const [b] = generateOrder(s);
    expect(a).toEqual(b);
    expect(a.customerName.length).toBeGreaterThan(2);
    expect(a.rewardTaler).toBeGreaterThan(0);
  });
});
