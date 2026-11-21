import { describe, expect, it } from 'vitest';
import { advance } from '../../src/shared/advance';
import { COLLECTION_FALLBACK_TALER, collectionEntries, collectionPercent, recordCollection } from '../../src/shared/collection';
import { EXTRA_COLORS } from '../../src/shared/content';
import { migrateState, newGame } from '../../src/shared/state';
import { T0, manufakturGame, withStanding } from './helpers';

describe('collection book', () => {
  it('the book has form x body x (no effect + matching effects) entries', () => {
    const e = collectionEntries();
    expect(new Set(e.map((x) => x.key)).size).toBe(e.length);
    expect(e.some((x) => x.key === 'becher|irdenware|oelfleck')).toBe(false);
    expect(e.some((x) => x.key === 'becher|steinzeug|oelfleck')).toBe(true);
    expect(e.find((x) => x.key === 'teekanne|irdenware|-')!.tier).toBe('manufaktur');
    expect(e.find((x) => x.key === 'becher|irdenware|-')!.tier).toBe('werkstatt');
  });
  it('a finished batch records its combination once', () => {
    const s = advance(withStanding(1), T0 + 3_600_000);
    expect(s.collection).toEqual(['becher|irdenware|-']);
  });
  it('recording skips unknown keys, duplicates and missing designs without throwing', () => {
    const s = manufakturGame();
    recordCollection(s, 'becher', 'irdenware', 'oelfleck');
    recordCollection(s, 'nope', 'irdenware', null);
    recordCollection(s, 'becher', 'irdenware', null);
    recordCollection(s, 'becher', 'irdenware', null);
    expect(s.collection).toEqual(['becher|irdenware|-']);
  });
  it('completing a row grants the next colour, then a gold stamp when all colours are owned', () => {
    const s = manufakturGame();
    const row = collectionEntries().filter((x) => x.body === 'irdenware' && x.form === 'becher');
    for (const x of row.slice(1)) recordCollection(s, x.form, x.body, x.effect);
    expect(s.unlocks).not.toContain('farbe-gold');
    recordCollection(s, row[0].form, row[0].body, row[0].effect);
    expect(s.unlocks).toContain('farbe-gold');
    expect(s.collectionRewards).toContain('r|irdenware|becher');
    s.unlocks.push(...EXTRA_COLORS.map((c) => c.unlock));
    const taler = s.taler;
    for (const x of collectionEntries().filter((x) => x.body === 'irdenware' && x.form === 'schale')) recordCollection(s, x.form, x.body, x.effect);
    expect(s.taler).toBe(taler);
    expect(s.collectionRewards).toContain('stamp|r|irdenware|schale');
    expect(COLLECTION_FALLBACK_TALER).toBe(200);
  });
  it('completing a column grants a prize', () => {
    const s = manufakturGame();
    const col = collectionEntries().filter((x) => x.body === 'irdenware' && x.effect === null);
    for (const x of col) recordCollection(s, x.form, x.body, x.effect);
    expect(s.collectionRewards).toContain('c|irdenware|-');
    expect(s.unlocks).toContain('farbe-gold');
  });
  it('migration seeds the book from own goods only', () => {
    const v2: any = JSON.parse(JSON.stringify(newGame('p', 5, T0)));
    v2.schemaVersion = 2;
    for (const k of ['tier', 'collection', 'collectionRewards', 'keepStock', 'commission', 'masterworks']) delete v2[k];
    for (const d of v2.designs) delete d.body;
    for (const g of v2.glazes) delete g.body;
    const own = v2.designs[0];
    const foreign = { ...structuredClone(own), id: 'f:x', form: 'vase', origin: { playerName: 'X', makerMark: {}, glazeColor: '#fff' } };
    v2.designs.push(foreign);
    v2.goods = [
      { designId: own.id, quality: 1, effect: 'craquele', count: 2 },
      { designId: 'f:x', quality: 1, effect: null, count: 1 },
    ];
    expect(migrateState(v2).collection).toEqual([`${own.form}|irdenware|craquele`]);
  });
  it('percent', () => {
    const s = newGame('p', 1, T0);
    expect(collectionPercent(s)).toBe(0);
    const all = collectionEntries();
    for (const x of all.slice(0, 24)) recordCollection(s, x.form, x.body, x.effect);
    expect(collectionPercent(s)).toBe(Math.floor((100 * 24) / all.length));
    const inBody = all.filter((x) => x.body === 'irdenware');
    const found = s.collection.filter((k) => k.split('|')[1] === 'irdenware').length;
    expect(collectionPercent(s, 'irdenware')).toBe(Math.floor((100 * found) / inBody.length));
  });
});
