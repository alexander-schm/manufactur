import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/shared/actions';
import { advance } from '../../src/shared/advance';
import { missingAmount } from '../../src/shared/shop';
import { plainGame, T0, withStanding } from './helpers';

const MIN = 60_000;
const H = 60 * MIN;

describe('bulk buying and keep-in-stock', () => {
  it('buyMaterial takes up to 100 000 at once', () => {
    const s = plainGame(); s.taler = 1e6;
    const ok = applyAction(s, { type: 'buyMaterial', material: 'ton', amount: 100000 }, T0);
    expect(ok.ok).toBe(true);
    if (ok.ok) { expect(ok.state.materials.ton).toBeGreaterThanOrEqual(100000); expect(ok.state.taler).toBeGreaterThanOrEqual(0); }
    const bad = applyAction(s, { type: 'buyMaterial', material: 'ton', amount: 100001 }, T0);
    expect(bad).toEqual({ ok: false, error: 'Ungültige Menge' });
  });
  it('setKeepStock validates and 0 switches it off', () => {
    const s = plainGame();
    const k = applyAction(s, { type: 'setKeepStock', material: 'kaolin', target: 10 }, T0);
    expect(k.ok).toBe(false);
    if (!k.ok) expect(k.error).toMatch(/noch nicht zu kaufen/);
    expect(applyAction(s, { type: 'setKeepStock', material: 'ton', target: -1 }, T0)).toEqual({ ok: false, error: 'Ungültige Menge' });
    const on = applyAction(s, { type: 'setKeepStock', material: 'ton', target: 100 }, T0);
    expect(on.ok && on.state.keepStock).toEqual({ ton: 100 });
    if (on.ok) {
      const off = applyAction(on.state, { type: 'setKeepStock', material: 'ton', target: 0 }, T0);
      expect(off.ok && off.state.keepStock).toEqual({});
    }
  });
  it('keeps the stock topped up during catch-up', () => {
    const s = plainGame(); s.keepStock = { ton: 100 }; s.taler = 1000;
    const a = advance(s, T0 + MIN);
    expect(a.materials.ton).toBe(100); expect(a.taler).toBe(930);
  });
  it('missingAmount is clamped by target and by affordable Taler', () => {
    const s = plainGame(); s.taler = 10; s.materials.ton = 0;
    expect(missingAmount(s, 'ton', 5)).toBe(5);
    expect(missingAmount(s, 'ton', 500)).toBe(10);
    s.materials.ton = 600;
    expect(missingAmount(s, 'ton', 500)).toBe(0);
    expect(missingAmount(s, 'kaolin', 500)).toBe(0);
  });
  it('[Review Focus 3] with little Taler it buys what it can and never goes negative', () => {
    const s = withStanding(); s.keepStock = { ton: 500 }; s.taler = 10;
    const a = advance(s, T0 + MIN);
    expect(a.materials.ton).toBeLessThanOrEqual(40); expect(a.taler).toBeGreaterThanOrEqual(0);
    const noBuy = advance({ ...s, keepStock: {} }, T0 + MIN);
    expect(a.materials.ton).toBeGreaterThan(noBuy.materials.ton); // it did buy something
    const b = advance(s, T0 + 24 * H);
    expect(b.taler).toBeGreaterThanOrEqual(0); expect(b.stats.made).toBeGreaterThan(0);
  });
  it('one long catch-up equals many short ones with keep-in-stock', () => {
    const base = withStanding(); base.stallDesignIds = [base.designs[0].id]; base.keepStock = { ton: 60, glasurbasis: 20 };
    const once = advance(base, T0 + 6 * H);
    let stepped = base; for (let t = T0 + 10 * MIN; t <= T0 + 6 * H; t += 10 * MIN) stepped = advance(stepped, t);
    expect(Math.abs(once.taler - stepped.taler) / stepped.taler).toBeLessThan(0.01);
  });
});
