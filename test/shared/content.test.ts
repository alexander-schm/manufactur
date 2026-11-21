import { describe, expect, it } from 'vitest';
import { FORMS, STATIONS, TRAITS, EFFECTS, UNLOCKS, MATERIALS, NAMES, PERSONALITIES, CUSTOMERS, BODIES, getForm, getStationDef, bodyOf, nextTier, tierAtLeast, tierForLevel } from '../../src/shared/content';
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
  it('every material unlock exists, and every body material is a material', () => {
    for (const m of Object.values(MATERIALS)) if (m.unlock) expect(UNLOCKS[m.unlock], m.id).toBeDefined();
    for (const b of Object.values(BODIES)) expect(MATERIALS[b.material], b.id).toBeDefined();
  });
  it('tier helpers', () => {
    expect(tierAtLeast({ tier: 'manufaktur' }, 'werkstatt')).toBe(true);
    expect(tierAtLeast({ tier: 'werkstatt' }, 'manufaktur')).toBe(false);
    expect(nextTier({ tier: 'werkstatt' })!.id).toBe('manufaktur');
    expect(tierForLevel(6)!.id).toBe('manufaktur');
    expect(bodyOf({})).toBe('irdenware');
  });
  it('station level arrays line up', () => {
    for (const d of Object.values(STATIONS)) {
      const L = d.piecesPerMinute.length;
      expect(L, d.kind).toBe(7);
      expect(d.upgradeCost.length, d.kind).toBe(L - 1);
      expect(d.rufRequired.length, d.kind).toBe(L - 1);
      if (d.capacity) expect(d.capacity.length, d.kind).toBe(L);
    }
  });
});
