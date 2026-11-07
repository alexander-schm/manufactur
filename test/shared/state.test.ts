import { describe, expect, it } from 'vitest';
import { migrateState, newGame, newId, SCHEMA_VERSION } from '../../src/shared/state';
import { T0 } from './helpers';

describe('newGame', () => {
  it('is deterministic for the same seed', () => {
    expect(newGame('p', 5, T0)).toEqual(newGame('p', 5, T0));
  });
  it('has the starting kit from the plan', () => {
    const s = newGame('p', 5, T0);
    expect(s.taler).toBe(100);
    expect(s.ruf).toBe(0);
    expect(s.materials.ton).toBe(30);
    expect(s.materials.glasurbasis).toBe(10);
    expect(s.stations.map((x) => x.kind).sort()).toEqual(['dryingRack', 'glazeTable', 'kiln', 'marketStall', 'prepBench', 'shelf', 'wheel']);
    expect(s.stations.every((x) => x.level === 1)).toBe(true);
    expect(s.workers).toHaveLength(1);
    const wheel = s.stations.find((x) => x.kind === 'wheel')!;
    expect(s.workers[0].stationId).toBe(wheel.id);
    expect(s.designs[0].name).toBe('Erster Becher');
    expect(s.glazes[0].id).toBe('klar');
    expect(s.hirePool).toHaveLength(3);
    expect(s.unlocks).toEqual(['becher']);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
  });
  it('newId increments', () => {
    const s = newGame('p', 5, T0);
    const a = newId(s, 'b'); const b = newId(s, 'b');
    expect(a).not.toBe(b);
  });
});

describe('migrateState', () => {
  it('round-trips JSON', () => {
    const s = newGame('p', 5, T0);
    expect(migrateState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('rejects newer schema versions', () => {
    const s = { ...newGame('p', 5, T0), schemaVersion: 999 };
    expect(() => migrateState(s)).toThrow();
  });
  it('rejects garbage', () => {
    expect(() => migrateState(null)).toThrow();
    expect(() => migrateState({ foo: 1 })).toThrow();
  });
});
