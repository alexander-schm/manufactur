import { describe, expect, it } from 'vitest';
import { newGame } from '../../../src/shared/state';
import { villageLevel } from '../../../src/shared/village/level';
import { MUSEUM_PER_MEMBER, museumEntries } from '../../../src/shared/village/museum';
import { addMember, MAX_GUESTBOOK, MAX_NEWS, migrateVillage, newVillage } from '../../../src/shared/village/state';
import type { MuseumPiece, VillageState } from '../../../src/shared/village/types';
import { T0, village } from './helpers';

describe('migrateVillage', () => {
  it('a v1 village migrates without loss; level = completed joint orders', () => {
    const v1 = structuredClone(village(3).v) as any;
    v1.schemaVersion = 1; v1.completedJoint = 9; v1.buildings = ['tongrube', 'markthalle', 'glasurbibliothek', 'gildenhaus'];
    for (const k of ['stagesDone', 'greatKiln', 'lastFiring', 'projects', 'museum', 'lentMasterworks']) delete v1[k];
    for (const m of v1.members) delete m.tier;
    const v = migrateVillage(v1);
    expect(v.schemaVersion).toBe(2);
    expect(v.members.map((m) => m.tier)).toEqual(['werkstatt', 'werkstatt', 'werkstatt']);
    expect(v.projects).toEqual({ active: null, offered: [], levels: {} });
    expect(v.greatKiln.loads).toEqual([]);
    expect(v.buildings).toEqual(['tongrube', 'markthalle', 'glasurbibliothek', 'gildenhaus']);
    expect(villageLevel(v)).toBe(9);
    expect(migrateVillage(structuredClone(v))).toEqual(v); // idempotent on v2
  });
  it('rejects garbage and future versions', () => {
    expect(() => migrateVillage(null)).toThrow('Ungültiges Dorf');
    expect(() => migrateVillage({ ...village(1).v, schemaVersion: 3 })).toThrow('Dorf ist neuer als das Spiel');
  });
  it('[Review Focus 1] a full v1 village of 10 stays under 100 KB after migration', () => {
    const names = ['Anna', 'Ben', 'Cleo', 'Dora', 'Emil', 'Fiete', 'Greta', 'Hanno', 'Ida', 'Jule'];
    let v: VillageState = newVillage('v1', 'Tonhausen', 7);
    for (let i = 0; i < 10; i++) {
      v = addMember(v, { playerId: `p${i + 1}`, name: names[i], avatarSeed: i, makerMark: { shape: 'heart', letter: names[i][0], color: '#b44c36' }, joinedAt: T0, lastSeen: T0 }) as VillageState;
    }
    const design = newGame('x', 1, T0).designs[0];
    for (let i = 0; i < MAX_NEWS; i++) v.news.push({ id: `n${i}`, at: T0, text: 'Das Dorf feiert ein kleines Fest auf dem Platz.', for: null });
    for (const m of v.members) {
      v.guestbooks[m.playerId] = Array.from({ length: MAX_GUESTBOOK }, () => ({ from: 'p1', fromName: 'Anna', sticker: 'herz', at: T0 }));
    }
    const museum = Object.fromEntries(v.members.map((m) => [m.playerId, Array.from({ length: MUSEUM_PER_MEMBER }, (_, i): MuseumPiece => ({ id: `m${i}`, design, glazeColor: '#e9c9a6', effect: null, quality: 3, prestige: 'gold', patronName: 'Frau Meier', finishedAt: T0 }))]));
    const v1 = JSON.parse(JSON.stringify(v));
    v1.schemaVersion = 1;
    for (const k of ['stagesDone', 'greatKiln', 'lastFiring', 'projects', 'museum', 'lentMasterworks']) delete v1[k];
    const out = migrateVillage(v1);
    out.museum = museum; // the new v2 museum, filled to its cap
    expect(out.members).toHaveLength(10);
    expect(JSON.stringify(out).length).toBeLessThan(100_000);
  });
});

describe('museumEntries', () => {
  it('shows the best prestige first, then the newest, at most six', () => {
    const s = newGame('x', 1, T0);
    const prestiges = ['bronze', 'gold', 'silver', 'gold', 'bronze', 'silver', 'gold', 'bronze'] as const;
    s.masterworks = prestiges.map((prestige, i) => ({ id: `m${i}`, commissionId: `c${i}`, patronName: 'Frau Meier', design: s.designs[0], glazeColor: '#e9c9a6', effect: null, quality: 3, met: 3, total: 3, prestige, finishedAt: T0 + i, acked: true }));
    const out = museumEntries(s);
    expect(out.map((p) => p.id)).toEqual(['m6', 'm3', 'm1', 'm5', 'm2', 'm7']);
    expect(Object.keys(out[0]).sort()).toEqual(['design', 'effect', 'finishedAt', 'glazeColor', 'id', 'patronName', 'prestige', 'quality']);
    expect(museumEntries(newGame('y', 1, T0))).toEqual([]);
  });
});
