import { describe, expect, it } from 'vitest';
import { advance } from '../../src/shared/advance';
import { getStationDef } from '../../src/shared/content';
import type { GameState } from '../../src/shared/types';
import { plainGame, T0 } from './helpers';

const MIN = 60_000;
const H = 60 * MIN;
const goodsCount = (s: GameState) => s.goods.reduce((a, g) => a + g.count, 0);
const shelfCap = (s: GameState) => { const sh = s.stations.find((x) => x.kind === 'shelf')!; return getStationDef('shelf').capacity![sh.level - 1]; };

function withStanding(seed = 1): GameState {
  const s = plainGame(seed);
  s.standing = { designId: s.designs[0].id, batchSize: 6, autoBuy: true };
  s.stallDesignIds = [];
  return s;
}

describe('advance', () => {
  it('produces the first batch of 6 cups after 150–210 s', () => {
    expect(goodsCount(advance(withStanding(), T0 + 150_000))).toBe(0);
    expect(goodsCount(advance(withStanding(), T0 + 210_000))).toBeGreaterThanOrEqual(6);
  });
  it('does not mutate the input', () => {
    const s = withStanding();
    const copy = structuredClone(s);
    advance(s, T0 + H);
    expect(s).toEqual(copy);
  });
  it('is deterministic', () => {
    expect(advance(withStanding(3), T0 + 2 * H)).toEqual(advance(withStanding(3), T0 + 2 * H));
  });
  it('advancing twice to the same time equals once', () => {
    const once = advance(withStanding(), T0 + H);
    expect(advance(once, T0 + H)).toEqual(once);
  });
  it('is split-invariant within ±1 piece over 1 h', () => {
    const base = withStanding(); base.stallDesignIds = [base.designs[0].id];
    const direct = advance(base, T0 + H);
    let stepped = base;
    for (let t = T0 + 7 * MIN; t <= T0 + H; t += 7 * MIN + 13_000) stepped = advance(stepped, t);
    stepped = advance(stepped, T0 + H);
    expect(Math.abs(stepped.stats.made - direct.stats.made)).toBeLessThanOrEqual(6);
    expect(Math.abs(stepped.stats.sold - direct.stats.sold)).toBeLessThanOrEqual(1);
  });
  it('[Review Focus 1] 30 days of absence: each server-sized chunk is fast, the total is bounded, shelf caps stock, money is earned', () => {
    const base = withStanding(); base.stallDesignIds = [base.designs[0].id];
    const end = T0 + 30 * 24 * H;
    advance(base, T0 + 2 * H, 3000); // warm-up so JIT compilation isn't measured
    let s = base;
    const chunks: number[] = [];
    const t0 = performance.now();
    while (s.lastTick < end) {
      const c = performance.now();
      s = advance(s, end, 3000); // CATCHUP_EVENTS in src/worker/game.ts
      chunks.push(performance.now() - c);
    }
    const total = performance.now() - t0;
    // median, not max: a single GC pause on a busy machine must not fail the build
    const median = [...chunks].sort((a, b) => a - b)[Math.floor(chunks.length / 2)];
    expect(median).toBeLessThan(20);
    expect(total).toBeLessThan(1000);
    expect(goodsCount(s)).toBeLessThanOrEqual(shelfCap(s));
    expect(s.taler).toBeGreaterThan(base.taler);
  });
  it('[Review Focus 1] without a stall, a full shelf blocks production but loses nothing', () => {
    const s = advance(withStanding(), T0 + 24 * H);
    expect(goodsCount(s)).toBeLessThanOrEqual(shelfCap(s));
    expect(goodsCount(s)).toBeGreaterThan(shelfCap(s) - 6);
    const blocked = s.batches.filter((b) => b.blocked);
    expect(blocked.length).toBeGreaterThan(0);
  });
  it('[Review Focus 2] time going backwards changes nothing', () => {
    const s = advance(withStanding(), T0 + H);
    expect(advance(s, s.lastTick - 5000)).toEqual(s);
  });
  it('24 h offline: the stall keeps selling the whole time', () => {
    const base = withStanding(); base.stallDesignIds = [base.designs[0].id];
    base.lastSeen = T0;
    const s = advance(base, T0 + 24 * H);
    const st = s.stations.find((x) => x.kind === 'marketStall')!;
    const rate = getStationDef('marketStall').capacity![st.level - 1];
    expect(s.away).not.toBeNull();
    expect(s.away!.sold).toBeGreaterThanOrEqual(Math.floor(rate * 24 * 60 * 0.95));
    expect(s.away!.made).toBeGreaterThan(0);
  });
  it('runs out of clay without autoBuy and simply stops', () => {
    const base = withStanding(); base.standing!.autoBuy = false;
    const s = advance(base, T0 + 6 * H);
    expect(s.stats.made).toBe(30); // 30 Ton, 1 per cup
  });
});

describe('market stall reserve', () => {
  it('keeps enough pieces on the shelf for open orders of that form', () => {
    const s = plainGame();
    s.stallDesignIds = [s.designs[0].id];
    s.orders = s.orders.map((o) => ({ ...o, form: 'becher', count: 5 }));
    const reserved = s.orders.length * 5;
    s.goods = [{ designId: s.designs[0].id, quality: 2, effect: null, count: reserved + 3 }];
    const after = advance(s, T0 + 60 * MIN);
    const left = after.goods.reduce((n, g) => n + g.count, 0);
    expect(left).toBeGreaterThanOrEqual(Math.min(reserved, after.orders.filter((o) => o.form === 'becher').reduce((n, o) => n + o.count, 0)));
    expect(after.stats.sold).toBeLessThanOrEqual(3);
  });
  it('does not spin when everything is reserved and the shelf is full', () => {
    const s = withStanding();
    s.stallDesignIds = [s.designs[0].id];
    s.orders = s.orders.map((o) => ({ ...o, form: 'becher', count: 30 }));
    const t = performance.now();
    advance(s, T0 + 24 * H);
    expect(performance.now() - t).toBeLessThan(500);
  });
});

describe('[Final review #3] absence is never penalised: one long catch-up equals many short ones', () => {
  it('6 h in one go vs in 10-minute steps: same money, same traits, same unlocks', () => {
    const base = withStanding(); base.stallDesignIds = [base.designs[0].id];
    base.workers[0].traits = ['geduldig'];
    const once = advance(base, T0 + 6 * H);
    let stepped = base;
    for (let t = T0 + 10 * MIN; t <= T0 + 6 * H; t += 10 * MIN) stepped = advance(stepped, t);
    expect(Math.abs(once.taler - stepped.taler) / stepped.taler).toBeLessThan(0.01);
    expect(once.workers.map((w) => w.traits)).toEqual(stepped.workers.map((w) => w.traits));
    expect(once.unlocks).toEqual(stepped.unlocks);
  });
  it('a worker catches up on every trait earned while away', () => {
    const s = withStanding();
    s.stallDesignIds = [s.designs[0].id];
    s.workers[0].traits = ['geduldig'];
    const after = advance(s, T0 + 12 * H);
    expect(after.workers[0].xp).toBeGreaterThanOrEqual(300);
    expect(after.workers[0].traits.length).toBe(3);
  });
});

describe('[Final review #4] budgeted catch-up', () => {
  it('stops after maxEvents with lastTick < now, and continuing reaches the one-shot result', () => {
    const base = withStanding(); base.stallDesignIds = [base.designs[0].id];
    const end = T0 + 3 * 24 * H;
    const once = advance(base, end);
    let s = advance(base, end, 500);
    expect(s.lastTick).toBeLessThan(end);
    let rounds = 1;
    while (s.lastTick < end && rounds < 1000) { s = advance(s, end, 500); rounds++; }
    expect(s.lastTick).toBe(end);
    expect(rounds).toBeGreaterThan(1);
    expect(s.stats.made).toBe(once.stats.made);
    expect(s.taler).toBeCloseTo(once.taler, 1);
  });
});
