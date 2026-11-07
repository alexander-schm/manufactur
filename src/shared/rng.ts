/** Seeded PRNG (mulberry32). The seed/state is a plain uint32 stored in game state. */
export function nextRandom(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

export function pick<T>(seed: number, arr: readonly T[]): [T, number] {
  const [v, n] = nextRandom(seed);
  return [arr[Math.floor(v * arr.length)], n];
}

export function randInt(seed: number, min: number, maxIncl: number): [number, number] {
  const [v, n] = nextRandom(seed);
  return [min + Math.floor(v * (maxIncl - min + 1)), n];
}

/** Derive a stable sub-seed from a seed and a salt without advancing any state. */
export function hashSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
