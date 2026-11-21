import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { MarkFrame } from '../../src/client/art/markFrame';
import { Pot } from '../../src/client/art/Pot';
import { potShape } from '../../src/client/art/potShape';
import { BODIES, FORMS, FRAMES } from '../../src/shared/content';
import { PATTERN_UNLOCK } from '../../src/shared/design';
import type { BodyId, PatternKind } from '../../src/shared/types';

const cup = { form: 'becher', profile: FORMS.becher.profileDefaults, handle: 'round' as const, rim: 'plain' as const, pattern: 'stripes' as PatternKind, patternColor: '#ffffff' };

describe('Pot art: bodies, Teekanne, patterns, frames, silhouettes', () => {
  it('Teekanne has a spout and a lid; every form × body × pattern renders without NaN', () => {
    expect(potShape('teekanne', FORMS.teekanne.profileDefaults, 'plain', 'round').spout).toBeTruthy();
    expect(potShape('teekanne', FORMS.teekanne.profileDefaults, 'plain', 'round').lid).toBeTruthy();
    for (const form of Object.keys(FORMS)) for (const body of Object.keys(BODIES)) for (const pattern of Object.keys(PATTERN_UNLOCK)) {
      const design = { form, profile: FORMS[form].profileDefaults, handle: 'none' as const, rim: 'plain' as const, pattern: pattern as PatternKind, patternColor: '#ffffff', body: body as BodyId };
      const html = render(<Pot design={design} glazeColor="#3f6fb5" />);
      expect(html).not.toMatch(/NaN|undefined/); expect(html).toContain(`data-body="${body}"`);
    }
  });
  it('silhouettes have no glaze and frames render', () => {
    expect(render(<Pot design={cup} glazeColor="#3f6fb5" silhouette />)).toMatch(/data-silhouette[\s\S]*stroke-dasharray/);
    expect(render(<Pot design={cup} glazeColor="#3f6fb5" mark={{ shape: 'heart', letter: 'A', color: '#b44c36', frame: 'kranz' }} size={120} />)).toContain('data-frame="kranz"');
  });
  it('a silhouette shows no glaze colour, pattern or mark, also for plates', () => {
    for (const form of ['becher', 'teller', 'teekanne']) {
      const html = render(<Pot design={{ ...cup, form, profile: FORMS[form].profileDefaults }} glazeColor="#3f6fb5" effect="kristall" mark={{ shape: 'star', letter: 'Q', color: '#b44c36' }} silhouette />);
      expect(html).toContain('data-silhouette');
      expect(html).not.toContain('#3f6fb5');
      expect(html).not.toContain('#ffffff');
      expect(html).not.toContain('>Q<');
    }
  });
  it('stoneware shows speckles and a grey-brown foot; earthenware keeps the raw clay foot', () => {
    const stone = render(<Pot design={{ ...cup, body: 'steinzeug' }} glazeColor="#3f6fb5" />);
    const earth = render(<Pot design={cup} glazeColor="#3f6fb5" />);
    expect(stone).toContain('#9c8f80');
    expect((stone.match(/data-speckle/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(earth).toContain('var(--clayRaw)');
    expect(earth).toContain('data-body="irdenware"');
    expect(earth).not.toContain('data-speckle');
  });
  it('MarkFrame draws every frame id, nothing for unknown ids', () => {
    for (const id of Object.keys(FRAMES)) {
      const html = render(<svg><MarkFrame frame={id} x={50} y={50} r={10} color="#b44c36" /></svg>);
      expect(html).toContain(`data-frame="${id}"`);
      expect(html).not.toMatch(/NaN|undefined/);
    }
    expect(render(<svg><MarkFrame frame="nope" x={50} y={50} r={10} color="#b44c36" /></svg>)).not.toContain('data-frame');
  });
  it('Teekanne lid sits on the rim, spout leaves the left side and the handle the right', () => {
    for (const p of [FORMS.teekanne.profileDefaults, { height: 0, belly: 0, neck: 0, foot: 0, rim: 0 }, { height: 1, belly: 1, neck: 1, foot: 1, rim: 1 }]) {
      const s = potShape('teekanne', p, 'plain', 'round');
      expect(s.lid!.cy).toBeCloseTo(s.rim.cy, 5);
      expect(s.lid!.rx).toBeGreaterThanOrEqual(s.rim.rx);
      const spoutXs = (s.spout!.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 0);
      expect(Math.min(...spoutXs)).toBeLessThan(50 - s.maxHalfWidth);
      expect(Math.min(...spoutXs)).toBeGreaterThanOrEqual(-8);
      const handleXs = (s.handle!.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 0);
      expect(Math.min(...handleXs)).toBeGreaterThan(50);
      expect(Math.max(...handleXs)).toBeLessThanOrEqual(108);
    }
  });
});
