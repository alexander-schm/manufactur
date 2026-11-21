import { options, type VNode } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { GreatKilnArt } from '../../src/client/art/village/GreatKiln';
import { LevelDecorations } from '../../src/client/art/village/Decorations';
import { ProjectSite } from '../../src/client/art/village/ProjectSites';
import { VillageMap } from '../../src/client/art/village/VillageMap';
import { mockVillage } from '../../src/client/dev/mockVillage';
import { LEVEL_DECORATIONS } from '../../src/shared/village/level';
import { PROJECTS } from '../../src/shared/village/projects';
import { mockEndgame } from '../../src/client/dev/mockEndgame';
import { GreatKilnPanel } from '../../src/client/panels/village/GreatKilnPanel';
import { MuseumView } from '../../src/client/panels/village/MuseumView';
import { ProjectCard, ProjectPanel } from '../../src/client/panels/village/ProjectPanel';
import { MarketDayBanner, mapTarget } from '../../src/client/panels/village/VillagePanel';
import { GREAT_KILN_CAPACITY } from '../../src/shared/village/kilnRules';
import { maxProjectUnits, partSize } from '../../src/shared/village/projects';

const T0 = 1_800_000_000_000;
const noop = () => {};

describe('village long goals on the map', () => {
  it('the kiln shows its phase; project sites show plot, stage and level; the sign shows the village level', () => {
    const v = mockVillage(4, ['tongrube', 'gemeinschaftsofen'], T0, { kiln: 'firing', project: { id: 'rathaus', level: 1, stage: 2 }, levels: { museum: 2 }, level: 12 });
    const html = render(<VillageMap village={v} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(html).toContain('data-kiln="firing"');
    expect(html).toMatch(/data-project-site="rathaus" data-stage="2" data-level="1"/);
    expect(html).toMatch(/data-project-site="museum"[^>]*data-level="2"/);
    expect((html.match(/data-project-site=/g) ?? []).length).toBe(5);
    expect((html.match(/data-decoration=/g) ?? []).length).toBe(2);
    expect(html).toContain('Stufe 12');
    expect(html).toContain('Rathaus I · 2/5');
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it('no kiln before the Gemeinschaftsofen is built; a loading kiln is open; an idle one is closed', () => {
    const none = render(<VillageMap village={mockVillage(3, ['tongrube'], T0)} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(none).not.toContain('data-kiln=');
    const loading = render(<VillageMap village={mockVillage(3, ['gemeinschaftsofen'], T0, { kiln: 'loading' })} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(loading).toContain('data-kiln="loading"');
    const idle = render(<VillageMap village={mockVillage(3, ['gemeinschaftsofen'], T0)} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(idle).toContain('data-kiln="idle"');
    for (const phase of ['idle', 'loading', 'firing'] as const) {
      const html = render(<svg><GreatKilnArt x={500} y={500} phase={phase} fill={0.5} /></svg>);
      expect(html).toContain(`data-kiln="${phase}"`);
      expect(html.includes('class="smoke"')).toBe(phase === 'firing');
      expect(html).not.toMatch(/NaN|undefined/);
    }
  });

  it('a plot reads Bauplatz, an offered plot names the project', () => {
    const plot = render(<svg><ProjectSite id="museum" x={200} y={1110} level={0} building={null} offered={false} onClick={noop} /></svg>);
    expect(plot).toContain('Bauplatz');
    expect(plot).toMatch(/data-project-site="museum" data-stage="0" data-level="0"/);
    const offered = render(<svg><ProjectSite id="museum" x={200} y={1110} level={0} building={null} offered onClick={noop} /></svg>);
    expect(offered).toContain('Zur Wahl: Museum');
    const v = mockVillage(2, [], T0, { offered: ['glockenturm', 'museum'] });
    const html = render(<VillageMap village={v} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect((html.match(/>Zur Wahl: /g) ?? []).length).toBe(2);
  });

  it('every project draws all three levels and every stage without NaN', () => {
    for (const [id, def] of Object.entries(PROJECTS)) {
      const n = def.stages.length;
      const looks = new Set<string>();
      for (const level of [1, 2, 3] as const) {
        const built = render(<svg><ProjectSite id={id} x={600} y={1000} level={level} building={null} offered={false} onClick={noop} /></svg>);
        expect(built).toContain(`data-level="${level}"`);
        expect(built).not.toMatch(/NaN|undefined/);
        looks.add(built);
        for (let stage = 0; stage < n; stage++) {
          const html = render(<svg><ProjectSite id={id} x={600} y={1000} level={level - 1} building={{ level, stage, stages: n }} offered={false} onClick={noop} /></svg>);
          expect(html).toContain(`data-stage="${stage}" data-level="${level}"`);
          expect(html).toContain(`${def.name} ${['I', 'II', 'III'][level - 1]} · ${stage}/${n}`);
          expect(html).not.toMatch(/NaN|undefined/);
        }
      }
      expect(looks.size).toBe(3);
    }
  });

  it('level decorations unlock every 5 levels', () => {
    expect(render(<svg><LevelDecorations level={4} /></svg>)).not.toContain('data-decoration=');
    const all = render(<svg><LevelDecorations level={30} /></svg>);
    for (const d of LEVEL_DECORATIONS) expect(all).toContain(`data-decoration="${d.id}"`);
    expect(all).not.toMatch(/NaN|undefined/);
  });

  it('a clock tick (new now, same village) re-renders no project site, kiln or decoration; a new stage does', () => {
    // capture the props VillageMap hands to the memoized components, then ask preact's memo whether it would re-render
    const capture = (el: preact.JSX.Element) => {
      const seen: VNode[] = [];
      const prev = options.vnode;
      options.vnode = (vn) => {
        if (vn.type === ProjectSite || vn.type === GreatKilnArt || vn.type === LevelDecorations) seen.push(vn);
        prev?.(vn);
      };
      try { render(el); } finally { options.vnode = prev; }
      return seen;
    };
    const wouldUpdate = (a: VNode, b: VNode): boolean => {
      const ctx = { props: a.props } as { props: unknown; shouldComponentUpdate?: (p: unknown) => boolean };
      (a.type as unknown as (this: typeof ctx, p: unknown) => void).call(ctx, a.props);
      return ctx.shouldComponentUpdate!(b.props);
    };
    const opts = { kiln: 'firing' as const, project: { id: 'rathaus', level: 1 as const, stage: 2 }, levels: { museum: 2 }, level: 30 };
    const v = mockVillage(4, ['gemeinschaftsofen'], T0, opts);
    const map = (village: typeof v, now: number) => <VillageMap village={village} meId="p1" now={now} onHouse={noop} onBuilding={() => {}} />;
    const a = capture(map(v, T0));
    const b = capture(map(structuredClone(v), T0 + 250));
    expect(a.length).toBe(7); // 5 sites, the kiln, the decorations
    a.forEach((vn, i) => expect(wouldUpdate(vn, b[i])).toBe(false));

    const next = mockVillage(4, ['gemeinschaftsofen'], T0, { ...opts, project: { id: 'rathaus', level: 1, stage: 3 } });
    const c = capture(map(next, T0 + 500));
    const changed = a.filter((vn, i) => wouldUpdate(vn, c[i])).map((vn) => (vn.props as { id?: string }).id);
    expect(changed).toEqual(['rathaus']);
  });
});

describe('village long-goal panels', () => {
  const s0 = () => mockEndgame(T0, 'manufaktur');

  it('two offers explain that the first contribution chooses', () => {
    const v = mockVillage(3, [], T0, { offered: ['glockenturm', 'museum'] });
    const html = render(<ProjectCard v={v} s={s0()} meId="p1" now={T0} onContribute={noop} />);
    expect((html.match(/data-project-offer=/g) ?? []).length).toBe(2);
    expect(html).toContain('Wer zuerst etwas beiträgt, wählt das Projekt.');
    expect(html).toContain('Erste Bauphase: ');
    expect(html).toContain('Glockenturm');
    expect(html).toContain('Museum');
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it('an active stage shows share, 70 % cap and the right buttons per part kind', () => {
    const s = s0();
    s.goods.find((g) => g.designId === 'd92')!.count = 10; // earthenware jugs
    s.materials.ton = 50;
    const v = mockVillage(3, [], T0, { project: { id: 'glockenturm', level: 1, stage: 0 } });
    const html = render(<ProjectCard v={v} s={s} meId="p1" now={T0} onContribute={noop} />);
    expect(html).toContain('Glockenturm I · Bauphase 1/4: Fundament');
    expect(html).toContain('Dein Anteil: 0 % – höchstens 70 %');
    expect(html).toContain('aus Steinzeug');
    expect(html).toContain('50 aus deinem Lager');
    expect(html).toContain('Im Dorfladen kaufen (3×)');
    expect(html).toContain('Ersatz: 9× Krüge aus Irdenware'); // 10 pieces → 3 whole units → 9 pieces
    expect(html).toMatch(/[\d.]+ Taler geben/);
    expect(html).not.toContain('Den Rest lässt du den anderen');

    // p1 gives everything the 70 % rule allows, part by part: nothing more to give
    const a = v.projects.active!;
    a.parts.forEach((p, i) => { const n = maxProjectUnits(a, i, 'p1'); p.by.p1 = n; p.filled = n; });
    expect(a.parts.some((p) => p.filled < partSize(p))).toBe(true);
    const capped = render(<ProjectCard v={v} s={s} meId="p1" now={T0} onContribute={noop} />);
    expect(capped).toContain('Dein Anteil: 70 % – höchstens 70 %');
    expect(capped).toContain('Den Rest lässt du den anderen – kein Dorfprojekt geht allein.');
    expect(capped).not.toContain('Taler geben');
    expect(capped).not.toContain('aus deinem Lager');
  });

  it('a substitute is offered per earthenware stack and counted in whole threes', () => {
    const s = s0();
    s.goods.push({ designId: 'd92', quality: 1, effect: null, count: 2 }); // 2 pieces: not even one unit
    const v = mockVillage(3, [], T0, { project: { id: 'glockenturm', level: 1, stage: 0 } });
    const html = render(<ProjectCard v={v} s={s} meId="p1" now={T0} onContribute={noop} />);
    expect((html.match(/data-substitute="d92"/g) ?? []).length).toBe(1); // the 3 craquelé jugs only
    expect(html).toContain('Ersatz: 3× Krüge aus Irdenware');
  });

  it('masterwork parts offer each unlent own masterwork that is good enough', () => {
    const s = s0(); // bronze, silver, gold
    const v = mockVillage(3, [], T0, { project: { id: 'museum', level: 1, stage: 3 } }); // 2 masterworks from silver
    v.lentMasterworks = ['p1:mw3'];
    const html = render(<ProjectCard v={v} s={s} meId="p1" now={T0} onContribute={noop} />);
    expect(html).toContain('2 Meisterstücke ab Silber');
    expect((html.match(/data-lend=/g) ?? []).length).toBe(1);
    expect(html).toContain('data-lend="mw2"');
  });

  it('the empty, lonely and finished states say so', () => {
    const none = mockVillage(2, [], T0);
    expect(render(<ProjectCard v={none} s={s0()} meId="p1" now={T0} onContribute={noop} />)).toContain('Dorfprojekte gibt es, sobald jemand im Dorf die Manufaktur erreicht hat.');
    const all = mockVillage(2, [], T0, { levels: Object.fromEntries(Object.keys(PROJECTS).map((id) => [id, 3])) });
    expect(render(<ProjectCard v={all} s={s0()} meId="p1" now={T0} onContribute={noop} />)).toContain('Alle Dorfprojekte stehen – auf Stufe III!');
    const lonely = mockVillage(1, [], T0, { project: { id: 'rathaus', level: 1, stage: 0 } });
    expect(render(<ProjectCard v={lonely} s={s0()} meId="p1" now={T0} onContribute={noop} />)).toContain('Zu zweit geht’s weiter');
    const built = mockVillage(3, [], T0, { level: 10, levels: { dorfbrunnen: 2 } });
    const panel = render(<ProjectPanel v={built} s={s0()} meId="p1" now={T0} />);
    expect(panel).toContain('Dorfbrunnen II');
    expect(panel).toContain(PROJECTS.dorfbrunnen.benefit(2));
    expect(panel).toContain('Dorfstufe 10: Großaufträge und Dorfprojekte zahlen 20 % mehr.');
  });

  it('the kiln panel shows capacity, heat and the share left', () => {
    const v = mockVillage(3, ['gemeinschaftsofen'], T0, { kiln: 'loading' });
    v.greatKiln.loads = v.greatKiln.loads.filter((l) => l.playerId !== 'p1');
    v.greatKiln.loads[0].count = 8; v.greatKiln.loads[1].count = 12; // 20 pieces
    const s = s0();
    const html = render(<GreatKilnPanel v={v} s={s} meId="p1" now={T0} />);
    expect(html).toContain(`20/${GREAT_KILN_CAPACITY} Stücke · brennt spätestens um`);
    expect(html).toMatch(/Hitze: \d+ %/);
    expect(html).toContain('Mehr Leute und mehr Holz machen das Feuer heißer.');
    expect(html).toContain('In den Ofen räumen');
    expect(html).toMatch(/type="range"[^>]*max="20"/); // the whole member share is still free
    // the mock workshop has a masterwork under way: no second one
    expect(html).not.toMatch(/<button[^>]*>Meisterstück mitbrennen/);
    expect(html).toContain('Dein Meisterstück entsteht gerade in der Werkstatt');
    s.batches = s.batches.filter((b) => !b.masterwork);
    const free = render(<GreatKilnPanel v={v} s={s} meId="p1" now={T0} />);
    expect(free).toMatch(/<button[^>]*>Meisterstück mitbrennen · [\d.]+ Taler/);
    expect(free).toContain('Es ist dein eines Meisterstück');
  });

  it('the kiln panel tells empty, firing and the last firing apart', () => {
    const empty = mockVillage(3, ['gemeinschaftsofen'], T0, { lastFiring: true });
    const e = render(<GreatKilnPanel v={empty} s={s0()} meId="p1" now={T0} />);
    expect(e).toContain('Der Ofen ist leer.');
    expect(e).toContain('48 Stücke von 3 Leuten · Hitze 75 %');
    expect(e).toContain('Schönstes Stück: Bens Krug mit Ascheglasur');
    const firing = render(<GreatKilnPanel v={mockVillage(3, ['gemeinschaftsofen'], T0, { kiln: 'firing' })} s={s0()} meId="p1" now={T0} />);
    expect(firing).toContain('Der Ofen brennt – fertig um');
    expect(firing).toContain('Hitze: 60 %');
    expect(firing).not.toContain('In den Ofen räumen');
  });

  it('the museum shows every member’s masterworks', () => {
    const v = mockVillage(2, [], T0, { levels: { museum: 1 }, museum: [1] });
    const html = render(<MuseumView v={v} />);
    expect(html).toContain('Museum I');
    expect((html.match(/data-museum-piece=/g) ?? []).length).toBe(2);
    expect(html).toContain('Anna');
    expect(html).toContain('Ben');
    expect(html).not.toMatch(/NaN|undefined/);
    expect(render(<MuseumView v={mockVillage(2, [], T0, { levels: { museum: 2 } })} />)).toContain('Noch keine Meisterstücke – das Museum wartet!');
  });

  it('map clicks open the kiln, the project or the museum', () => {
    const v = mockVillage(3, ['gemeinschaftsofen', 'tongrube'], T0, { levels: { museum: 1 }, offered: ['rathaus'] });
    expect(mapTarget(v, 'gemeinschaftsofen')).toBe('kiln');
    expect(mapTarget(v, 'rathaus')).toBe('project');
    expect(mapTarget(v, 'glockenturm')).toBe('project');
    expect(mapTarget(v, 'museum')).toBe('museum');
    expect(mapTarget(v, 'tongrube')).toBeNull();
  });

  it('the market-day banner shows while the Glockenturm rings', () => {
    const s = s0();
    const DAY = 86_400_000, HOUR = 3_600_000;
    const saturday = (Math.floor(T0 / DAY / 7) * 7 + 9) * DAY; // epoch day % 7 === 2
    expect(Math.floor(saturday / DAY) % 7).toBe(2);
    s.village = { villageId: 'dev', specialty: null, buildings: [], helpBoostUntil: 0, trickleCarry: 0, members: 3, projects: { glockenturm: 1 } } as unknown as typeof s.village;
    expect(render(<MarketDayBanner s={s} now={saturday + 10 * HOUR} />)).toMatch(/Markttag! Bis \d\d:\d\d verkaufen die Marktstände zu 120 %\./);
    expect(render(<MarketDayBanner s={s} now={saturday + 13 * HOUR} />)).toBe('');
  });
});
