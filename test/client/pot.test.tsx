import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { MarkFrame } from '../../src/client/art/markFrame';
import { Effect, Pot } from '../../src/client/art/Pot';
import { potShape } from '../../src/client/art/potShape';
import { BODIES, EFFECTS, FORMS, FRAMES } from '../../src/shared/content';
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

describe('Pot art: porcelain, figurines, tiles, Schuppen, crown', () => {
  const piece = (form: string, extra: Record<string, unknown> = {}) => ({ form, profile: FORMS[form].profileDefaults, handle: 'none' as const, rim: 'plain' as const, pattern: 'none' as PatternKind, patternColor: '#ffffff', ...extra });
  it('figurines and tiles render for every body, pattern and variant', () => {
    const variants = FORMS.figur.variants!.map((v) => v.id);
    expect(variants).toEqual(['katze', 'eule', 'igel']);
    for (const body of Object.keys(BODIES)) for (const pattern of Object.keys(PATTERN_UNLOCK)) {
      for (const variant of variants) {
        const html = render(<Pot design={piece('figur', { body, pattern, variant })} glazeColor="#3f6fb5" effect="kristall" mark={{ shape: 'star', letter: 'Q', color: '#b44c36' }} quality={3} />);
        expect(html).not.toMatch(/NaN|undefined/);
        expect(html).toContain(`data-variant="${variant}"`);
        expect(html).toContain(`data-body="${body}"`);
        expect(html).toContain('>Q<');
      }
      const tile = render(<Pot design={piece('fliese', { body, pattern })} glazeColor="#3f6fb5" effect="craquele" mark={{ shape: 'heart', letter: 'Q', color: '#b44c36' }} fit />);
      expect(tile).not.toMatch(/NaN|undefined/);
      expect(tile).toContain('data-tile');
      expect(tile).toContain(`data-body="${body}"`);
    }
    // the animal defaults to the cat, and different animals have different outlines
    expect(render(<Pot design={piece('figur')} glazeColor="#3f6fb5" />)).toContain('data-variant="katze"');
    const path = (html: string) => /data-path="([^"]+)"/.exec(html)![1];
    const outlines = variants.map((variant) => path(render(<Pot design={piece('figur', { variant })} glazeColor="#3f6fb5" />)));
    expect(new Set(outlines).size).toBe(3);
    // the profile scales the figure: taller → a different outline
    expect(path(render(<Pot design={piece('figur', { profile: { ...FORMS.figur.profileDefaults, height: 1 } })} glazeColor="#3f6fb5" />))).not.toBe(outlines[0]);
    // fit crops the view to the piece
    const fitBox = /viewBox="([^"]+)"/.exec(render(<Pot design={piece('figur', { variant: 'igel' })} glazeColor="#3f6fb5" fit />))![1].split(' ').map(Number);
    expect(fitBox.every(Number.isFinite)).toBe(true);
    expect(fitBox[3]).toBeLessThan(110);
  });
  it('figurine and tile silhouettes show no glaze, pattern or mark', () => {
    for (const d of [piece('figur', { variant: 'eule', pattern: 'dots' }), piece('fliese', { pattern: 'karo' })]) {
      const html = render(<Pot design={d} glazeColor="#3f6fb5" mark={{ shape: 'star', letter: 'Q', color: '#b44c36' }} silhouette />);
      expect(html).toContain('data-silhouette');
      expect(html).toContain('stroke-dasharray');
      expect(html).not.toContain('#3f6fb5');
      expect(html).not.toContain('#ffffff');
      expect(html).not.toContain('>Q<');
    }
  });
  it('porcelain glows; crown frame renders', () => {
    for (const form of ['becher', 'teller', 'figur', 'fliese']) {
      const porcelain = render(<Pot design={piece(form, { body: 'porzellan' })} glazeColor="#f3f1ec" />);
      expect(porcelain).toContain('data-glow');
      expect(porcelain).toContain('#fbf8f2');
      expect(render(<Pot design={piece(form, { body: 'steinzeug' })} glazeColor="#f3f1ec" />)).not.toContain('data-glow');
    }
    expect(FRAMES.krone.unlock).toBe('rahmen-krone');
    const crown = render(<Pot design={cup} glazeColor="#3f6fb5" mark={{ shape: 'heart', letter: 'A', color: '#b44c36', frame: 'krone' }} size={120} />);
    expect(crown).toContain('data-frame="krone"');
    expect(crown).not.toMatch(/NaN|undefined/);
  });
  it('Schuppen draws scales on pots, plates, figurines and tiles', () => {
    expect(PATTERN_UNLOCK.schuppen).toBe('muster-schuppen');
    for (const form of ['vase', 'teller', 'figur', 'fliese']) {
      const html = render(<Pot design={piece(form, { pattern: 'schuppen', patternColor: '#123456' })} glazeColor="#3f6fb5" />);
      expect((html.match(/data-scale/g) ?? []).length).toBeGreaterThanOrEqual(6);
      expect(html).toContain('#123456');
    }
  });
});

describe('[Final fix #2] effect overlays', () => {
  it('every effect draws an overlay of at most ~40 elements on pots, plates, tiles and figures', () => {
    const shape = potShape('vase', FORMS.vase.profileDefaults, 'plain', 'none');
    for (const id of Object.keys(EFFECTS)) {
      const overlay = Effect({ s: shape, effect: id, seed: 12345, base: '#3f6fb5' });
      expect(overlay, id).not.toBeNull();
      const html = render(overlay!);
      expect(html, id).not.toMatch(/NaN|undefined/);
      expect((html.match(/<(circle|ellipse|path|rect)\b/g) ?? []).length, id).toBeGreaterThan(0);
      expect((html.match(/<(circle|ellipse|path|rect)\b/g) ?? []).length, id).toBeLessThanOrEqual(40);
      for (const form of ['becher', 'teller', 'fliese', 'figur']) {
        const design = { ...cup, form, profile: FORMS[form].profileDefaults, pattern: 'none' as PatternKind, body: (EFFECTS[id].body ?? 'irdenware') as BodyId };
        const plain = render(<Pot design={design} glazeColor="#3f6fb5" />);
        const withEffect = render(<Pot design={design} glazeColor="#3f6fb5" effect={id} />);
        expect(withEffect.length, `${id} on ${form}`).toBeGreaterThan(plain.length);
        expect(withEffect, `${id} on ${form}`).not.toMatch(/NaN|undefined/);
      }
    }
  });
});
