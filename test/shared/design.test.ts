import { describe, expect, it } from 'vitest';
import { appeal, colorFamily, designDifficulty, validateDesign } from '../../src/shared/design';
import type { Design, GlazeRecipe } from '../../src/shared/types';
import { plainGame } from './helpers';

const blueGlaze: GlazeRecipe = { id: 'g', name: 'Blau', base: 'opak', colorant: 'kobalt', colorantPct: 2,
  firing: { temp: 'mittel', atmosphere: 'oxidierend', cooling: 'langsam' }, color: '#3f6fb5', effect: null };
const vase: Design = { id: 'd', name: 'Hohe Vase', form: 'vase', profile: { height: 0.9, belly: 0.6, neck: 0.2, foot: 0.4, rim: 0.4 },
  handle: 'none', rim: 'plain', glazeId: 'g', pattern: 'dots', patternColor: '#ffffff' };

describe('design', () => {
  it('colour families', () => {
    expect(colorFamily('#3f6fb5')).toBe('blau');
    expect(colorFamily('#c0392b')).toBe('rot');
    expect(colorFamily('#5aa05a')).toBe('gruen');
    expect(colorFamily('#f2d04b')).toBe('gelb');
    expect(colorFamily('#f8f5ee')).toBe('weiss');
    expect(colorFamily('#1c1a19')).toBe('schwarz');
    expect(colorFamily('#8a5a3a')).toBe('braun');
    expect(colorFamily('#8e5bb5')).toBe('lila');
  });
  it('appeal is high when every taste key matches', () => {
    expect(appeal(vase, blueGlaze, { form: 'vase', colorFamily: 'blau', pattern: 'dots', tall: true })).toBeGreaterThanOrEqual(0.8);
  });
  it('appeal is low when nothing matches', () => {
    expect(appeal(vase, blueGlaze, { form: 'becher', colorFamily: 'rot', pattern: 'waves', tall: false, simple: true })).toBeLessThanOrEqual(0.3);
  });
  it('difficulty is within 0.5..2 and harder for vases than cups', () => {
    const s = plainGame();
    const cup = s.designs[0];
    expect(designDifficulty(vase)).toBeGreaterThan(designDifficulty(cup));
    expect(designDifficulty(vase)).toBeLessThanOrEqual(2);
    expect(designDifficulty(cup)).toBeGreaterThanOrEqual(0.5);
  });
  it('rejects out-of-range profiles and locked forms', () => {
    const s = plainGame();
    const bad = { ...s.designs[0], profile: { ...s.designs[0].profile, belly: 1.5 } };
    expect(validateDesign(bad, s)).toMatch(/.+/);
    expect(validateDesign({ ...s.designs[0], form: 'vase' }, s)).toMatch(/.+/);
    expect(validateDesign(s.designs[0], s)).toBeNull();
  });
});
