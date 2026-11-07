import { describe, expect, it } from 'vitest';
import { nextRandom, pick, randInt } from '../../src/shared/rng';

describe('rng', () => {
  it('same seed gives same sequence', () => {
    const seq = (s: number) => {
      const out: number[] = [];
      for (let i = 0; i < 20; i++) { const [v, n] = nextRandom(s); out.push(v); s = n; }
      return out;
    };
    expect(seq(42)).toEqual(seq(42));
    expect(seq(42)).not.toEqual(seq(43));
  });
  it('values are in [0,1)', () => {
    let s = 1;
    for (let i = 0; i < 5000; i++) { const [v, n] = nextRandom(s); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); s = n; }
  });
  it('pick covers all elements within 1000 draws', () => {
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
    const seen = new Set<string>();
    let s = 7;
    for (let i = 0; i < 1000; i++) { const [v, n] = pick(s, arr); seen.add(v); s = n; }
    expect(seen.size).toBe(arr.length);
  });
  it('randInt stays within inclusive bounds and hits both ends', () => {
    let s = 9; const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) { const [v, n] = randInt(s, 3, 6); expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(6); seen.add(v); s = n; }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });
});
