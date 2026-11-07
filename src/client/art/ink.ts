import type { CSSProperties } from 'preact';
import { hashSeed } from '../../shared/rng';

export function inkStyle(width = 2.2): CSSProperties & { stroke: string; strokeWidth: number } {
  return { stroke: 'var(--line)', strokeWidth: width, strokeLinejoin: 'round', strokeLinecap: 'round' };
}

/** A hand-drawn looking CSS border-radius, stable per seed. */
export function wobblyRadius(seed: number): string {
  let h = hashSeed(seed, 77);
  const v = () => { h = hashSeed(h, 1); return 8 + (h % 18); };
  const w = () => { h = hashSeed(h, 2); return 180 + (h % 80); };
  return `${w()}px ${v()}px ${w()}px ${v()}px / ${v()}px ${w()}px ${v()}px ${w()}px`;
}

/** Small deterministic jitter for hand-placed coordinates. */
export function jitter(seed: number, i: number, amount = 1.2): number {
  return ((hashSeed(seed, i) / 0xffffffff) * 2 - 1) * amount;
}
