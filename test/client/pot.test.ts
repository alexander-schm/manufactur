import { describe, expect, it } from 'vitest';
import { potOutline, potShape } from '../../src/client/art/potShape';
import { FORMS } from '../../src/shared/content';
import { nextRandom } from '../../src/shared/rng';
import type { ProfileParams } from '../../src/shared/types';

function randomProfiles(n: number, seed = 5): ProfileParams[] {
  const out: ProfileParams[] = [];
  let r = seed;
  const v = () => { const [x, n2] = nextRandom(r); r = n2; return x; };
  for (let i = 0; i < n; i++) out.push({ height: v(), belly: v(), neck: v(), foot: v(), rim: v() });
  out.push({ height: 0, belly: 0, neck: 0, foot: 0, rim: 0 }, { height: 1, belly: 1, neck: 1, foot: 1, rim: 1 });
  return out;
}

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('potShape', () => {
  for (const form of Object.keys(FORMS)) {
    it(`${form}: no NaN, inside the box, symmetric`, () => {
      for (const p of randomProfiles(5)) {
        const shape = potShape(form, p, 'plain');
        expect(shape.body).not.toMatch(/NaN|undefined/);
        const pts = potOutline(form, p, 'plain');
        for (const [x, y] of pts) {
          expect(x).toBeGreaterThanOrEqual(2);
          expect(x).toBeLessThanOrEqual(98);
          expect(y).toBeLessThanOrEqual(96.0001);
        }
        // mirrored: the left side is the right side reflected at x = 50
        const xs = numbers(shape.body);
        expect(Math.min(...xs.filter((_, i) => i % 2 === 0)) + Math.max(...xs.filter((_, i) => i % 2 === 0))).toBeCloseTo(100, 1);
        expect(shape.bandHalfWidth).toBeGreaterThan(0);
        expect(shape.rim.rx).toBeGreaterThan(0);
      }
    });
  }
  it('taller height gives a higher top (smaller min y)', () => {
    const lo = potOutline('vase', { height: 0.2, belly: 0.5, neck: 0.5, foot: 0.5, rim: 0.5 }, 'plain');
    const hi = potOutline('vase', { height: 0.9, belly: 0.5, neck: 0.5, foot: 0.5, rim: 0.5 }, 'plain');
    expect(Math.min(...hi.map((p) => p[1]))).toBeLessThan(Math.min(...lo.map((p) => p[1])));
  });
  it('handles and spouts appear where the form allows them', () => {
    const p = FORMS.krug.profileDefaults;
    expect(potShape('krug', p, 'plain', 'round').handle).toBeTruthy();
    expect(potShape('krug', p, 'plain', 'round').spout).toBeTruthy();
    expect(potShape('vase', FORMS.vase.profileDefaults, 'plain', 'none').handle).toBeFalsy();
  });
});
