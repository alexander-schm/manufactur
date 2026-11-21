import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../src/shared/actions';
import { STATIONS, TIERS, getTier } from '../../src/shared/content';
import type { GameState } from '../../src/shared/types';
import { hofGame, manufakturGame, plainGame, T0 } from './helpers';
import { fmtTaler } from '../../src/shared/format';

const NOW = T0 + 1000;
const PRICE = getTier('manufaktur').price;

function ok(s: GameState, a: Action) {
  const r = applyAction(s, a, NOW);
  if (!r.ok) throw new Error(r.error);
  return r;
}

function rejected(s: GameState, a: Action): string {
  const before = structuredClone(s);
  const r = applyAction(s, a, NOW);
  expect(r.ok).toBe(false);
  expect(s).toEqual(before);
  return r.ok ? '' : r.error;
}

describe('tiers', () => {
  it('upgradeTier buys the Manufaktur: pays, unlocks, gets the stoneware starter glaze', () => {
    const s = plainGame(); s.ruf = 300; s.taler = PRICE;
    const r = ok(s, { type: 'upgradeTier' });
    expect(r.state.tier).toBe('manufaktur');
    expect(r.state.taler).toBe(0);
    expect(r.state.unlocks).toEqual(expect.arrayContaining(['steinzeug', 'teekanne', 'meisterstuecke']));
    expect(r.state.milestonesDone).toContain('tierManufaktur');
    expect(r.state.glazes.some((g) => g.id === 'klar-steinzeug' && g.body === 'steinzeug')).toBe(true);
    expect(r.state.commission).not.toBeNull();
  });
  it('upgradeTier needs Ruf and Taler, and stops at the top tier', () => {
    const s = plainGame(); s.ruf = 299; s.taler = 1e6;
    expect(rejected(s, { type: 'upgradeTier' })).toMatch(/300 Ruf/);
    s.ruf = 300; s.taler = PRICE - 1;
    expect(rejected(s, { type: 'upgradeTier' })).toBe('Für die Manufaktur brauchst du 250.000 Taler');
    expect(rejected(hofGame(), { type: 'upgradeTier' })).toMatch(/Höher hinaus/);
  });
  it('station levels 6–7 need the Manufaktur', () => {
    const s = plainGame(); s.unlocks.push('upgrades'); s.ruf = 1000; s.taler = 1e6;
    const wheel = s.stations.find((x) => x.kind === 'wheel')!; wheel.level = 5;
    expect(rejected(s, { type: 'upgradeStation', stationId: wheel.id })).toMatch(/Manufaktur/);
    s.tier = 'manufaktur';
    let t = ok(s, { type: 'upgradeStation', stationId: wheel.id }).state;
    expect(t.stations.find((x) => x.id === wheel.id)!.level).toBe(6);
    expect(t.taler).toBe(1e6 - STATIONS.wheel.upgradeCost[4]);
    t = ok(t, { type: 'upgradeStation', stationId: wheel.id }).state;
    expect(t.stations.find((x) => x.id === wheel.id)!.level).toBe(7);
    expect(rejected(t, { type: 'upgradeStation', stationId: wheel.id })).toMatch(/Hofmanufaktur/);
    t.tier = 'hofmanufaktur'; t.taler = STATIONS.wheel.upgradeCost[6] - 1;
    expect(rejected(t, { type: 'upgradeStation', stationId: wheel.id })).toBe(`Für den Ausbau brauchst du ${fmtTaler(STATIONS.wheel.upgradeCost[6])} Taler`);
    expect(fmtTaler(STATIONS.wheel.upgradeCost[6])).toMatch(/^\d{1,3}(\.\d{3})+$/);
  });
  it('Hofmanufaktur: needs 1000 Ruf and its price, gives the porcelain glaze, kaolin becomes buyable', () => {
    const hof = getTier('hofmanufaktur');
    expect(hof).toMatchObject({ ruf: 1000, maxStationLevel: 8 });
    expect(hof.price).toBe(2_500_000);
    expect(TIERS.at(-1)!.id).toBe('hofmanufaktur');
    const s = manufakturGame(); s.ruf = 999; s.taler = hof.price;
    expect(rejected(s, { type: 'upgradeTier' })).toMatch(/1000 Ruf/);
    s.ruf = 1000; s.taler = hof.price - 1;
    expect(rejected(s, { type: 'upgradeTier' })).toBe('Für die Hofmanufaktur brauchst du 2.500.000 Taler');
    s.taler = hof.price;
    expect(rejected(s, { type: 'buyMaterial', material: 'kaolin', amount: 10 })).toMatch(/noch nicht/);
    const r = ok(s, { type: 'upgradeTier' });
    expect(r.state.tier).toBe('hofmanufaktur');
    expect(r.state.taler).toBe(0);
    expect(r.state.milestonesDone).toContain('tierHofmanufaktur');
    expect(r.state.unlocks).toEqual(expect.arrayContaining(['porzellan', 'figur', 'fliese']));
    expect(r.state.glazes.some((g) => g.id === 'klar-porzellan' && g.body === 'porzellan')).toBe(true);
    r.state.taler = 1000;
    const t = ok(r.state, { type: 'buyMaterial', material: 'kaolin', amount: 10 });
    expect(t.state.materials.kaolin).toBe(10);
  });
  it('level 8 needs the Hofmanufaktur; all stations to level 8 cost about 3 000 000 Taler', () => {
    const s = manufakturGame(); s.ruf = 2000; s.taler = 1e9;
    const wheel = s.stations.find((x) => x.kind === 'wheel')!; wheel.level = 7;
    expect(rejected(s, { type: 'upgradeStation', stationId: wheel.id })).toMatch(/Hofmanufaktur/);
    const h = hofGame(); h.ruf = 2000; h.taler = 1e9;
    h.stations.find((x) => x.kind === 'wheel')!.level = 7;
    const t = ok(h, { type: 'upgradeStation', stationId: wheel.id }).state;
    expect(t.stations.find((x) => x.id === wheel.id)!.level).toBe(8);
    expect(t.taler).toBe(1e9 - STATIONS.wheel.upgradeCost[6]);
    const total = Object.values(STATIONS).reduce((a, d) => a + d.upgradeCost[6], 0);
    expect(total).toBeGreaterThan(2_900_000);
    expect(total).toBeLessThan(3_100_000);
    const kilnCost = STATIONS.kiln.upgradeCost[6];
    expect(Object.values(STATIONS).every((d) => d.upgradeCost[6] <= kilnCost)).toBe(true);
    expect(Object.values(STATIONS).every((d) => d.rufRequired[6] === 1000 && d.piecesPerMinute.length === 8 && d.upgradeCost.length === 7)).toBe(true);
    expect(STATIONS.kiln.capacity![7]).toBe(150);
    expect(STATIONS.shelf.capacity![7]).toBe(1000);
    expect(STATIONS.marketStall.capacity![7]).toBe(12);
  });
  it('manufakturGame starts quiet', () => {
    const s = manufakturGame();
    expect(s.milestonesDone).toContain('tierManufaktur');
    expect(s.milestonesAcked).toEqual(s.milestonesDone);
    expect(s.stations.every((x) => x.level === 5)).toBe(true);
  });
});
