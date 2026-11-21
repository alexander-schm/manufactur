import { describe, expect, it } from 'vitest';
import { advance } from '../../src/shared/advance';
import { applyAction } from '../../src/shared/actions';
import { bodyGateError, validateDesign } from '../../src/shared/design';
import { pieceValue } from '../../src/shared/market';
import { batchMaterials, batchQuality, designDifficultyOf, stageDurationMs } from '../../src/shared/production';
import { migrateState } from '../../src/shared/state';
import type { Design, GameState } from '../../src/shared/types';
import { importStack } from '../../src/shared/village/apply';
import { hofGame, manufakturGame, plainGame, T0, withStanding } from './helpers';

const H = 3_600_000;
const stoneCup = (s: GameState): Design => ({ ...s.designs[0], id: 'sc', body: 'steinzeug', glazeId: 'klar-steinzeug' });

describe('clay bodies', () => {
  it('stoneware is worth 1.8×, needs Steinzeugton, is a bit harder and fires longer', () => {
    const s = manufakturGame(); s.designs.push(stoneCup(s));
    expect(pieceValue(s, { designId: 'sc', quality: 2, effect: null })).toBeCloseTo(6 * 1.8);
    expect(batchMaterials(s, stoneCup(s), 6)).toEqual({ steinzeugton: 6, glasurbasis: 2 });
    expect(designDifficultyOf(stoneCup(s)) - designDifficultyOf(s.designs[0])).toBeCloseTo(0.2);
    const kiln = s.stations.find((x) => x.kind === 'kiln')!;
    const fire = (designId: string) => stageDurationMs(s, { id: 'x', designId, count: 6, stage: 'glazeFire', stationId: null, startedAt: null, durationMs: 0, quality: 60 }, kiln, T0);
    expect(fire('sc') / fire(s.designs[0].id)).toBeCloseTo(1.5, 2);
  });

  it('porcelain is worth 3.2×, fires twice as long, and skilled workers count 1.5×', () => {
    const s = hofGame();
    const cup = s.designs[0];
    const porc: Design = { ...cup, id: 'pc', body: 'porzellan', glazeId: 'klar-porzellan' };
    s.designs.push(porc);
    expect(pieceValue(s, { designId: 'pc', quality: 2, effect: null })).toBeCloseTo(6 * 3.2);
    expect(batchMaterials(s, porc, 6)).toEqual({ kaolin: 6, glasurbasis: 2 });
    expect(designDifficultyOf(porc) - designDifficultyOf(cup)).toBeCloseTo(0.5);
    const kiln = s.stations.find((x) => x.kind === 'kiln')!;
    const fire = (designId: string) => stageDurationMs(s, { id: 'x', designId, count: 6, stage: 'glazeFire', stationId: null, startedAt: null, durationMs: 0, quality: 60 }, kiln, T0);
    expect(fire('pc') / fire(cup.id)).toBeCloseTo(2, 2);
    const wheel = s.stations.find((x) => x.kind === 'wheel')!;
    wheel.level = 1; // keep quality below the 100 cap so the deltas are exact
    const skilled = [{ id: 'w', name: 'W', traits: ['perfektionist'], xp: 150, stationId: wheel.id }] as unknown as typeof s.workers;
    const delta = (d: Design) => batchQuality(s, d, skilled) - batchQuality(s, d, []);
    expect(delta(cup)).toBeGreaterThan(0);
    expect(delta(porc)).toBeCloseTo(1.5 * delta(cup));
  });

  it('[Review Focus 1] earthenware numbers are unchanged', () => {
    const s = plainGame();
    expect(pieceValue(s, { designId: s.designs[0].id, quality: 2, effect: null })).toBe(6);
    expect(batchMaterials(s, s.designs[0], 6)).toEqual({ ton: 6, glasurbasis: 2 });
  });

  it('[Review Focus 1] a migrated v2 save with a running batch and a body-less foreign design keeps working', () => {
    const v2: any = JSON.parse(JSON.stringify(advance(withStanding(), T0 + 100_000)));
    v2.schemaVersion = 2; delete v2.tier; for (const d of v2.designs) delete d.body; for (const g of v2.glazes) delete g.body;
    v2.designs.push({ ...v2.designs[0], id: 'f:x', origin: { playerName: 'Ben', makerMark: v2.makerMark, glazeColor: '#3f6fb5' } });
    v2.goods.push({ designId: 'f:x', quality: 2, effect: null, count: 3 });
    const s = advance(migrateState(v2), T0 + 6 * H);
    expect(s.stats.made).toBeGreaterThan(v2.stats.made);
    expect(pieceValue(s, { designId: 'f:x', quality: 2, effect: null })).toBe(6);
  });

  it('designs: glaze must match the body, stoneware needs the Manufaktur', () => {
    const w = plainGame(); w.unlocks.push('studio');
    expect(validateDesign({ ...w.designs[0], body: 'steinzeug' }, w)).toMatch(/Manufaktur/);
    const m = manufakturGame();
    expect(validateDesign({ ...m.designs[0], body: 'steinzeug' }, m)).toMatch(/Glasur ist für Irdenware/);
    expect(validateDesign(stoneCup(m), m)).toBeNull();
    const r = applyAction(m, { type: 'saveDesign', design: { ...stoneCup(m), id: 'neu' } }, T0 + 1);
    expect(r.ok && r.state.designs.at(-1)!.body).toBe('steinzeug');
  });

  it('bodyGateError rejects unknown and not yet available bodies; a missing body counts as Irdenware', () => {
    const w = plainGame();
    expect(bodyGateError(w, 'basalt')).toBe('Unbekannte Tonsorte');
    expect(bodyGateError(w, 'steinzeug')).toMatch(/^Steinzeug gibt es erst ab der /);
    expect(bodyGateError(manufakturGame(), 'steinzeug')).toBeNull();
    const m = manufakturGame();
    expect(validateDesign({ ...m.designs[0], body: 'basalt' as any }, m)).toBe('Unbekannte Tonsorte');
    const noBody = { ...m.designs[0], body: undefined } as unknown as Design;
    expect(validateDesign(noBody, m)).toBeNull();
  });

  it('importStack fills a missing body without duplicating an already gifted design', () => {
    const s = plainGame();
    const { body: _b, ...design } = s.designs[0];
    const stack = { design: { ...design, id: 'x', origin: { playerName: 'Ben', makerMark: s.makerMark, glazeColor: '#3f6fb5' } } as Design, quality: 2 as const, effect: null, count: 2, makerName: 'Ben', makerMark: s.makerMark };
    importStack(s, stack);
    const foreign = s.designs.filter((d) => d.id.startsWith('f:'));
    expect(foreign).toHaveLength(1);
    expect(foreign[0].body).toBe('irdenware');
    importStack(s, stack);
    expect(s.designs.filter((d) => d.id.startsWith('f:'))).toHaveLength(1);
    expect(s.goods.find((g) => g.designId === foreign[0].id)!.count).toBe(4);
  });
});
