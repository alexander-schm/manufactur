import { describe, expect, it } from 'vitest';
import { newGame } from '../../../src/shared/state';
import { stallSalesBetween } from '../../../src/shared/market';
import type { GameState } from '../../../src/shared/types';
import { marketDayAt, nextMarketEdge, trickleVillageRuf, villageRufPerDay } from '../../../src/shared/village/benefits';
import { shopPrice } from '../../../src/shared/village/specialties';

const H = 3_600_000, DAY = 24 * H;
const T0 = 1_800_000_000_000;
// epoch day % 7 === 2 is a Saturday
const SAT = (Math.floor(T0 / DAY) + ((2 - (Math.floor(T0 / DAY) % 7) + 7) % 7)) * DAY;

function withProjects(projects?: Record<string, number>): GameState {
  const s = newGame('p', 1, T0);
  s.village = { villageId: 'v1', specialty: null, buildings: [], helpBoostUntil: 0, trickleCarry: 0, members: 2, projects };
  return s;
}

function stocked(projects?: Record<string, number>): GameState {
  const s = withProjects(projects);
  s.stations.push({ id: 'ms', kind: 'marketStall', level: 1 } as never);
  s.goods = [{ designId: s.designs[0].id, quality: 2, effect: null, count: 5000 }];
  s.stallDesignIds = [s.designs[0].id];
  return s;
}

describe('lasting village benefits', () => {
  it('Dorfbrunnen I gives 3 Ruf a day, carried in fractions; III gives 10', () => {
    const s = withProjects({ dorfbrunnen: 1 });
    for (let i = 0; i < 3; i++) trickleVillageRuf(s, T0 + i * 8 * H, T0 + (i + 1) * 8 * H);
    expect(s.ruf).toBe(3);
    expect(villageRufPerDay(withProjects({ dorfbrunnen: 3 }))).toBe(10);
  });

  it('the museum brings level × own masterworks (at most 10) Ruf a day', () => {
    const s = withProjects({ museum: 2 });
    s.masterworks = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}` }) as never);
    expect(villageRufPerDay(s)).toBe(20);
    trickleVillageRuf(s, T0, T0 + DAY);
    expect(s.ruf).toBe(20);
  });

  it('market day: Saturday from 09:00 UTC, factor and length by Glockenturm level; never without it', () => {
    const s = withProjects({ glockenturm: 1 });
    expect(marketDayAt(s, SAT + 9 * H - 60_000)).toBeNull();
    expect(marketDayAt(s, SAT + 9 * H)).toEqual({ factor: 1.2, endsAt: SAT + 12 * H });
    expect(marketDayAt(s, SAT + 12 * H - 60_000)?.factor).toBe(1.2);
    expect(marketDayAt(s, SAT + 12 * H)).toBeNull();
    expect(nextMarketEdge(s, SAT + 8 * H)).toBe(SAT + 9 * H);
    expect(nextMarketEdge(s, SAT + 10 * H)).toBe(SAT + 12 * H);
    expect(nextMarketEdge(s, SAT + 13 * H)).toBe(SAT + 7 * DAY + 9 * H);
    expect(marketDayAt(withProjects(), SAT + 10 * H)).toBeNull();
    expect(nextMarketEdge(withProjects(), SAT)).toBeNull();
  });

  it('[Review Focus 5] a catch-up across the market day prices each part of it right', () => {
    const from = SAT - 4 * H, to = SAT + 2 * DAY - 16 * H; // Fri 20:00 -> Sun 08:00
    const a = stocked({ glockenturm: 2 });
    const whole = stallSalesBetween(a, from, to);
    const b = stocked({ glockenturm: 2 });
    const cuts = [from, SAT + 9 * H, SAT + 13 * H, to];
    let sum = 0, sold = 0;
    for (let i = 0; i < 3; i++) { const r = stallSalesBetween(b, cuts[i], cuts[i + 1]); sum += r.taler; sold += r.sold; }
    expect(whole.sold).toBeGreaterThan(0);
    expect(whole.sold).toBe(sold);
    expect(Math.abs(whole.taler - sum)).toBeLessThanOrEqual(0.01);
    const plain = stocked({ dorfbrunnen: 1 });
    expect(whole.taler).toBeGreaterThan(stallSalesBetween(plain, from, to).taler);
  });

  it('the Kaolingrube makes kaolin cheaper for everyone', () => {
    expect(shopPrice(withProjects(), 'kaolin')).toBe(6);
    expect(shopPrice(withProjects({ kaolingrube: 1 }), 'kaolin')).toBe(3.6);
    expect(shopPrice(withProjects({ kaolingrube: 3 }), 'kaolin')).toBe(1.8);
    expect(shopPrice(withProjects({ kaolingrube: 3 }), 'ton')).toBe(shopPrice(withProjects(), 'ton'));
  });

  it('without village projects nothing changes', () => {
    const a = stocked(undefined), b = stocked({});
    const from = SAT + 8 * H, to = SAT + 14 * H;
    expect(stallSalesBetween(a, from, to)).toEqual(stallSalesBetween(b, from, to));
    trickleVillageRuf(a, from, to);
    expect(a.ruf).toBe(0);
    expect(a.village?.rufCarry).toBeUndefined();
  });
});
