import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Character } from '../../src/client/art/character/Character';
import { makeCharacter } from '../../src/shared/character';

describe('Character renderer', () => {
  it('50 seeds render to distinct markup with no missing parts', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const html = render(<Character look={makeCharacter(i * 101 + 7)} pose="idle" seed={i} />);
      expect(html).not.toMatch(/undefined|NaN/);
      expect(html).toContain('data-character');
      seen.add(html);
    }
    expect(seen.size).toBe(50);
  });
  it('every pose renders', () => {
    for (const pose of ['idle', 'work', 'wave', 'sleep', 'cheer', 'catch'] as const) {
      const html = render(<Character look={makeCharacter(3)} pose={pose} seed={3} />);
      expect(html).toContain(`data-pose="${pose}"`);
      expect(html).not.toMatch(/undefined|NaN/);
    }
  });
  it('cheer raises a little cup, catch holds both hands up without one', () => {
    const cheer = render(<Character look={makeCharacter(5)} pose="cheer" seed={5} />);
    expect(cheer).toContain('data-pose="cheer"');
    expect(cheer).toContain('data-cup');
    const caught = render(<Character look={makeCharacter(5)} pose="catch" seed={5} />);
    expect(caught).toContain('data-pose="catch"');
    expect(caught).not.toContain('data-cup');
    expect(render(<Character look={makeCharacter(5)} pose="idle" seed={5} />)).not.toContain('data-cup');
  });
});
