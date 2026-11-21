import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { WorkshopScene } from '../../src/client/art/workshop/WorkshopScene';
import { mockWorkshop } from '../../src/client/dev/ScenePage';
import { browserEnv, memoryStore, readDevFlags } from '../../src/client/surprises/env';
import { SURPRISES } from '../../src/client/surprises/defs';
import { HIT_RECTS, SPOTS, TREE_BOXES, VILLAGE_SPOTS, catSpot, stationRect, xmasStallRect, type Rect } from '../../src/client/surprises/spots';
import { BUILDING_SPOTS, PLOTS, PROJECT_SPOTS, VillageMap } from '../../src/client/art/village/VillageMap';
import { mockVillage } from '../../src/client/dev/mockVillage';
import type { LocalTime, Mood, Play, SurpriseView } from '../../src/client/surprises/types';
import { shouldRecord } from '../../src/client/surprises/useSurprises';
import { CARD_ART } from '../../src/client/art/surprises/cards';
import { STATION_BOX } from '../../src/client/art/workshop/stations/Stations';
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
