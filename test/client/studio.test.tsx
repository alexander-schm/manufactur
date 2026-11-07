import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { DesignPreview } from '../../src/client/panels/DesignStudio';
import { experimentActionFor, saveActionFor, topFans } from '../../src/client/panels/studioLogic';
import { advance } from '../../src/shared/advance';
import { newGame } from '../../src/shared/state';

const T0 = 1_800_000_000_000;

describe('design studio', () => {
  it('moving a slider changes the preview outline', () => {
    const s = newGame('p', 2, T0);
    const d = s.designs[0];
    const path = (html: string) => /data-path="([^"]+)"/.exec(html)![1];
    const a = path(render(<DesignPreview s={s} draft={d} />));
    const b = path(render(<DesignPreview s={s} draft={{ ...d, profile: { ...d.profile, height: 0.9 } }} />));
    expect(a).not.toBe(b);
  });
  it('save clamps profile values into 0..1', () => {
    const s = newGame('p', 2, T0);
    const a = saveActionFor({ ...s.designs[0], profile: { height: 1.3, belly: -0.2, neck: 0.5, foot: 0.5, rim: 0.5 } });
    expect(a.type).toBe('saveDesign');
    for (const v of Object.values(a.design.profile)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
  it('experiment action carries the chosen recipe; no colourant means 0 %', () => {
    expect(experimentActionFor({ base: 'matt', colorant: 'kobalt', colorantPct: 3, temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam' })).toEqual({
      type: 'experiment', recipe: { base: 'matt', colorant: 'kobalt', colorantPct: 3, firing: { temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam' } },
    });
    expect(experimentActionFor({ base: 'opak', colorant: null, colorantPct: 5, temp: 'mittel', atmosphere: 'oxidierend', cooling: 'langsam' }).recipe.colorantPct).toBe(0);
  });
  it('topFans lists open-order customers who like the draft, best first', () => {
    const s = advance(newGame('p', 5, T0), T0 + 1000);
    const fans = topFans(s, s.designs[0]);
    expect(fans.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < fans.length; i++) expect(fans[i - 1].appeal).toBeGreaterThanOrEqual(fans[i].appeal);
  });
});
