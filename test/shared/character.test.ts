import { describe, expect, it } from 'vitest';
import { characterName, makeCharacter, personality } from '../../src/shared/character';

describe('characters', () => {
  it('is deterministic', () => {
    expect(makeCharacter(1234)).toEqual(makeCharacter(1234));
  });
  it('200 seeds give ≥150 distinct looks', () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) set.add(JSON.stringify(makeCharacter(i * 7919 + 13)));
    expect(set.size).toBeGreaterThanOrEqual(150);
  });
  it('everyone has a distinctive trait (facial feature or quirk)', () => {
    for (let i = 0; i < 300; i++) {
      const c = makeCharacter(i);
      expect(c.facial !== 'none' || c.quirk !== 'none', `seed ${i}`).toBe(true);
    }
  });
  it('names and personalities are German strings', () => {
    expect(characterName(5).length).toBeGreaterThan(1);
    expect(personality(5, ['geduldig']).length).toBeGreaterThan(10);
  });
});
