import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { CollectionBook } from '../../src/client/panels/CollectionBook';
import { collectionGrid, groupPrizes } from '../../src/client/panels/collectionLogic';
import { RecipeBook } from '../../src/client/panels/RecipeBook';
import { collectionEntries, colId, recordCollection, rowId } from '../../src/shared/collection';
import { BODIES, EXTRA_COLORS, FORMS } from '../../src/shared/content';
import { manufakturGame, plainGame } from '../shared/helpers';

describe('collection book', () => {
  it('found cells draw the piece, unfound ones only say which tier', () => {
    const s = plainGame(); s.collection = ['becher|irdenware|-'];
    const g = collectionGrid(s, 'irdenware');
    expect(g.cells[0][0]).toMatchObject({ found: true });
    expect(g.effectLabels).toContain('?'); // undiscovered effect names stay hidden
    const tea = g.cells[g.forms.indexOf('teekanne')][0];
    expect(tea).toMatchObject({ found: false, title: 'Braucht: Manufaktur' });
    const html = render(<CollectionBook s={s} />);
    expect(html).toContain('data-silhouette'); expect(html).not.toContain('Ölfleck');
  });

  it('labels: "ohne" for no effect, names only for discovered effects; reachable unfound cells say "Noch nicht gefunden"', () => {
    const s = plainGame();
    s.glazes.push({ ...structuredClone(s.glazes[0]), id: 'gc', effect: 'craquele', color: '#abcdef' });
    const g = collectionGrid(s, 'irdenware');
    expect(g.effects[0]).toBeNull();
    expect(g.effectLabels[0]).toBe('ohne');
    expect(g.effectLabels[g.effects.indexOf('craquele')]).toBe('Craquelé');
    expect(g.effectLabels[g.effects.indexOf('seladon')]).toBe('?');
    expect(g.effects).not.toContain('oelfleck');
    expect(g.cells[0][1]).toMatchObject({ found: false, title: 'Noch nicht gefunden' });
  });

  it('found look uses the newest own design of the form and an own glaze with that effect, else defaults and the clear colour', () => {
    const s = manufakturGame();
    const own = s.designs.find((d) => d.form === 'becher')!;
    s.designs.push({ ...structuredClone(own), id: 'dnew', profile: { height: 0.9, belly: 0.1, neck: 0.1, foot: 0.1, rim: 0.1 } });
    s.glazes.push({ ...structuredClone(s.glazes[0]), id: 'gc', effect: 'craquele', color: '#abcdef', body: 'irdenware' });
    s.collection = ['becher|irdenware|craquele', 'vase|steinzeug|-'];
    const g = collectionGrid(s, 'irdenware');
    const cell = g.cells[g.forms.indexOf('becher')][g.effects.indexOf('craquele')];
    expect(cell.look.glazeColor).toBe('#abcdef');
    expect(cell.look.effect).toBe('craquele');
    expect(cell.look.design.profile.height).toBe(0.9);
    const sz = collectionGrid(s, 'steinzeug');
    const vase = sz.cells[sz.forms.indexOf('vase')][0];
    expect(vase.found).toBe(true);
    expect(vase.look.design.profile).toEqual(FORMS.vase.profileDefaults);
    expect(vase.look.design.body).toBe('steinzeug');
    expect(vase.look.glazeColor).toBe(BODIES.steinzeug.clearColor);
  });

  it('locked bodies get a tab that says from which tier; the page shows both percentages and the prize line', () => {
    const s = plainGame(); s.collection = ['becher|irdenware|-'];
    const html = render(<CollectionBook s={s} />);
    expect(html).toContain('Steinzeug · ab Manufaktur');
    expect(html).toMatch(/Diese Seite: <strong>\d+ %/);
    expect(html).toContain('Ganze Sammlung:');
    expect(html).toContain('Jede volle Reihe und Spalte schenkt dir eine neue Farbe.');
    expect(render(<CollectionBook s={manufakturGame()} />)).not.toContain('ab Manufaktur');
  });

  it('completed rows win a ribbon in their colour; after all colours a gold stamp', () => {
    const s = manufakturGame();
    for (const e of collectionEntries()) if (e.body === 'irdenware' && e.form === 'becher') recordCollection(s, e.form, e.body, e.effect);
    const prizes = groupPrizes(s);
    expect(prizes.get(rowId('irdenware', 'becher'))).toEqual({ kind: 'ribbon', color: EXTRA_COLORS[0].color });
    expect(render(<CollectionBook s={s} />)).toContain('coll-ribbon');
    s.collectionRewards.push(colId('irdenware', null), `stamp|${colId('irdenware', null)}`);
    expect(groupPrizes(s).get(colId('irdenware', null))).toEqual({ kind: 'stamp' });
    expect(render(<CollectionBook s={s} />)).toContain('coll-stamp');
  });

  it('the recipe book has Glasuren and Sammlung tabs and can open on the Sammlung', () => {
    const s = plainGame();
    const glazes = render(<RecipeBook s={s} />);
    expect(glazes).toContain('Glasuren');
    expect(glazes).toContain('Meine Glasuren');
    expect(glazes).not.toContain('coll-grid');
    const book = render(<RecipeBook s={s} tab="sammlung" />);
    expect(book).toContain('coll-grid');
    expect(book).not.toContain('Meine Glasuren');
  });

  it('the book labels a found great-kiln column with its name, under the heading Gemeinschaftsofen', () => {
    const s = plainGame();
    const before = collectionGrid(s, 'irdenware');
    const i = before.effects.indexOf('ascheglasur');
    expect(i).toBeGreaterThan(0);
    expect(before.effectLabels[i]).toBe('?');
    const html0 = render(<CollectionBook s={s} />);
    expect(html0.match(/Gemeinschaftsofen/g)).toHaveLength(1);
    expect(html0).not.toContain('Ascheglasur');

    s.collection.push('vase|steinzeug|ascheglasur');
    const g = collectionGrid(s, 'irdenware');
    expect(g.effectLabels[i]).toBe('Ascheglasur');
    expect(g.effectLabels[g.effects.indexOf('flammenspur')]).toBe('?');
    expect(g.cells[g.forms.indexOf('vase')][i].found).toBe(false);
    s.collection.push('becher|irdenware|ascheglasur');
    const cell = collectionGrid(s, 'irdenware').cells[g.forms.indexOf('becher')][i];
    expect(cell).toMatchObject({ found: true, look: { glazeColor: BODIES.irdenware.clearColor, effect: 'ascheglasur' } });
    const html = render(<CollectionBook s={s} />);
    expect(html).toContain('Gemeinschaftsofen');
    expect(html).toContain('Ascheglasur');
  });
});
