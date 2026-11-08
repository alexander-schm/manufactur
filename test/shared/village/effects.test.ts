import { describe, expect, it } from 'vitest';
import { applyAction } from '../../../src/shared/actions';
import { advance } from '../../../src/shared/advance';
import { getStationDef } from '../../../src/shared/content';
import { stageDurationMs } from '../../../src/shared/production';
import { migrateState, newGame, SCHEMA_VERSION } from '../../../src/shared/state';
import type { GameState } from '../../../src/shared/types';
import { assignSpecialty, shopPrice, SPECIALTIES } from '../../../src/shared/village/specialties';

const T0 = 1_800_000_000_000;
const MIN = 60_000, H = 60 * MIN;

function inVillage(spec: string | null, members = 2): GameState {
  const s = newGame('p', 1, T0);
  s.village = { villageId: 'v1', specialty: spec, buildings: [], helpBoostUntil: 0, trickleCarry: 0, members };
  return s;
}

describe('schema v2', () => {
  it('migrates a v1 state', () => {
    const v1: any = newGame('p', 1, T0);
    v1.schemaVersion = 1; delete v1.village; delete v1.decor; delete v1.decorPlaced;
    const s = migrateState(JSON.parse(JSON.stringify(v1)));
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.village).toBeNull();
    expect(s.decor).toEqual([]);
    expect(s.decorPlaced).toEqual([]);
  });
});

describe('specialties', () => {
  it('assigns the least-taken specialty', () => {
    for (let seed = 0; seed < 20; seed++) expect(assignSpecialty(['ton', 'ton', 'holz'], seed)).not.toBe('ton');
    expect(Object.keys(SPECIALTIES)).toEqual(expect.arrayContaining(['ton', 'eisenoxid', 'kupferoxid', 'kobalt', 'holz']));
  });
  it('prices: own specialty cheap, foreign colourant ×2 in a village, solo unchanged', () => {
    expect(shopPrice(inVillage('kupferoxid'), 'kupferoxid')).toBe(Math.ceil(8 * 0.3));
    expect(shopPrice(inVillage('ton'), 'kobalt')).toBe(24);
    expect(shopPrice(newGame('p', 1, T0), 'kobalt')).toBe(12);
    expect(shopPrice(inVillage('ton', 1), 'kobalt')).toBe(12);
  });
  it('buyMaterial uses shopPrice', () => {
    const s = inVillage('ton');
    s.unlocks.push('kobalt');
    const r = applyAction(s, { type: 'buyMaterial', material: 'kobalt', amount: 1 }, T0 + 1);
    expect(r.ok && r.state.taler).toBe(100 - 24);
  });
  it('the specialty trickles in, path-independently', () => {
    const s = inVillage('ton');
    const once = advance(s, T0 + 6 * H);
    let step = s;
    for (let t = T0 + 10 * MIN; t <= T0 + 6 * H; t += 10 * MIN) step = advance(step, t);
    expect(once.materials.ton - 30).toBeGreaterThanOrEqual(239);
    expect(once.materials.ton - 30).toBeLessThanOrEqual(241);
    expect(step.materials.ton).toBe(once.materials.ton);
  });
});

describe('village effects in the solo simulation', () => {
  it('a helping hand speeds stations up by 1.25', () => {
    const s = inVillage('ton');
    const wheel = s.stations.find((x) => x.kind === 'wheel')!;
    const b = { id: 'b', designId: s.designs[0].id, count: 6, stage: 'form' as const, stationId: null, startedAt: null, durationMs: 0, quality: 50 };
    const normal = stageDurationMs(s, b, wheel, T0);
    s.village!.helpBoostUntil = T0 + 10 * MIN;
    expect(stageDurationMs(s, b, wheel, T0)).toBeCloseTo(normal / 1.25, -1);
  });
  it('the market hall raises stall income by 12.5 %', () => {
    const base = inVillage('holz');
    base.stallDesignIds = [base.designs[0].id];
    base.orders = [];
    base.goods = [{ designId: base.designs[0].id, quality: 2, effect: null, count: 50 }];
    const a = advance(base, T0 + 30 * MIN);
    const hall = structuredClone(base); hall.village!.buildings = ['markthalle'];
    const b = advance(hall, T0 + 30 * MIN);
    const gainA = a.taler - base.taler, gainB = b.taler - base.taler;
    expect(gainB / gainA).toBeGreaterThan(1.12);
    expect(gainB / gainA).toBeLessThan(1.13);
  });
  it('the clay pit makes clay cheaper', () => {
    const s = inVillage('holz'); s.village!.buildings = ['tongrube'];
    expect(shopPrice(s, 'ton')).toBeLessThan(1);
  });
});

describe('decor', () => {
  it('place only owned decor, at most 4', () => {
    const s = newGame('p', 1, T0);
    expect(applyAction(s, { type: 'placeDecor', id: 'laterne' }, T0).ok).toBe(false);
    s.decor = ['laterne', 'vogelhaus', 'blumenkasten', 'wimpelkette', 'wandteller'];
    let st = s;
    for (const id of ['laterne', 'vogelhaus', 'blumenkasten', 'wimpelkette']) {
      const r = applyAction(st, { type: 'placeDecor', id }, T0);
      expect(r.ok).toBe(true);
      if (r.ok) st = r.state;
    }
    expect(applyAction(st, { type: 'placeDecor', id: 'wandteller' }, T0).ok).toBe(false);
    const rem = applyAction(st, { type: 'removeDecor', id: 'laterne' }, T0);
    expect(rem.ok && rem.state.decorPlaced).not.toContain('laterne');
  });
});
