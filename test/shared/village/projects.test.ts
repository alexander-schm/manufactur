import { describe, expect, it } from 'vitest';
import { BODIES, EFFECTS, FORMS, MATERIALS } from '../../../src/shared/content';
import {
  MAX_PROJECT_LEVEL, PROJECTS, PROJECT_ORDER, ROMAN, ensureProjectOffers, instantiateStage, isStageComplete, maxProjectUnits, partSize, projectScale, stageReward, stageShares,
} from '../../../src/shared/village/projects';
import { levelBonus } from '../../../src/shared/village/level';
import { tickVillage } from '../../../src/shared/village/tick';
import type { ActiveProject } from '../../../src/shared/village/types';
import { T0, setTier, village } from './helpers';

const sumTaler = (parts: { kind: string; amount?: number }[]) => parts.reduce((n, p) => n + (p.kind === 'taler' ? p.amount! : 0), 0);

describe('project data', () => {
  it('five projects, 3–5 stages each, 3–5 parts per stage, exactly one taler part per stage, known materials/forms/effects/decor', () => {
    expect(PROJECT_ORDER).toEqual(['glockenturm', 'museum', 'rathaus', 'dorfbrunnen', 'kaolingrube']);
    expect(Object.keys(PROJECTS).sort()).toEqual([...PROJECT_ORDER].sort());
    expect(ROMAN).toEqual(['I', 'II', 'III']);
    expect(MAX_PROJECT_LEVEL).toBe(3);
    for (const def of Object.values(PROJECTS)) {
      expect(def.stages.length, def.id).toBeGreaterThanOrEqual(3);
      expect(def.stages.length, def.id).toBeLessThanOrEqual(5);
      expect(def.decor, def.id).toMatch(/^[a-z]+$/);
      for (const L of [1, 2, 3]) expect(def.benefit(L)).toMatch(/\S/);
      for (const st of def.stages) {
        expect(st.parts.length, st.name).toBeGreaterThanOrEqual(3);
        expect(st.parts.length, st.name).toBeLessThanOrEqual(5);
        expect(st.parts.filter((p) => p.kind === 'taler')).toHaveLength(1);
        for (const p of st.parts) {
          if (p.kind === 'material') expect(MATERIALS[p.material], p.material).toBeDefined();
          if (p.kind === 'goods') {
            expect(FORMS[p.form], p.form).toBeDefined();
            if (p.body) expect(BODIES[p.body], p.body).toBeDefined();
            if (p.effect) expect(EFFECTS[p.effect], p.effect).toBeDefined();
          }
        }
      }
    }
    expect(PROJECTS.dorfbrunnen.benefit(2)).toBe('Jeden Tag 6 Ruf für alle im Dorf.');
    expect(PROJECTS.kaolingrube.benefit(1)).toBe('Kaolin kostet für alle im Dorf 40 % weniger.');
    expect(PROJECTS.rathaus.benefit(1)).toBe('Großaufträge werden 25 % größer und zahlen 60 % mehr.');
  });
});

describe('offers', () => {
  it('nothing is offered while everyone is a Werkstatt; two Manufaktur projects once someone is Manufaktur; Brunnen and Kaolingrube only with a Hofmanufaktur', () => {
    const { v, ws } = village(3);
    expect(ensureProjectOffers(v)).toBe(false);
    expect(v.projects.offered).toEqual([]);
    setTier(v, ws, 'p1', 'manufaktur');
    expect(ensureProjectOffers(v)).toBe(true);
    expect(v.projects.offered).toHaveLength(2);
    for (const id of v.projects.offered) expect(PROJECTS[id].tier).toBe('manufaktur');
    expect(ensureProjectOffers(v)).toBe(false);
    setTier(v, ws, 'p2', 'hofmanufaktur');
    v.projects.offered = [];
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) { v.projects.offered = []; ensureProjectOffers(v); v.projects.offered.forEach((id) => seen.add(id)); }
    expect(seen.has('dorfbrunnen') && seen.has('kaolingrube')).toBe(true);
  });
  it('drops offers that no longer qualify and offers nothing while a project is active', () => {
    const { v, ws } = village(2);
    setTier(v, ws, 'p1', 'manufaktur');
    v.projects.offered = ['dorfbrunnen'];
    expect(ensureProjectOffers(v)).toBe(true);
    expect(v.projects.offered).not.toContain('dorfbrunnen');
    v.projects.offered = [];
    v.projects.active = { projectId: 'museum', level: 1, stage: 0, parts: [], startedAt: T0, stageStartedAt: T0 };
    expect(ensureProjectOffers(v)).toBe(false);
    expect(v.projects.offered).toEqual([]);
  });
  it('a project at level 3 is never offered again', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { v, ws } = village(2);
      setTier(v, ws, 'p1', 'manufaktur');
      v.rng = seed * 7919 + 1;
      v.projects.levels.rathaus = 3;
      ensureProjectOffers(v);
      expect(v.projects.offered).not.toContain('rathaus');
      expect(v.projects.offered).toHaveLength(2);
    }
  });
  it('tickVillage creates the offers and reports the change', () => {
    const { v, ws } = village(2);
    setTier(v, ws, 'p1', 'manufaktur');
    expect(tickVillage(v, T0).changed).toBe(true);
    expect(v.projects.offered).toHaveLength(2);
  });
});

describe('stage size', () => {
  it('stage size grows with level and with active members; absent members do not count', () => {
    const r = PROJECTS.rathaus;
    const ton = (parts: ReturnType<typeof instantiateStage>) => (parts[0] as { count: number }).count;
    expect(ton(instantiateStage(r, 1, 0, 3))).toBe(720);
    expect(ton(instantiateStage(r, 2, 0, 3))).toBe(1080);
    const l3 = instantiateStage(r, 3, 1, 3);
    expect(l3[1]).toMatchObject({ kind: 'goods', minQuality: 2 });
    expect(instantiateStage(r, 3, 2, 3)[0]).toMatchObject({ kind: 'goods', minQuality: 3 });
    expect(instantiateStage(r, 1, 2, 3)[0]).toMatchObject({ kind: 'goods', minQuality: 2 });
    expect(sumTaler(instantiateStage(r, 3, 0, 3))).toBe(576000);
    expect(instantiateStage(r, 1, 0, 3).every((p) => p.filled === 0 && Object.keys(p.by).length === 0)).toBe(true);
    expect(projectScale(1)).toBe(projectScale(2));
    expect(projectScale(1)).toBeCloseTo(1.0);
    expect(projectScale(9)).toBeCloseTo(1.8);
    expect(ton(instantiateStage(r, 1, 0, 1))).toBe(ton(instantiateStage(r, 1, 0, 2)));
  });
  it('masterwork parts scale with level only, not with members', () => {
    const m = PROJECTS.rathaus;
    expect(instantiateStage(m, 1, 4, 6)[0]).toMatchObject({ kind: 'masterwork', count: 2 });
    expect(instantiateStage(m, 2, 4, 6)[0]).toMatchObject({ kind: 'masterwork', count: 3 });
    expect(instantiateStage(PROJECTS.glockenturm, 3, 3, 2)[1]).toMatchObject({ kind: 'masterwork', count: 2 });
  });
});

function activeFor(parts: number): ActiveProject {
  return {
    projectId: 'rathaus', level: 1, stage: 0, startedAt: T0, stageStartedAt: T0,
    parts: Array.from({ length: parts }, () => ({ kind: 'material' as const, material: 'ton', count: 100, filled: 0, by: {} })),
  };
}

describe('the 70 % rule', () => {
  it('units allowed for a fresh actor and at the boundary', () => {
    const a = activeFor(4);
    expect(maxProjectUnits(a, 0, 'p1')).toBe(100);
    a.parts[0].filled = 100; a.parts[0].by = { p1: 100 };
    a.parts[1].filled = 100; a.parts[1].by = { p1: 100 };
    expect(stageShares(a).p1).toBeCloseTo(0.5);
    expect(maxProjectUnits(a, 2, 'p1')).toBe(80);
    expect(maxProjectUnits(a, 2, 'p2')).toBe(100);
    a.parts[2].filled = 80; a.parts[2].by = { p1: 80 };
    expect(maxProjectUnits(a, 2, 'p1')).toBe(0);
    expect(maxProjectUnits(a, 2, 'p2')).toBe(20);
  });
  it('is limited by what is left and never negative', () => {
    const a = activeFor(2);
    a.parts[0].filled = 95; a.parts[0].by = { p1: 60, p2: 35 };
    expect(maxProjectUnits(a, 0, 'p2')).toBe(5);
    expect(maxProjectUnits(a, 0, 'p1')).toBe(5);
    a.parts[1].by = { p1: 100 }; a.parts[1].filled = 100;
    expect(maxProjectUnits(a, 0, 'p1')).toBe(0);
    expect(maxProjectUnits(a, 9, 'p1')).toBe(0);
  });
  it('a stage needs everything filled and two contributors', () => {
    const a = activeFor(2);
    a.parts.forEach((p) => { p.filled = partSize(p); p.by = { p1: partSize(p) }; });
    expect(isStageComplete(a)).toBe(false);
    a.parts[1].by = { p1: 50, p2: 50 };
    expect(isStageComplete(a)).toBe(true);
    a.parts[0].filled = 99;
    expect(isStageComplete(a)).toBe(false);
  });
});

describe('rewards', () => {
  it('stage reward follows the taler part and the village level bonus', () => {
    const { v } = village(2);
    const a: ActiveProject = { projectId: 'rathaus', level: 2, stage: 1, startedAt: T0, stageStartedAt: T0, parts: [{ kind: 'taler', amount: 100000, filled: 0, by: {} }] };
    expect(levelBonus(v)).toBe(1);
    expect(stageReward(v, a)).toEqual({ taler: 25000 + 4000, ruf: 25 + 10 + 25 });
    v.completedJoint = 10;
    expect(stageReward(v, a)).toEqual({ taler: Math.round(29000 * 1.2), ruf: Math.round(60 * 1.2) });
  });
});

describe('pacing', () => {
  it('[pacing] level-I Taler for 3 active members is 300k–800k per project; level III Rathaus stays under 10 M', () => {
    for (const def of Object.values(PROJECTS)) {
      let total = 0;
      def.stages.forEach((_, i) => { total += sumTaler(instantiateStage(def, 1, i, 3)); });
      expect(total, def.id).toBeGreaterThanOrEqual(300_000);
      expect(total, def.id).toBeLessThanOrEqual(800_000);
    }
    let r3 = 0;
    PROJECTS.rathaus.stages.forEach((_, i) => { r3 += sumTaler(instantiateStage(PROJECTS.rathaus, 3, i, 3)); });
    expect(r3).toBeLessThan(10_000_000);
  });
});
