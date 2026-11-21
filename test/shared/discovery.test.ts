import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/shared/actions';
import { colorFamily } from '../../src/shared/design';
import { BODIES, type RecipeInput } from '../../src/shared/content';
import { glazeColor, hintFor, matchEffect } from '../../src/shared/discovery';
import type { FiringSettings } from '../../src/shared/types';
import { manufakturGame, plainGame, T0 } from './helpers';

type R = RecipeInput;
const f = (temp: FiringSettings['temp'], atmosphere: FiringSettings['atmosphere'], cooling: FiringSettings['cooling']): FiringSettings => ({ temp, atmosphere, cooling });

function game() {
  const s = plainGame();
  s.unlocks.push('studio', 'farbkoerper', 'reduktion');
  s.stations.find((x) => x.kind === 'kiln')!.level = 2;
  s.materials.kupferoxid = 5;
  s.materials.eisenoxid = 5;
  s.materials.glasurbasis = 20;
  return s;
}

describe('discovery', () => {
  it('copper 2 % reduced and hot → kupferrot, red', () => {
    const r: R = { base: 'opak', colorant: 'kupferoxid', colorantPct: 2, firing: f('hoch', 'reduzierend', 'langsam') };
    expect(matchEffect(r)).toBe('kupferrot');
    expect(colorFamily(glazeColor(r))).toBe('rot');
  });
  it('copper oxidised is green, cobalt is blue', () => {
    expect(colorFamily(glazeColor({ base: 'opak', colorant: 'kupferoxid', colorantPct: 3, firing: f('mittel', 'oxidierend', 'langsam') }))).toBe('gruen');
    expect(colorFamily(glazeColor({ base: 'opak', colorant: 'kobalt', colorantPct: 3, firing: f('mittel', 'oxidierend', 'langsam') }))).toBe('blau');
  });
  it('transparent + fast cooling → craquele', () => {
    expect(matchEffect({ base: 'transparent', colorant: null, colorantPct: 0, firing: f('mittel', 'oxidierend', 'schnell') })).toBe('craquele');
  });
  it('one parameter away from seladon gives a hint naming it', () => {
    const s = game();
    const h = hintFor({ base: 'transparent', colorant: 'eisenoxid', colorantPct: 2, firing: f('hoch', 'oxidierend', 'langsam') }, s);
    expect(h).toMatch(/Reduktion/);
  });
  it('experiment adds a glaze once, emits a discovery, and costs materials', () => {
    const s = game();
    const recipe: R = { base: 'opak', colorant: 'kupferoxid', colorantPct: 2, firing: f('hoch', 'reduzierend', 'langsam') };
    const r1 = applyAction(s, { type: 'experiment', recipe }, T0 + 10);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.state.glazes).toHaveLength(2);
    expect(r1.state.glazes[1].effect).toBe('kupferrot');
    expect(r1.events.some((e) => e.kind === 'discovery' && e.id === 'kupferrot')).toBe(true);
    expect(r1.state.materials.glasurbasis).toBe(18);
    expect(r1.state.materials.kupferoxid).toBe(4);
    const r2 = applyAction(r1.state, { type: 'experiment', recipe }, T0 + 20);
    expect(r2.ok && r2.state.glazes).toHaveLength(2);
  });
  it('experiment rejects invalid recipes', () => {
    const s = game();
    const r = applyAction(s, { type: 'experiment', recipe: { base: 'opak', colorant: 'kaolin', colorantPct: 2, firing: f('hoch', 'reduzierend', 'langsam') } }, T0 + 10);
    expect(r.ok).toBe(false);
    const r2 = applyAction(s, { type: 'experiment', recipe: { base: 'opak', colorant: 'kobalt', colorantPct: 11, firing: f('hoch', 'reduzierend', 'langsam') } }, T0 + 10);
    expect(r2.ok).toBe(false);
  });

  const stone = (r: Partial<R>): R => ({ base: 'transparent', colorant: null, colorantPct: 0, firing: f('hoch', 'oxidierend', 'langsam'), body: 'steinzeug', ...r });
  const rej = (s: ReturnType<typeof game>, recipe: R) => {
    const res = applyAction(s, { type: 'experiment', recipe }, T0 + 10);
    return res.ok ? '' : res.error;
  };
  it('stoneware effects only appear on stoneware and beat the generic ones', () => {
    expect(matchEffect(stone({ colorant: 'eisenoxid', colorantPct: 8 }))).toBe('oelfleck');
    expect(matchEffect({ ...stone({ colorant: 'eisenoxid', colorantPct: 8 }), body: 'irdenware' })).toBe('tenmoku');
    expect(matchEffect(stone({ base: 'matt' }))).toBe('shino');
    expect(matchEffect(stone({ base: 'matt', colorant: 'kobalt', colorantPct: 2 }))).toBe('kristall');
    expect(matchEffect(stone({ colorant: 'salz', colorantPct: 3 }))).toBe('salzglasur');
    expect(matchEffect(stone({ colorant: 'eisenoxid', colorantPct: 5, firing: f('hoch', 'reduzierend', 'langsam') }))).toBe('hasenfell');
    expect(matchEffect(BODIES.steinzeug.starterGlaze!)).toBeNull();
    expect(glazeColor(BODIES.steinzeug.starterGlaze!)).toBe(BODIES.steinzeug.starterGlaze!.color);
  });
  it('a Werkstatt never gets hints for stoneware effects', () => {
    const s = game();
    for (const r of [stone({ colorant: 'eisenoxid', colorantPct: 8, body: 'irdenware' }), stone({ base: 'matt', body: 'irdenware' })])
      expect(hintFor(r, s) ?? '').not.toMatch(/Steinzeug|Ölfleck|Shino/);
  });
  it('a Manufaktur hint names the body when only it is off', () => {
    const m = manufakturGame();
    const h = hintFor(stone({ colorant: 'eisenoxid', colorantPct: 8, body: 'irdenware' }), m);
    expect(h).toMatch(/Ölfleck.*auf Steinzeug/);
  });
  it('stoneware experiments: need the tier, must fire hot, cost 1 Steinzeugton, are separate glazes', () => {
    const w = game();
    expect(rej(w, stone({}))).toMatch(/Manufaktur/);
    const m = manufakturGame(); m.materials.glasurbasis = 20;
    expect(rej(m, stone({ firing: f('mittel', 'oxidierend', 'langsam') }))).toMatch(/heiß gebrannt/);
    const r = applyAction(m, { type: 'experiment', recipe: stone({ base: 'matt' }) }, T0 + 10);
    expect(r.ok && r.state.materials.steinzeugton).toBe(99);
    const r2 = r.ok && applyAction(r.state, { type: 'experiment', recipe: { ...stone({ base: 'matt' }), body: 'irdenware' } }, T0 + 20);
    expect(r2 && r2.ok && r2.state.glazes.filter((g) => g.base === 'matt' && g.colorant === null).map((g) => g.body).sort()).toEqual(['irdenware', 'steinzeug']);
  });
  it('porcelain effects', () => {
    const porc = (r: Partial<R>): R => ({ base: 'transparent', colorant: null, colorantPct: 0, firing: f('hoch', 'oxidierend', 'langsam'), body: 'porzellan', ...r });
    expect(matchEffect(porc({ base: 'opak' }))).toBe('blancdechine');
    expect(matchEffect(porc({ colorant: 'kobalt', colorantPct: 2 }))).toBe('blauweiss');
    expect(matchEffect(porc({ colorant: 'kupferoxid', colorantPct: 3, firing: f('hoch', 'reduzierend', 'langsam') }))).toBe('ochsenblut');
    expect(matchEffect({ ...porc({ colorant: 'kupferoxid', colorantPct: 3, firing: f('hoch', 'reduzierend', 'langsam') }), body: 'irdenware' })).toBe('kupferrot');
    expect(matchEffect(porc({ base: 'matt', firing: f('hoch', 'oxidierend', 'schnell') }))).toBe('eierschale');
    expect(matchEffect(BODIES.porzellan.starterGlaze!)).toBeNull();
    expect(glazeColor(BODIES.porzellan.starterGlaze!)).toBe(BODIES.porzellan.starterGlaze!.color);
  });
});
