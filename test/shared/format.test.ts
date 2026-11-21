import { describe, expect, it } from 'vitest';
import { fmtTaler } from '../../src/shared/format';

describe('fmtTaler', () => {
  it('rounds up and groups thousands the German way', () => {
    expect(fmtTaler(0)).toBe('0');
    expect(fmtTaler(999)).toBe('999');
    expect(fmtTaler(1499.2)).toBe('1.500');
    expect(fmtTaler(250_000)).toBe('250.000');
    expect(fmtTaler(2_500_000)).toBe('2.500.000');
  });
});
