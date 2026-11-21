import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { WorkshopScene } from '../../src/client/art/workshop/WorkshopScene';
import { Cabinet } from '../../src/client/art/surprises/Cabinet';
import { CuriosityAlbum } from '../../src/client/panels/CuriosityAlbum';
import { albumView } from '../../src/client/panels/albumLogic';
import { ALBUM_PRIZES, CURIOSITIES } from '../../src/shared/content/curiosities';
import { newGame } from '../../src/shared/state';

const T0 = Date.UTC(2026, 5, 1, 12, 0, 0);
const TOTAL = Object.keys(CURIOSITIES).length;

describe('Kuriositätenkabinett album', () => {
  it('album view: counter, hints for unfound, captions for found, next prize', () => {
    const s = newGame('p', 1, T0); s.curiosities = { 'katze-streicheln': T0 };
    const v = albumView(s);
    expect([v.found, v.total]).toEqual([1, TOTAL]);
    expect(v.groups.map((g) => g.title)).toEqual(['Werkstatt', 'Fenster', 'Dorf', 'Jahreszeiten']);
    expect(v.groups.reduce((n, g) => n + g.cards.length, 0)).toBe(TOTAL);
    const cat = v.groups[0].cards.find((c) => c.id === 'katze-streicheln')!;
    expect(cat).toMatchObject({ found: true, name: 'Schnurrende Katze', text: CURIOSITIES['katze-streicheln'].caption, foundAt: T0, rarity: 'C' });
    expect(v.groups[1].cards.find((c) => c.id === 'drache')).toMatchObject({ found: false, name: '???', text: 'Manchmal beschlägt das Fenster ganz von allein …', foundAt: null });
    expect(v.nextPrize).toEqual({ at: 10, decor: 'ohrensessel', left: 9 });
  });

  it('the next prize moves on and ends once every prize is reached', () => {
    const s = newGame('p', 1, T0);
    const ids = Object.keys(CURIOSITIES);
    s.curiosities = Object.fromEntries(ids.slice(0, ALBUM_PRIZES[0].at).map((id) => [id, T0]));
    expect(albumView(s).nextPrize).toEqual({ at: ALBUM_PRIZES[1].at, decor: ALBUM_PRIZES[1].decor, left: ALBUM_PRIZES[1].at - ALBUM_PRIZES[0].at });
    s.curiosities = Object.fromEntries(ids.map((id) => [id, T0]));
    expect(albumView(s).nextPrize).toBeNull();
    expect(render(<CuriosityAlbum s={s} />)).toContain('Alle Geschenke abgeholt – jetzt heißt es nur noch staunen.');
  });

  it('the album page shows no spoilers', () => {
    const s = newGame('p', 1, T0); s.curiosities = { 'katze-streicheln': T0 };
    const html = render(<CuriosityAlbum s={s} />);
    expect(html).toContain(`1 / ${TOTAL} entdeckt`);
    expect(html).not.toContain('Der neugierige Drache');
    expect(html).not.toContain(CURIOSITIES.drache.caption);
    expect(html).toContain('Noch 9 bis zum nächsten Geschenk: Ohrensessel');
    expect(html).toContain(`entdeckt am ${new Date(T0).toLocaleDateString('de-DE')}`);
    expect(html).toContain('Schnurrende Katze');
    expect((html.match(/class="curio-card[^"]*unfound/g) ?? []).length).toBe(TOTAL - 1);
  });

  it('the scene has a clickable cabinet, a visit does not', () => {
    const s = newGame('p', 1, T0);
    expect(render(<WorkshopScene state={s} now={T0} onStation={() => {}} onCabinet={() => {}} />)).toMatch(/data-cabinet[^>]*role="button"/);
    expect(render(<WorkshopScene state={s} now={T0} />)).not.toMatch(/data-cabinet[^>]*role="button"/);
    expect(render(<WorkshopScene state={s} now={T0} />)).toContain('data-cabinet');
  });

  it('the cabinet fills one shelf object per six entries and sparkles when fresh', () => {
    const objects = (found: number) => (render(<svg><Cabinet x={352} y={300} found={found} fresh={false} /></svg>).match(/data-curio=/g) ?? []).length;
    expect([objects(0), objects(5), objects(6), objects(20), objects(TOTAL)]).toEqual([0, 0, 1, 3, 6]);
    expect(render(<svg><Cabinet x={352} y={300} found={3} fresh /></svg>)).toContain('cabinet-sparkle');
    expect(render(<svg><Cabinet x={352} y={300} found={3} fresh={false} /></svg>)).not.toContain('cabinet-sparkle');
  });
});
