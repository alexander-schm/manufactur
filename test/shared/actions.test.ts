import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../src/shared/actions';
import { advance } from '../../src/shared/advance';
import type { GameState } from '../../src/shared/types';
import { plainGame, T0 } from './helpers';

const NOW = T0 + 1000;

function ok(s: GameState, a: Action, now = NOW) {
  const r = applyAction(s, a, now);
  if (!r.ok) throw new Error(r.error);
  return r;
}

function expectRejected(s: GameState, a: Action, now = NOW) {
  const before = structuredClone(s);
  const r = applyAction(s, a, now);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.length).toBeGreaterThan(3);
  expect(s).toEqual(before);
}

describe('actions', () => {
  it('buyMaterial spends Taler and bumps version', () => {
    const s = plainGame();
    const r = ok(s, { type: 'buyMaterial', material: 'ton', amount: 10 });
    expect(r.state.materials.ton).toBe(40);
    expect(r.state.taler).toBe(90);
    expect(r.state.version).toBe(s.version + 1);
  });
  it('[Review Focus 4] invalid actions are rejected in German without changing state', () => {
    const s = plainGame();
    s.taler = 3;
    expectRejected(s, { type: 'buyMaterial', material: 'ton', amount: 10 });
    expectRejected(s, { type: 'buyMaterial', material: 'kaolin', amount: 1 });
    expectRejected(s, { type: 'assign', workerId: 'nobody', stationId: null });
    expectRejected(s, { type: 'queueBatch', designId: 'nope', count: 6 });
    expectRejected(s, { type: 'deliverOrder', orderId: 'x', designId: s.designs[0].id, quality: 2, effect: null });
    expectRejected(s, { type: 'saveDesign', design: { ...s.designs[0], profile: { ...s.designs[0].profile, height: 7 } } });
    expectRejected(s, { type: 'sellNow', designId: s.designs[0].id, quality: 2, effect: null, count: 1 });
    expectRejected(s, { type: 'bogus' } as unknown as Action);
  });
  it('handTouch speeds up the running batch and has a 10 minute cooldown', () => {
    let s = plainGame();
    s = ok(s, { type: 'queueBatch', designId: s.designs[0].id, count: 6 }, T0).state;
    s = advance(s, T0 + 1);
    const bench = s.stations.find((x) => x.kind === 'prepBench')!;
    const before = s.batches[0].durationMs;
    s = ok(s, { type: 'handTouch', stationId: bench.id }, T0 + 2).state;
    expect(s.batches[0].durationMs).toBeLessThan(before);
    expectRejected(s, { type: 'handTouch', stationId: bench.id }, T0 + 5 * 60_000);
  });
  it('delivering an order pays out and removes goods and order', () => {
    let s = advance(plainGame(), NOW);
    const order = s.orders[0];
    s.goods = [{ designId: s.designs[0].id, quality: 3, effect: null, count: order.count + 2 }];
    s.designs[0].form = order.form;
    const taler = s.taler;
    const r = ok(s, { type: 'deliverOrder', orderId: order.id, designId: s.designs[0].id, quality: 3, effect: null });
    expect(r.state.taler).toBeGreaterThan(taler);
    expect(r.state.ruf).toBeGreaterThan(0);
    expect(r.state.orders.find((o) => o.id === order.id)).toBeUndefined();
    expect(r.state.goods[0].count).toBe(2);
    expect(r.events.some((e) => e.kind === 'orderDone')).toBe(true);
  });
  it('hire needs the hiring unlock and costs 30 × workers', () => {
    const s = plainGame();
    expectRejected(s, { type: 'hire', workerId: s.hirePool[0].id });
    s.unlocks.push('hiring');
    const r = ok(s, { type: 'hire', workerId: s.hirePool[0].id });
    expect(r.state.workers).toHaveLength(2);
    expect(r.state.taler).toBe(70);
    expect(r.state.hirePool).toHaveLength(3);
  });
  it('assign respects station worker limits', () => {
    const s = plainGame();
    const rack = s.stations.find((x) => x.kind === 'dryingRack')!;
    expectRejected(s, { type: 'assign', workerId: s.workers[0].id, stationId: rack.id });
  });
});
