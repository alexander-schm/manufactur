import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { DesignPreview } from '../../src/client/panels/DesignStudio';
import { BodyPicker } from '../../src/client/panels/BodyPicker';
import { ExperimentPanel } from '../../src/client/panels/ExperimentPanel';
import { RecipeBook } from '../../src/client/panels/RecipeBook';
import { experimentActionFor, patternColorsFor, saveActionFor, switchBody, topFans } from '../../src/client/panels/studioLogic';
import { T } from '../../src/client/strings';
import { bodyGateError } from '../../src/shared/design';
import { hofGame, manufakturGame, plainGame } from '../shared/helpers';
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
    expect(experimentActionFor({ base: 'matt', colorant: 'kobalt', colorantPct: 3, temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam', body: 'irdenware' })).toEqual({
      type: 'experiment', recipe: { base: 'matt', body: 'irdenware', colorant: 'kobalt', colorantPct: 3, firing: { temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam' } },
    });
    expect(experimentActionFor({ base: 'opak', colorant: null, colorantPct: 5, temp: 'mittel', atmosphere: 'oxidierend', cooling: 'langsam', body: 'irdenware' }).recipe.colorantPct).toBe(0);
  });
  it('topFans lists open-order customers who like the draft, best first', () => {
    const s = advance(newGame('p', 5, T0), T0 + 1000);
    const fans = topFans(s, s.designs[0]);
    expect(fans.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < fans.length; i++) expect(fans[i - 1].appeal).toBeGreaterThanOrEqual(fans[i].appeal);
  });
  it('switching the body picks a matching glaze', () => {
    const s = manufakturGame();
    expect(switchBody(s, s.designs[0], 'steinzeug')).toMatchObject({ body: 'steinzeug', glazeId: 'klar-steinzeug' });
    const st = switchBody(s, s.designs[0], 'steinzeug');
    expect(switchBody(s, st, 'irdenware').glazeId).toBe(s.glazes.find((g) => g.body === 'irdenware')!.id);
  });
  it('experiment action carries the body', () => {
    expect(experimentActionFor({ base: 'matt', colorant: null, colorantPct: 0, temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam', body: 'steinzeug' }).recipe.body).toBe('steinzeug');
  });
  it('extra colours appear once unlocked', () => {
    const s = plainGame();
    expect(patternColorsFor(s)).not.toContain('#d4a531');
    s.unlocks.push('farbe-gold');
    expect(patternColorsFor(s)).toContain('#d4a531');
  });
  it('body picker locks stoneware in the Werkstatt and says why', () => {
    const html = render(<BodyPicker s={plainGame()} value="irdenware" onPick={() => {}} />);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*ab Manufaktur/);
    expect(html).toContain(bodyGateError(plainGame(), 'steinzeug')!);
    expect(render(<BodyPicker s={hofGame()} value="porzellan" onPick={() => {}} />)).not.toMatch(/disabled/);
  });
  it('experiment panel counts the body material in the cost text', () => {
    const html = render(<ExperimentPanel s={manufakturGame()} />);
    expect(html).toContain('und 1 Ton.');
  });
  it('recipe book groups glazes per body and hides names of unavailable effects', () => {
    const werk = render(<RecipeBook s={plainGame()} />);
    expect(werk).toMatch(/<h4>Irdenware<\/h4>/);
    expect(werk).not.toMatch(/<h4>Steinzeug<\/h4>/);
    expect(werk).toMatch(/\+\d+ weitere Effekte ab der Manufaktur/);
    const manu = render(<RecipeBook s={manufakturGame()} />);
    expect(manu).toMatch(/<h4>Steinzeug<\/h4>/);
    expect(manu).not.toMatch(/weitere Effekte/);
  });
  it('experiment panel: stoneware needs kiln level 2, else a hint shows and Brennen is disabled', () => {
    const s = manufakturGame();
    const kiln = s.stations.find((x) => x.kind === 'kiln')!;
    kiln.level = 1;
    const cold = render(<ExperimentPanel s={s} initialBody="steinzeug" />);
    expect(cold).toContain(T.kilnTooCold('Steinzeug'));
    expect(cold).toMatch(/<button[^>]*disabled[^>]*>[^<]*Brennen!/);
    kiln.level = 2;
    s.materials.glasurbasis = 10;
    const ok = render(<ExperimentPanel s={s} initialBody="steinzeug" />);
    expect(ok).not.toContain('muss heiß gebrannt werden');
    expect(ok).not.toMatch(/<button[^>]*disabled[^>]*>[^<]*Brennen!/);
    expect(render(<ExperimentPanel s={s} />)).not.toContain('muss heiß gebrannt werden');
  });
});
