import { describe, expect, it } from 'vitest';
import { advance } from '../../src/shared/advance';
import { applyAction } from '../../src/shared/actions';
import { getForm } from '../../src/shared/content';
import { generateOrder } from '../../src/shared/orders';
import { manufakturGame, plainGame, T0 } from './helpers';

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
  it('a Werkstatt never gets body orders; a Manufaktur gets them about half the time', () => {
    let w = plainGame();
    for (let i = 0; i < 50; i++) { const [o, r] = generateOrder(w); expect(o.body).toBeUndefined(); w = { ...w, rng: r }; }
    let m = manufakturGame(); let n = 0;
    for (let i = 0; i < 200; i++) {
      const [o, r] = generateOrder(m);
      if (o.body === 'steinzeug') { n++; expect(o.rewardTaler).toBeGreaterThanOrEqual(Math.round(getForm(o.form).baseValue * o.count * 1.3 * 1.8 * 1.25) - 1); }
      m = { ...m, rng: r };
    }
    expect(n / 200).toBeGreaterThan(0.3); expect(n / 200).toBeLessThan(0.7);
  });
  it('a stoneware order takes only stoneware', () => {
    const s = manufakturGame();
    const earth = s.designs[0];
    s.designs.push({ ...earth, id: 'sc', body: 'steinzeug', glazeId: 'klar-steinzeug' });
    s.orders = [{ ...s.orders[0], id: 'ox', form: 'becher', body: 'steinzeug', count: 2, minQuality: 1 }];
    s.goods = [{ designId: earth.id, quality: 2, effect: null, count: 5 }, { designId: 'sc', quality: 2, effect: null, count: 5 }];
    const bad = applyAction(s, { type: 'deliverOrder', orderId: 'ox', designId: earth.id, quality: 2, effect: null }, T0);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/Steinzeug sein/);
    const good = applyAction(s, { type: 'deliverOrder', orderId: 'ox', designId: 'sc', quality: 2, effect: null }, T0);
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.state.orders.some((o) => o.id === 'ox')).toBe(false);
  });
  it('an order without a body accepts stoneware too', () => {
    const s = manufakturGame();
    s.designs.push({ ...s.designs[0], id: 'sc', body: 'steinzeug', glazeId: 'klar-steinzeug' });
    s.orders = [{ ...s.orders[0], id: 'ox', form: 'becher', count: 2, minQuality: 1 }];
    s.goods = [{ designId: 'sc', quality: 2, effect: null, count: 5 }];
    expect(applyAction(s, { type: 'deliverOrder', orderId: 'ox', designId: 'sc', quality: 2, effect: null }, T0).ok).toBe(true);
  });
});
