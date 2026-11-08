import { describe, expect, it } from 'vitest';
import { batchQuality, qualityTier, stageDurationMs, stationForStage } from '../../src/shared/production';
import { STAGES, type Batch } from '../../src/shared/types';
import { plainGame, T0 } from './helpers';

function batchAt(stage: Batch['stage'], count = 6): Batch {
  return { id: 'b', designId: 'd1', count, stage, stationId: null, startedAt: null, durationMs: 0, quality: 50 };
}

describe('production', () => {
  it('a 6-cup batch takes 150–210 s through all six stages (3-minute pacing goal)', () => {
    const s = plainGame();
    let total = 0;
    for (const stage of STAGES) {
      const st = s.stations.find((x) => x.kind === stationForStage(stage))!;
      total += stageDurationMs(s, batchAt(stage), st, T0);
    }
    expect(total).toBeGreaterThanOrEqual(150_000);
    expect(total).toBeLessThanOrEqual(210_000);
  });
  it('perfectionist is slower but better', () => {
    const s = plainGame();
    const wheel = s.stations.find((x) => x.kind === 'wheel')!;
    const before = stageDurationMs(s, batchAt('form'), wheel, T0);
    const q0 = batchQuality(s, s.designs[0], s.workers);
    s.workers[0].traits = ['perfektionist'];
    expect(stageDurationMs(s, batchAt('form'), wheel, T0)).toBeGreaterThan(before);
    expect(batchQuality(s, s.designs[0], s.workers)).toBeGreaterThan(q0);
  });
  it('boost doubles speed', () => {
    const s = plainGame();
    const wheel = s.stations.find((x) => x.kind === 'wheel')!;
    const normal = stageDurationMs(s, batchAt('form'), wheel, T0);
    s.boostUntil = T0 + 60_000;
    expect(stageDurationMs(s, batchAt('form'), wheel, T0)).toBeCloseTo(normal / 2, 0);
  });
  it('drying ignores workers', () => {
    const s = plainGame();
    const rack = s.stations.find((x) => x.kind === 'dryingRack')!;
    const d0 = stageDurationMs(s, batchAt('dry'), rack, T0);
    s.workers[0].stationId = rack.id;
    expect(stageDurationMs(s, batchAt('dry'), rack, T0)).toBe(d0);
  });
  it('qualityTier boundaries', () => {
    expect(qualityTier(39.9)).toBe(1);
    expect(qualityTier(40)).toBe(2);
    expect(qualityTier(74.9)).toBe(2);
    expect(qualityTier(75)).toBe(3);
  });
});

describe('quality for harder forms', () => {
  it('a plain default jug from an untrained owner reaches "good" quality', async () => {
    const { FORMS } = await import('../../src/shared/content');
    const s = plainGame();
    const jug = { ...s.designs[0], form: 'krug', profile: { ...FORMS.krug.profileDefaults }, handle: 'round' as const };
    expect(qualityTier(batchQuality(s, jug, []))).toBe(2);
  });
});

describe('[Final review minor #2 → fixed] difficulty affects time at the wheel (spec §4.3)', () => {
  it('a vase takes longer to throw than a cup of the same count', async () => {
    const { FORMS } = await import('../../src/shared/content');
    const s = plainGame();
    s.designs.push({ ...s.designs[0], id: 'dv', form: 'vase', handle: 'none', profile: { ...FORMS.vase.profileDefaults } });
    const wheel = s.stations.find((x) => x.kind === 'wheel')!;
    const cup = stageDurationMs(s, { ...batchAt('form'), designId: s.designs[0].id }, wheel, T0);
    const vase = stageDurationMs(s, { ...batchAt('form'), designId: 'dv' }, wheel, T0);
    expect(vase).toBeGreaterThan(cup * 1.2);
  });
});
