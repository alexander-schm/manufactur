import { describe, expect, it } from 'vitest';
import { FORMS, STATIONS, TRAITS, EFFECTS, UNLOCKS, MATERIALS, NAMES, PERSONALITIES, CUSTOMERS, getForm, getStationDef } from '../../src/shared/content';
import type { StationKind } from '../../src/shared/types';

const KINDS: StationKind[] = ['prepBench', 'wheel', 'dryingRack', 'kiln', 'glazeTable', 'shelf', 'marketStall'];

describe('content', () => {
  it('every form unlock exists in unlocks', () => {
    for (const f of Object.values(FORMS)) expect(UNLOCKS[f.unlock], f.id).toBeDefined();
  });
  it('every effect has a German hint', () => {
    for (const e of Object.values(EFFECTS)) expect(e.hint.length).toBeGreaterThan(10);
  });
  it('has at least 10 traits', () => {
    expect(Object.keys(TRAITS).length).toBeGreaterThanOrEqual(10);
  });
  it('every station kind has a definition', () => {
    for (const k of KINDS) expect(getStationDef(k).kind).toBe(k);
  });
  it('lookup throws on unknown id', () => {
    expect(() => getForm('gibtsnicht')).toThrow();
  });
  it('has enough names, personalities and customers', () => {
    expect(NAMES.length).toBeGreaterThanOrEqual(40);
    expect(PERSONALITIES.length).toBeGreaterThanOrEqual(20);
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(12);
  });
  it('kaolin is declared but locked', () => {
    expect(MATERIALS.kaolin.locked).toBe(true);
  });
});
