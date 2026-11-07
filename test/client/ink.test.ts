import { describe, expect, it } from 'vitest';
import { inkStyle, wobblyRadius } from '../../src/client/art/ink';

describe('ink', () => {
  it('inkStyle uses the ink colour and the given width', () => {
    const s = inkStyle(3);
    expect(s.stroke).toBe('var(--line)');
    expect(s.strokeWidth).toBe(3);
    expect(s.strokeLinejoin).toBe('round');
    expect(s.strokeLinecap).toBe('round');
  });
  it('defaults to 2.2', () => {
    expect(inkStyle().strokeWidth).toBe(2.2);
  });
  it('wobblyRadius is deterministic per seed and differs across seeds', () => {
    expect(wobblyRadius(3)).toBe(wobblyRadius(3));
    expect(wobblyRadius(3)).not.toBe(wobblyRadius(4));
  });
});
