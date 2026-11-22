import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { WorkshopScene } from '../../src/client/art/workshop/WorkshopScene';
import { mockWorkshop } from '../../src/client/dev/ScenePage';
import { browserEnv, memoryStore, readDevFlags } from '../../src/client/surprises/env';
import { SURPRISES } from '../../src/client/surprises/defs';
import { CAKE_BOX, CAT_HITS, DECOR_BOXES, HIT_RECTS, SPOTS, TREE_BOXES, VILLAGE_SPOTS, catHitRect, catSpot, stationRect, xmasStallRect, type Rect } from '../../src/client/surprises/spots';
import { GIFT_NAMES } from '../../src/client/surprises/texts';
import { catcherOf } from '../../src/client/art/surprises/SurpriseLayer';
import { BUILDING_SPOTS, PLOTS, PROJECT_SPOTS, VillageMap } from '../../src/client/art/village/VillageMap';
import { mockVillage } from '../../src/client/dev/mockVillage';
import type { LocalTime, Mood, Play, SurpriseView } from '../../src/client/surprises/types';
import { shouldRecord } from '../../src/client/surprises/useSurprises';
import { CARD_ART } from '../../src/client/art/surprises/cards';
import { STATION_BOX } from '../../src/client/art/workshop/stations/Stations';
import { DecorLayer } from '../../src/client/art/workshop/Decor';
import { CURIOSITIES } from '../../src/shared/content/curiosities';
import { newGame } from '../../src/shared/state';
import type { StationKind } from '../../src/shared/types';

const T0 = Date.UTC(2026, 5, 1, 12, 0, 0);
const DAY_MOOD: Mood = { daypart: 'day', december: false, newYear: false, birthday: false, rain: false };
const LOCAL: LocalTime = { year: 2026, month: 6, day: 1, hour: 12, minute: 0 };
const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const still = (plays: Play[], extra: Partial<SurpriseView> = {}): SurpriseView => ({ plays, calendar: [], mood: DAY_MOOD, local: LOCAL, now: T0, still: true, touch: false, readOnly: false, click: () => {}, ...extra });
const play = (id: string, data?: Play['data']): Play => ({ id, startedAt: T0, until: T0 + 5000, seed: 7, held: true, data });
const poseOf = (html: string) => /data-cat-pose="(\w+)"/.exec(html)?.[1];

describe('surprises in the workshop scene', () => {
  it('the cat has its own hit area above every station', () => {
    const html = render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} surprises={still([])} />);
    expect(html).toContain('data-hit="cat"');
    expect(html).toContain('aria-label="Katze"');
    expect(html.lastIndexOf('data-hit="cat"')).toBeGreaterThan(html.lastIndexOf('data-station='));
  });

  it('petting shows purring hearts, five pets the swat', () => {
    const purr = render(<WorkshopScene state={newGame('p', 1, T0)} now={T0} onStation={() => {}} surprises={still([play('katze-streicheln')])} />);
    expect(purr).toContain('data-surprise="katze-streicheln"');
    expect(purr).toContain('class="hearts"');
    expect(poseOf(purr)).toBe('purr');
    const swat = render(<WorkshopScene state={newGame('p', 1, T0)} now={T0} onStation={() => {}} surprises={still([play('katze-beleidigt')])} />);
    expect(swat).toContain('data-surprise="katze-beleidigt"');
    expect(poseOf(swat)).toBe('swat');
    // a swat that starts while the purr is still playing wins
    const both = render(<WorkshopScene state={newGame('p', 1, T0)} now={T0} onStation={() => {}} surprises={still([play('katze-streicheln'), play('katze-beleidigt')])} />);
    expect(poseOf(both)).toBe('swat');
    expect(both).not.toContain('data-surprise="katze-streicheln"');
  });

  it('the cat sleeps exactly as before: asleep while work runs, awake when there is nothing to do', () => {
    const busy = mockWorkshop(T0);
    expect(busy.batches.length).toBeGreaterThan(0);
    expect(poseOf(render(<WorkshopScene state={busy} now={T0} onStation={() => {}} surprises={still([])} />))).toBe('sleep');
    const idle = newGame('p', 1, T0);
    idle.batches = [];
    expect(poseOf(render(<WorkshopScene state={idle} now={T0} onStation={() => {}} surprises={still([])} />))).toBe('awake');
  });

  it('[Review Focus 1] no surprise hit area except the cat’s covers a station', () => {
    const s = mockWorkshop(T0);
    expect(new Set(s.stations.map((st) => st.kind)).size).toBe(7);
    expect(Object.keys(HIT_RECTS)).toEqual(expect.arrayContaining(['cat', 'cabinet']));
    for (const [target, r] of Object.entries(HIT_RECTS)) for (const st of s.stations) if (target !== 'cat') expect(intersects(r!, stationRect(st.kind, st.slot)), `${target} vs ${st.kind}`).toBe(false);
    for (const r of Object.values(HIT_RECTS)) expect(r!.w >= 60 && r!.h >= 60).toBe(true);
  });

  it('[Review Focus 1] station boxes cover the full drawing: kiln chimney and smoke, the widest wheel bench with its workers', () => {
    const kiln = stationRect('kiln', 3);
    expect(kiln.y).toBeLessThanOrEqual(70); // rising smoke puffs above the chimney (chimney cap at y 136), measured with getBBox
    const wheel = stationRect('wheel', 1);
    // three bays: bench half-width 130 + tray 8; first worker stands 120 left of the centre (figure 100 wide)
    expect(wheel.x).toBeLessThanOrEqual(520 - 170);
    expect(wheel.x + wheel.w).toBeGreaterThanOrEqual(520 + 138);
    for (const kind of Object.keys(STATION_BOX) as StationKind[]) expect(STATION_BOX[kind].w).toBeGreaterThan(0);
  });

  it('the cat’s home spot is where the cat has always slept', () => {
    expect(catSpot([])).toEqual(SPOTS.catHome);
    expect(SPOTS.catHome).toEqual({ x: 760, y: 652 });
    expect(SPOTS.cabinet).toEqual({ x: 345, y: 300 });
  });

  it('[Review Focus 4] every surprise renders visibly in its still pose', () => {
    expect(SURPRISES.map((d) => d.id)).toEqual(expect.arrayContaining(['katze-streicheln', 'katze-beleidigt']));
    for (const d of SURPRISES.filter((d) => d.where !== 'village')) {
      const html = render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} surprises={still([play(d.id, { workerId: mockWorkshop(T0).workers[0].id })], { calendar: [d.id] })} />);
      expect(html, d.id).toContain(`data-surprise="${d.id}"`);
      expect(html).toContain('class="cat still"');
      expect(html).not.toMatch(/NaN|undefined/);
    }
  });

  it('[Review Focus 4] reduced motion with nothing playing still shows the normal sleeping cat', () => {
    const html = render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} surprises={still([])} />);
    expect(poseOf(html)).toBe('sleep');
    expect(html).toContain('class="zzz"');
  });

  it('[Review Focus 2] recording: once, never on visits', () => {
    const s = newGame('p', 1, T0); const sent = new Set<string>();
    expect(shouldRecord('katze-streicheln', s, false, sent)).toBe(true);
    sent.add('katze-streicheln');
    expect(shouldRecord('katze-streicheln', s, false, sent)).toBe(false);
    expect(shouldRecord('radio', s, true, new Set())).toBe(false);
    s.curiosities.radio = T0; expect(shouldRecord('radio', s, false, new Set())).toBe(false);
    expect(shouldRecord(null, s, false, new Set())).toBe(false);
  });

  it('the cat defs: a pet purrs, five pets within four seconds swat', () => {
    const pet = SURPRISES.find((d) => d.id === 'katze-streicheln')!;
    const swat = SURPRISES.find((d) => d.id === 'katze-beleidigt')!;
    expect(pet).toMatchObject({ where: 'workshop', trigger: { kind: 'click', target: 'cat' }, rarity: 'C', durationMs: 2500, album: ['katze-streicheln'] });
    expect(swat).toMatchObject({ where: 'workshop', trigger: { kind: 'click', target: 'cat', combo: { count: 5, withinMs: 4000 } }, rarity: 'C', durationMs: 2000, album: ['katze-beleidigt'] });
    for (const d of [pet, swat]) for (const a of d.album) expect(CURIOSITIES[a], a).toBeDefined();
  });

  it('both cat entries have their own album card art', () => {
    for (const id of ['katze-streicheln', 'katze-beleidigt']) {
      const Art = CARD_ART[id];
      expect(Art, id).toBeDefined();
      const html = render(<svg>{Art!()}</svg>);
      expect(html).toContain('data-cat-pose');
      expect(html).not.toMatch(/NaN|undefined/);
    }
  });

  it('a curiosity-only cabinet: sparkles for fresh finds at home, not once seen, never on visits; unknown ids do not count', () => {
    const s = newGame('p', 1, T0);
    s.curiosities = { 'katze-streicheln': T0 };
    const home = (albumSeen: number) => render(<WorkshopScene state={s} now={T0} onStation={() => {}} onCabinet={() => {}} albumSeen={albumSeen} surprises={still([])} />);
    expect(home(0)).toContain('cabinet-sparkle');
    expect(home(T0)).not.toContain('cabinet-sparkle');
    const visit = render(<WorkshopScene state={s} now={T0} surprises={still([], { readOnly: true })} />);
    expect(visit).toContain('data-hit="cabinet"');
    expect(visit).not.toContain('cabinet-sparkle');
    expect(visit).not.toContain('aria-label="Kuriositätenkabinett"');
    const odd = newGame('p', 1, T0);
    odd.curiosities = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`gibt-es-nicht-${i}`, T0 + 1]));
    const oddHtml = render(<WorkshopScene state={odd} now={T0} onStation={() => {}} albumSeen={0} surprises={still([])} />);
    expect(oddHtml).not.toContain('data-curio=');
    expect(oddHtml).not.toContain('cabinet-sparkle');
  });

  it('the cabinet is drawn above the stations, before the hit areas', () => {
    const html = render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} surprises={still([])} />);
    expect(html.indexOf('data-cabinet')).toBeGreaterThan(html.lastIndexOf('data-station='));
    expect(html.indexOf('data-cabinet')).toBeLessThan(html.lastIndexOf('data-hit="cat"'));
  });

  it('the scene renders under node without a surprises override (hook always runs, browserEnv guarded)', () => {
    const html = render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} />);
    expect(html).toContain('data-hit="cat"');
    expect(poseOf(html)).toBe('sleep');
  });
});

describe('December', () => {
  const DEC: Mood = { ...DAY_MOOD, december: true };
  const scene = (sx: SurpriseView) => render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} surprises={sx} />);

  it('December in the workshop: snow in the window, the little tree, the broom tidied away', () => {
    const html = scene(still([], { calendar: ['dezember'], mood: DEC }));
    expect(html).toContain('data-surprise="dezember"');
    expect(html).toContain('data-tree');
    expect(html).not.toContain('data-broom');
    expect((html.match(/class="flake"/g) ?? []).length).toBeGreaterThanOrEqual(14);
    expect(html).toContain('data-snowcap');
    expect(html).not.toMatch(/NaN|undefined/);
    const plain = scene(still([]));
    expect(plain).toContain('data-broom');
    expect(plain).not.toContain('data-tree');
    expect(plain).not.toContain('data-surprise="dezember"');
    expect(plain).not.toContain('class="flake"');
    expect(plain).not.toContain('data-snowcap');
  });

  it('snow falls inside the glass: clipped to the window, above the sky, below muntins, curtains and sill decor', () => {
    const s = mockWorkshop(T0);
    s.decorPlaced = ['porzellanvoegel', 'blumenkasten'];
    const html = render(<WorkshopScene state={s} now={T0} onStation={() => {}} surprises={still([], { calendar: ['dezember'], mood: DEC })} />);
    const at = (needle: string) => { const i = html.indexOf(needle); expect(i, needle).toBeGreaterThanOrEqual(0); return i; };
    const outside = at('clip-path="url(#window-clip)"');
    expect(at('id="window-clip"')).toBeLessThan(outside);
    expect(at('fill="var(--sky)"')).toBeLessThan(outside);
    expect(at('data-window-mullions')).toBeGreaterThan(outside);
    expect(at('fill="var(--curtain)"')).toBeGreaterThan(outside);
    expect(at('data-decor="porzellanvoegel"')).toBeGreaterThan(outside);
    expect(at('data-decor="blumenkasten"')).toBeGreaterThan(outside);
    expect(html.indexOf('class="flake"')).toBeGreaterThan(outside);
    expect(html.lastIndexOf('class="flake"')).toBeLessThan(html.indexOf('data-window-mullions'));
    const w = SPOTS.window;
    const clip = /id="window-clip"[^>]*>\s*<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/.exec(html);
    expect(clip?.slice(1).map(Number)).toEqual([w.x, w.y, w.w, w.h]);
    // the muntins are drawn without December too
    expect(scene(still([]))).toContain('data-window-mullions');
  });

  it('still snow: flakes keep their places without any falling loop', () => {
    const stillHtml = scene(still([], { calendar: ['dezember'], mood: DEC }));
    expect(stillHtml).toContain('class="snow still"');
    expect(stillHtml).not.toContain('snow-loop');
    const moving = scene(still([], { calendar: ['dezember'], mood: DEC, still: false }));
    expect((moving.match(/class="snow-loop/g) ?? []).length).toBe(2);
  });

  it('rain streaks fall in the window when the mood says rain', () => {
    expect(scene(still([], { mood: { ...DAY_MOOD, rain: true } }))).toContain('data-rain');
    expect(scene(still([]))).not.toContain('data-rain');
  });

  it('the tree stands clear of the shelf, the drying rack, the cabinet and the floor decor (kaolinbrocken, steinzeugtopf)', () => {
    expect(SPOTS.tree).toEqual({ x: 282, y: 488 });
    const s = mockWorkshop(T0);
    const shelf = s.stations.find((st) => st.kind === 'shelf')!, rack = s.stations.find((st) => st.kind === 'dryingRack')!;
    const blockers: [string, Rect][] = [
      ['shelf', stationRect('shelf', shelf.slot)], ['dryingRack', stationRect('dryingRack', rack.slot)], ['cabinet', HIT_RECTS.cabinet!],
      ['kaolinbrocken', { x: 326, y: 430, w: 43, h: 56 }], ['steinzeugtopf', { x: 836, y: 414, w: 60, h: 64 }], ['museumsplakat', { x: 324, y: 192, w: 60, h: 78 }],
    ];
    for (const box of TREE_BOXES(SPOTS.tree)) for (const [name, b] of blockers) expect(intersects(box, b), name).toBe(false);
    const html = scene(still([], { calendar: ['dezember'], mood: DEC }));
    // drawn behind the stations, like the broom it replaces
    expect(html.indexOf('data-tree')).toBeLessThan(html.indexOf('data-station='));
  });

  it('December in the village: the Christmas stall stands on the square only in December', () => {
    const v = mockVillage(10, ['tongrube', 'markthalle', 'gemeinschaftsofen']);
    const map = (mood?: Mood) => render(<VillageMap village={v} meId="p1" now={1_800_000_000_000} onHouse={() => {}} onBuilding={() => {}} mood={mood} />);
    const dec = map(DEC);
    expect(dec).toContain('data-xmas-stall');
    expect(dec).not.toMatch(/NaN|undefined/);
    expect(dec).not.toContain('role="button" data-xmas-stall');
    expect(map(DAY_MOOD)).not.toContain('data-xmas-stall');
    expect(map()).not.toContain('data-xmas-stall');
  });

  it('the Christmas stall clears every house, building, project site, the well, the notice board, the level decorations and the paths', () => {
    const r = xmasStallRect(VILLAGE_SPOTS.xmasStall);
    const blockers: [string, Rect][] = [];
    // a house: figure 112 left, yard prop up to 150 right, chimney smoke 172 up; its name sign below
    PLOTS.forEach((p, i) => {
      blockers.push([`house ${i}`, { x: p.x - 112, y: p.y - 172, w: 262, h: 198 }], [`sign ${i}`, { x: p.x - 98, y: p.y + 22, w: 104, h: 38 }]);
      blockers.push([`free plot ${i}`, { x: p.x - 74, y: p.y - 86, w: 148, h: 104 }]);
    });
    for (const [id, p] of Object.entries(BUILDING_SPOTS)) blockers.push([id, { x: p.x - 140, y: p.y - 200, w: 280, h: 250 }]);
    for (const [id, p] of Object.entries(PROJECT_SPOTS)) blockers.push([id, { x: p.x - 160, y: p.y - 260, w: 320, h: 320 }]);
    blockers.push(['well', { x: 654, y: 378, w: 92, h: 104 }], ['notice board', { x: 770, y: 366, w: 120, h: 160 }]);
    blockers.push(['blumenbeete', { x: 575, y: 380, w: 80, h: 45 }], ['blumenbeete', { x: 810, y: 526, w: 80, h: 45 }]);
    for (const [x, y] of [[520, 500], [630, 590], [770, 590], [900, 450]]) blockers.push(['laterne', { x: x - 8, y: y - 74, w: 30, h: 76 }]);
    blockers.push(['maibaum', { x: 520, y: 314, w: 72, h: 214 }], ['wimpel', { x: 550, y: 355, w: 286, h: 50 }]);
    blockers.push(['baenke', { x: 618, y: 500, w: 166, h: 42 }], ['rosenbogen', { x: 662, y: 546, w: 76, h: 96 }]);
    for (const [x, y, s] of [[40, 420, 1], [560, 620, 0.8], [880, 680, 0.75], [260, 110, 0.9], [700, 120, 0.7]]) blockers.push(['tree', { x: x - 40 * s, y: y - 104 * s, w: 80 * s, h: 114 * s }]);
    blockers.push(['sheep', { x: 575, y: 585, w: 50, h: 35 }], ['pond', { x: 925, y: 484, w: 120, h: 52 }]);
    for (const [name, b] of blockers) expect(intersects(r, b), name).toBe(false);
    // the lanes from the square to the six core plots (20 wide) and the main street (44 wide) stay free
    const lanes = PLOTS.slice(0, 6).map((p) => ({ a: { x: 700, y: 470 }, c: { x: (700 + p.x) / 2 + 30, y: (470 + p.y) / 2 + 20 }, b: { x: p.x, y: p.y + 10 }, half: 10 }));
    lanes.push({ a: { x: 700, y: 1150 }, c: { x: 690, y: 820 }, b: { x: 700, y: 560 }, half: 22 });
    for (const { a, c, b, half } of lanes) for (let t = 0; t <= 1; t += 0.01) {
      const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y;
      expect(intersects(r, { x: x - half, y: y - half, w: 2 * half, h: 2 * half }), `lane to ${b.x},${b.y} at t=${t.toFixed(2)}`).toBe(false);
    }
  });

  it('the dezember def: a rare calendar surprise in the window, all December', () => {
    const d = SURPRISES.find((x) => x.id === 'dezember')!;
    expect(d).toMatchObject({ where: 'window', trigger: { kind: 'calendar' }, rarity: 'R', album: ['dezember'] });
    const ctx = (mood: Mood) => ({ s: newGame('p', 1, T0), now: T0, local: LOCAL, mood, readOnly: false, touch: false, reducedMotion: false });
    expect(d.when!(ctx(DEC))).toBe(true);
    expect(d.when!(ctx(DAY_MOOD))).toBe(false);
    expect(CURIOSITIES.dezember).toBeDefined();
    const html = render(<svg>{CARD_ART.dezember!()}</svg>);
    expect(html).toContain('class="flake"');
    expect(html).toContain('data-tree');
    expect(html).not.toMatch(/NaN|undefined/);
  });
});

describe('browserEnv', () => {
  it('never throws when localStorage itself throws (getter, getItem and setItem)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    let env = browserEnv();
    expect(env.store.load()).toEqual({});
    expect(() => env.store.save({ a: 1 })).not.toThrow();
    expect(env.albumSeen.load()).toBe(0);
    expect(() => env.albumSeen.save(T0)).not.toThrow();
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: throwing });
    env = browserEnv();
    expect(env.store.load()).toEqual({});
    expect(() => env.store.save({ a: 1 })).not.toThrow();
    expect(env.albumSeen.load()).toBe(0);
    expect(() => env.albumSeen.save(T0)).not.toThrow();
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('works without matchMedia and document (node)', () => {
    const env = browserEnv();
    expect(env.touch()).toBe(false);
    expect(env.reducedMotion()).toBe(false);
    expect(env.visible()).toBe(true);
    expect(Number.isFinite(env.now())).toBe(true);
  });

  it('memoryStore keeps values in memory', () => {
    const m = memoryStore();
    expect(m.load()).toEqual({});
    m.save({ a: 1 });
    expect(m.load()).toEqual({ a: 1 });
  });

  it('dev flags: surprise, clock (local time), reduced, touch, rain, decor=all', () => {
    expect(readDevFlags('#scene')).toEqual({});
    const f = readDevFlags('#scene&surprise=katze-streicheln&clock=2026-12-24T18:30&reduced&touch&rain&decor=all');
    expect(f).toEqual({ force: 'katze-streicheln', clock: new Date(2026, 11, 24, 18, 30).getTime(), reduced: true, touch: true, rain: true, decorAll: true });
    expect(readDevFlags('#scene&clock=kaputt')).toEqual({});
  });
});

describe('Time of day', () => {
  const scene = (sx: SurpriseView, s = mockWorkshop(T0)) => render(<WorkshopScene state={s} now={T0} onStation={() => {}} surprises={sx} />);
  const NIGHT: Mood = { ...DAY_MOOD, daypart: 'night' };

  it('the scene carries the daypart as a mood class', () => {
    expect(scene(still([], { mood: NIGHT }))).toMatch(/<svg[^>]*class="scene mood-night"/);
    expect(scene(still([]))).toMatch(/<svg[^>]*class="scene mood-day"/);
    expect(scene(still([], { mood: { ...DAY_MOOD, daypart: 'evening' } }))).toMatch(/<svg[^>]*class="scene mood-evening"/);
  });

  it('evening light: a warm overlay over the room that never catches a click, under the stations', () => {
    const html = scene(still([], { calendar: ['abendlicht'], mood: { ...DAY_MOOD, daypart: 'evening' } }));
    const overlay = /<rect[^>]*data-surprise="abendlicht"[^>]*>/.exec(html)?.[0] ?? '';
    expect(overlay).toContain('fill="var(--sun)"');
    expect(overlay).toContain('pointer-events="none"');
    expect(html.indexOf('data-surprise="abendlicht"')).toBeLessThan(html.indexOf('data-station='));
    expect(scene(still([]))).not.toContain('data-surprise="abendlicht"');
  });

  it('night: moon and stars in the window, a soft dim over the room', () => {
    const html = scene(still([], { mood: NIGHT }));
    expect(html).toContain('data-moon');
    expect((html.match(/data-star/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toMatch(/<rect[^>]*data-night-dim[^>]*pointer-events="none"/);
    const day = scene(still([]));
    expect(day).not.toContain('data-moon');
    expect(day).not.toContain('data-night-dim');
  });

  it('the owl and the morning birds sit on the sill outside the glass, under the muntins', () => {
    for (const id of ['eule', 'morgenvoegel']) {
      const html = scene(still([play(id)], { mood: id === 'eule' ? NIGHT : { ...DAY_MOOD, daypart: 'morning' } }));
      const sill = html.indexOf('data-sill');
      expect(sill, id).toBeGreaterThan(html.indexOf('clip-path="url(#window-clip)"'));
      expect(html.indexOf(`data-surprise="${id}"`), id).toBeGreaterThan(sill);
      expect(html.indexOf(`data-surprise="${id}"`), id).toBeLessThan(html.indexOf('data-window-mullions'));
    }
    expect(scene(still([]))).not.toContain('data-surprise="eule"');
  });

  it('New Year fireworks burst in the window; still: two frozen bursts', () => {
    const html = scene(still([], { calendar: ['silvester'], mood: { ...NIGHT, newYear: true } }));
    const at = html.indexOf('data-surprise="silvester"');
    expect(at).toBeGreaterThan(html.indexOf('clip-path="url(#window-clip)"'));
    expect(at).toBeLessThan(html.indexOf('data-window-mullions'));
    expect((html.match(/data-burst/g) ?? []).length).toBe(2);
    const moving = scene(still([], { calendar: ['silvester'], mood: { ...NIGHT, newYear: true }, still: false }));
    expect((moving.match(/data-burst/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('the workshop birthday: a cake with one candle per year, a single number candle from six on', () => {
    const s = mockWorkshop(T0);
    const cake = (year: number, created: LocalTime) => scene(still([], { calendar: ['geburtstag'], mood: { ...DAY_MOOD, birthday: true }, local: { ...LOCAL, year }, created }), s);
    const opened = { ...LOCAL, year: 2023 };
    const three = cake(2026, opened);
    expect(three).toContain('data-surprise="geburtstag"');
    expect(three).toContain('Hurra!');
    expect((three.match(/data-candle/g) ?? []).length).toBe(3);
    const seven = cake(2030, opened);
    expect((seven.match(/data-candle/g) ?? []).length).toBe(1);
    expect(seven).toMatch(/data-candle[^>]*>[\s\S]*?>7<\/text>/);
    // a forced cake with no known opening still has one candle
    expect((scene(still([play('geburtstag')]), s).match(/data-candle/g) ?? []).length).toBe(1);
  });

  it('the cake stands at a free back-floor spot: clear of stations, idle workers, the cat, the tree, the cabinet and the floor decor', () => {
    const s = mockWorkshop(T0);
    const blockers: [string, Rect][] = s.stations.map((st) => [st.kind, stationRect(st.kind, st.slot)]);
    // idle workers: figure 100 wide, 150 tall above their spot, name tag below
    for (const [i, p] of [{ x: 640, y: 712 }, { x: 900, y: 712 }, { x: 340, y: 712 }].entries()) blockers.push([`idle ${i}`, { x: p.x - 50, y: p.y - 150, w: 100, h: 172 }]);
    blockers.push(['cat', HIT_RECTS.cat!], ['cabinet', HIT_RECTS.cabinet!], ...TREE_BOXES(SPOTS.tree).map((b): [string, Rect] => ['tree', b]));
    blockers.push(['vogelhaus', { x: 628, y: 274, w: 78, h: 86 }], ['steinzeugtopf', { x: 836, y: 414, w: 60, h: 64 }], ['kaolinbrocken', { x: 326, y: 430, w: 43, h: 56 }]);
    blockers.push(['blumenkasten', { x: 404, y: 266, w: 232, h: 40 }], ['window', { x: 392, y: 62, w: 256, h: 220 }], ['gluecksschwein', DECOR_BOXES.gluecksschwein], ['kerzenkranz', DECOR_BOXES.kerzenkranz]);
    for (const [name, b] of blockers) expect(intersects(CAKE_BOX(SPOTS.cake), b), name).toBe(false);
  });

  it('the new decor sits at free spots: clear of stations, workers, the cat, the window, pinboard, clock, sign and the other decor', () => {
    const s = mockWorkshop(T0);
    const blockers: [string, Rect][] = s.stations.map((st) => [st.kind, stationRect(st.kind, st.slot)]);
    for (const [i, p] of [{ x: 640, y: 712 }, { x: 900, y: 712 }, { x: 340, y: 712 }].entries()) blockers.push([`idle ${i}`, { x: p.x - 50, y: p.y - 150, w: 100, h: 172 }]);
    blockers.push(['cat', HIT_RECTS.cat!], ['cabinet', HIT_RECTS.cabinet!], ['cake', CAKE_BOX(SPOTS.cake)], ...TREE_BOXES(SPOTS.tree).map((b): [string, Rect] => ['tree', b]));
    blockers.push(['window', { x: 392, y: 62, w: 256, h: 220 }], ['pinboard', { x: 700, y: 90, w: 172, h: 172 }], ['clock', { x: 884, y: 94, w: 52, h: 52 }], ['tier sign', { x: 696, y: 272, w: 208, h: 78 }]);
    blockers.push(['wandteller', { x: 256, y: 76, w: 68, h: 68 }], ['museumsplakat', { x: 322, y: 190, w: 64, h: 82 }], ['ratssiegel', { x: 200, y: 78, w: 27, h: 74 }], ['hanging plant', { x: 318, y: 20, w: 44, h: 176 }]);
    blockers.push(['teppich-blau', { x: 24, y: 680, w: 232, h: 40 }], ['grosse-vase', { x: 900, y: 546, w: 60, h: 174 }], ['rug', { x: 360, y: 582, w: 442, h: 100 }]);
    blockers.push(['gift', { x: SPOTS.gift.x - 30, y: SPOTS.gift.y - 40, w: 60, h: 44 }]);
    for (const id of ['gluecksschwein', 'kerzenkranz', 'socke'] as const) {
      for (const [name, b] of blockers) expect(intersects(DECOR_BOXES[id], b), `${id} vs ${name}`).toBe(false);
    }
    expect(intersects(DECOR_BOXES.gluecksschwein, DECOR_BOXES.kerzenkranz)).toBe(false);
    expect(intersects(DECOR_BOXES.socke, DECOR_BOXES.kerzenkranz)).toBe(false);
    const html = render(<svg><DecorLayer placed={['gluecksschwein', 'kerzenkranz', 'socke']} /></svg>);
    expect(html).toContain('data-decor="socke"');
    expect(html).toContain('data-decor="gluecksschwein"');
    expect(html).toContain('data-decor="kerzenkranz"');
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it('the time-of-day defs and their album cards', () => {
    const def = (id: string) => SURPRISES.find((d) => d.id === id)!;
    expect(def('abendlicht')).toMatchObject({ where: 'workshop', trigger: { kind: 'calendar' }, rarity: 'C', album: ['abendlicht'] });
    expect(def('eule')).toMatchObject({ where: 'window', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 5 * 60_000, album: ['eule'] });
    expect(def('morgenvoegel')).toMatchObject({ where: 'window', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 3 * 60_000, album: ['morgenvoegel'] });
    expect(def('silvester')).toMatchObject({ where: 'window', trigger: { kind: 'calendar' }, rarity: 'L', album: ['silvester'] });
    expect(def('geburtstag')).toMatchObject({ where: 'workshop', trigger: { kind: 'calendar' }, rarity: 'L', album: ['geburtstag'] });
    const ctx = (mood: Partial<Mood>) => ({ s: newGame('p', 1, T0), now: T0, local: LOCAL, mood: { ...DAY_MOOD, ...mood }, readOnly: false, touch: false, reducedMotion: false });
    expect(def('abendlicht').when!(ctx({ daypart: 'evening' }))).toBe(true);
    expect(def('abendlicht').when!(ctx({ daypart: 'night' }))).toBe(false);
    expect(def('eule').when!(ctx({ daypart: 'night' }))).toBe(true);
    expect(def('eule').when!(ctx({ daypart: 'morning' }))).toBe(false);
    expect(def('morgenvoegel').when!(ctx({ daypart: 'morning' }))).toBe(true);
    expect(def('morgenvoegel').when!(ctx({ daypart: 'day' }))).toBe(false);
    expect(def('silvester').when!(ctx({ newYear: true }))).toBe(true);
    expect(def('silvester').when!(ctx({}))).toBe(false);
    expect(def('geburtstag').when!(ctx({ birthday: true }))).toBe(true);
    expect(def('geburtstag').when!(ctx({}))).toBe(false);
    for (const id of ['abendlicht', 'eule', 'morgenvoegel', 'silvester', 'geburtstag']) {
      expect(CURIOSITIES[id], id).toBeDefined();
      const Art = CARD_ART[id];
      expect(Art, id).toBeDefined();
      expect(render(<svg>{Art!()}</svg>), id).not.toMatch(/NaN|undefined/);
    }
  });
});

describe('The cat about the workshop', () => {
  const scene = (sx: SurpriseView, s = mockWorkshop(T0)) => render(<WorkshopScene state={s} now={T0} onStation={() => {}} surprises={sx} />);
  const IDS = ['katze-ofen', 'katze-topf', 'katze-geschenk', 'katze-schubs'];
  const running = (s: ReturnType<typeof mockWorkshop>, kind: StationKind) => {
    const st = s.stations.find((x) => x.kind === kind)!;
    s.batches = [{ id: 'b-test', designId: s.designs[0]!.id, count: 1, stage: kind === 'kiln' ? 'bisque' : 'form', stationId: st.id, startedAt: T0 - 1000, durationMs: 60_000, quality: 1 }];
    return s;
  };
  const ctx = (s: ReturnType<typeof mockWorkshop>) => ({ s, now: T0, local: LOCAL, mood: DAY_MOOD, readOnly: false, touch: false, reducedMotion: false });

  it('each cat play renders with its data-surprise, in a still pose', () => {
    for (const id of IDS) {
      const html = scene(still([play(id)]));
      expect(html, id).toContain(`data-surprise="${id}"`);
      expect(html, id).toContain('class="cat still"');
      expect(html, id).not.toMatch(/NaN|undefined/);
    }
  });

  it('katze-ofen: the cat naps on top of the kiln, drawn after it, and is not at home', () => {
    const html = scene(still([play('katze-ofen')]));
    expect(poseOf(html)).toBe('kiln');
    expect((html.match(/data-cat-pose=/g) ?? []).length).toBe(1);
    expect(html.indexOf('data-cat-pose="kiln"')).toBeGreaterThan(html.lastIndexOf('data-station="kiln"'));
    expect(catSpot([play('katze-ofen')])).toEqual(SPOTS.catKiln);
  });

  it('katze-topf: the cat’s hit area follows it to the pot on the wheel', () => {
    const at = catSpot([play('katze-topf')]);
    expect(at).toEqual(SPOTS.catPot);
    const html = scene(still([play('katze-topf')]));
    expect(poseOf(html)).toBe('pot');
    const hit = /<ellipse[^>]*cx="([\d.]+)" cy="([\d.]+)"[^>]*data-hit="cat"/.exec(html);
    expect(hit?.slice(1).map(Number)).toEqual([at.x + CAT_HITS.pot.dx, at.y + CAT_HITS.pot.dy]);
    expect(CAT_HITS.pot.dx).toBe(0);
  });

  it('the cat’s hit area on a station is only its own shape: smaller than at home, still at least 60×60', () => {
    const home = catHitRect([]);
    for (const id of ['katze-ofen', 'katze-topf']) {
      const r = catHitRect([play(id)]);
      expect(r.w >= 60 && r.h >= 60, id).toBe(true);
      expect(r.w * r.h, id).toBeLessThan(home.w * home.h);
    }
    // napping on the kiln: on the dome left of the chimney (x 1040–1080), above the door and the dial
    const k = catHitRect([play('katze-ofen')]);
    expect(k.x + k.w).toBeLessThanOrEqual(1040);
    expect(k.y + k.h).toBeLessThanOrEqual(250);
    // the actors that are not the cat never catch a click
    expect(scene(still([play('katze-schubs')]))).toMatch(/<g[^>]*data-surprise="katze-schubs"[^>]*pointer-events="none"/);
    expect(scene(still([play('katze-geschenk')]))).toMatch(/<g[^>]*data-gift[^>]*pointer-events="none"/);
    for (const id of IDS) expect(scene(still([play(id)])), id).toMatch(/<g[^>]*data-cat-pose="\w+"[^>]*pointer-events="none"/);
  });

  it('katze-geschenk: the first gift is always the sock, later the seed picks', () => {
    expect(GIFT_NAMES).toEqual(['Knopf', 'Feder', 'Socke']);
    const s = mockWorkshop(T0);
    delete s.curiosities['katze-geschenk'];
    expect(scene(still([play('katze-geschenk')]), s)).toContain('aria-label="Socke"');
    // recorded by this very play (the record arrives while it plays): still the sock
    s.curiosities['katze-geschenk'] = T0 + 2000;
    expect(scene(still([play('katze-geschenk')]), s)).toContain('aria-label="Socke"');
    // recorded long before: seed 7 → 7 % 3 = 1 → the feather
    s.curiosities['katze-geschenk'] = T0 - 86_400_000;
    const html = scene(still([play('katze-geschenk')]), s);
    expect(html).toContain('aria-label="Feder"');
    expect(poseOf(html)).toBe('gift');
    expect(catSpot([play('katze-geschenk')])).toEqual(SPOTS.gift);
  });

  it('katze-schubs: one worker catches the pot in pose catch; their usual figure is hidden', () => {
    const s = mockWorkshop(T0);
    const catcher = catcherOf(s)!;
    expect(catcher.id).toBe(s.workers.find((w) => !w.stationId)!.id);
    const html = scene(still([play('katze-schubs')]), s);
    expect((html.match(/data-pose="catch"/g) ?? []).length).toBe(1);
    expect(html).not.toContain(`data-worker="${catcher.id}"`);
    for (const w of s.workers.filter((w) => w.id !== catcher.id)) expect(html).toContain(`data-worker="${w.id}"`);
    expect(poseOf(html)).toBe('shelf');
    expect(catSpot([play('katze-schubs')])).toEqual(SPOTS.catShelf);
    // with everyone busy, the first worker comes over
    s.workers.forEach((w) => { w.stationId = s.stations[0]!.id; });
    expect(catcherOf(s)!.id).toBe(s.workers[0]!.id);
    const busy = scene(still([play('katze-schubs')]), s);
    expect(busy).not.toContain(`data-worker="${s.workers[0]!.id}"`);
    expect((busy.match(/data-pose="catch"/g) ?? []).length).toBe(1);
    // without the play everyone stands where they always do
    expect(scene(still([]))).not.toContain('data-pose="catch"');
  });

  it('the cat defs: ambient, in the workshop, with their conditions', () => {
    const def = (id: string) => SURPRISES.find((d) => d.id === id)!;
    expect(def('katze-ofen')).toMatchObject({ where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 4 * 60_000, album: ['katze-ofen'] });
    expect(def('katze-topf')).toMatchObject({ where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'R', durationMs: 90_000, album: ['katze-topf'] });
    expect(def('katze-geschenk')).toMatchObject({ where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'R', durationMs: 60_000, album: ['katze-geschenk'] });
    expect(def('katze-schubs')).toMatchObject({ where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'R', durationMs: 4000, album: ['katze-schubs'] });
    const kiln = running(mockWorkshop(T0), 'kiln');
    expect(def('katze-ofen').when!(ctx(kiln))).toBe(true);
    expect(def('katze-topf').when!(ctx(kiln))).toBe(false);
    const wheel = running(mockWorkshop(T0), 'wheel');
    expect(def('katze-topf').when!(ctx(wheel))).toBe(true);
    expect(def('katze-ofen').when!(ctx(wheel))).toBe(false);
    const empty = mockWorkshop(T0);
    expect(def('katze-schubs').when!(ctx(empty))).toBe(true);
    empty.goods = [];
    expect(def('katze-schubs').when!(ctx(empty))).toBe(false);
    const alone = mockWorkshop(T0);
    alone.workers = [];
    expect(def('katze-schubs').when!(ctx(alone))).toBe(false);
    expect(def('katze-geschenk').when).toBeUndefined();
    for (const id of IDS) {
      expect(CURIOSITIES[id], id).toBeDefined();
      const Art = CARD_ART[id];
      expect(Art, id).toBeDefined();
      const html = render(<svg>{Art!()}</svg>);
      expect(html, id).toContain('data-cat-pose');
      expect(html, id).not.toMatch(/NaN|undefined/);
    }
  });
});
