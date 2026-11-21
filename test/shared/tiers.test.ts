import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../src/shared/actions';
import type { GameState } from '../../src/shared/types';
import { manufakturGame, plainGame, T0 } from './helpers';

const NOW = T0 + 1000;

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
    const s = plainGame(); s.ruf = 300; s.taler = 50000;
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
    s.ruf = 300; s.taler = 49999;
    expect(rejected(s, { type: 'upgradeTier' })).toMatch(/Taler/);
    expect(rejected(manufakturGame(), { type: 'upgradeTier' })).toMatch(/Höher hinaus/); // Part 1 only
  });
  it('station levels 6–7 need the Manufaktur', () => {
    const s = plainGame(); s.unlocks.push('upgrades'); s.ruf = 1000; s.taler = 1e6;
    const wheel = s.stations.find((x) => x.kind === 'wheel')!; wheel.level = 5;
    expect(rejected(s, { type: 'upgradeStation', stationId: wheel.id })).toMatch(/Manufaktur/);
    s.tier = 'manufaktur';
    let t = ok(s, { type: 'upgradeStation', stationId: wheel.id }).state;
    expect(t.stations.find((x) => x.id === wheel.id)!.level).toBe(6);
    expect(t.taler).toBe(1e6 - 9000);
    t = ok(t, { type: 'upgradeStation', stationId: wheel.id }).state;
    expect(t.stations.find((x) => x.id === wheel.id)!.level).toBe(7);
    expect(rejected(t, { type: 'upgradeStation', stationId: wheel.id })).toMatch(/höchster Stufe/);
  });
  it('manufakturGame starts quiet', () => {
    const s = manufakturGame();
    expect(s.milestonesDone).toContain('tierManufaktur');
    expect(s.milestonesAcked).toEqual(s.milestonesDone);
    expect(s.stations.every((x) => x.level === 5)).toBe(true);
  });
});
