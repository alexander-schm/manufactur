import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/shared/actions';
import { colorFamily } from '../../src/shared/design';
import { glazeColor, hintFor, matchEffect } from '../../src/shared/discovery';
import type { FiringSettings, GlazeRecipe } from '../../src/shared/types';
import { plainGame, T0 } from './helpers';

type R = Pick<GlazeRecipe, 'base' | 'colorant' | 'colorantPct' | 'firing'>;
const f = (temp: FiringSettings['temp'], atmosphere: FiringSettings['atmosphere'], cooling: FiringSettings['cooling']): FiringSettings => ({ temp, atmosphere, cooling });

function game() {
  const s = plainGame();
  s.unlocks.push('studio');
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
});
