import type { Design, Prestige } from '../../shared/types';
import { ensureJointOrders } from '../../shared/village/joint';
import { KILN_FIRING_MS, KILN_WAIT_MS } from '../../shared/village/kilnRules';
import { instantiateStage, PROJECTS } from '../../shared/village/projects';
import { addMember, newVillage } from '../../shared/village/state';
import type { MuseumPiece, VillageState, VillageView } from '../../shared/village/types';

const NAMES = ['Anna', 'Ben', 'Cleo', 'Dora', 'Emil', 'Fiete', 'Greta', 'Hanno', 'Ida', 'Jule'];
const COLORS = ['#b44c36', '#4f7fc4', '#7fb85c', '#9a7ccf', '#e9708d', '#f2b84b', '#4f9cc4', '#c8784c', '#55708c', '#d9674c'];
const T0 = 1_800_000_000_000;

export interface MockVillageOpts {
  /** village level (completed joint orders + project stages) */
  level?: number;
  kiln?: 'empty' | 'loading' | 'firing';
  project?: { id: string; level: 1 | 2 | 3; stage: number };
  /** highest completed level per project */
  levels?: Record<string, number>;
  offered?: string[];
  /** share of every active-stage part each player has given, e.g. { p1: 0.2, p2: 0.3 } */
  contributions?: Record<string, number>;
  /** a report of the kiln's previous firing */
  lastFiring?: boolean;
  /** masterworks per member in the museum (cycled), e.g. [1, 3, 0, 2] */
  museum?: number[];
}

const KILN_DESIGN: Design = { id: 'dk1', name: 'Ofenbecher', form: 'becher', profile: { height: 0.5, belly: 0.5, neck: 0.5, foot: 0.5, rim: 0.5 }, handle: 'round', rim: 'plain', glazeId: 'g1', pattern: 'none', patternColor: '#fff8ec', body: 'steinzeug' };

const MUSEUM_LOOKS: { name: string; form: string; body: Design['body']; color: string; effect: string | null; prestige: Prestige; height: number; belly: number }[] = [
  { name: 'Mondvase', form: 'vase', body: 'porzellan', color: '#9fc3e6', effect: null, prestige: 'gold', height: 0.85, belly: 0.6 },
  { name: 'Aschekrug', form: 'krug', body: 'steinzeug', color: '#8d7a5c', effect: 'ascheglasur', prestige: 'silver', height: 0.6, belly: 0.7 },
  { name: 'Teekanne Rosa', form: 'teekanne', body: 'steinzeug', color: '#e9a0b4', effect: null, prestige: 'bronze', height: 0.5, belly: 0.75 },
  { name: 'Feuerschale', form: 'schale', body: 'steinzeug', color: '#c8784c', effect: 'flammenspur', prestige: 'silver', height: 0.3, belly: 0.5 },
  { name: 'Kobaltbecher', form: 'becher', body: 'irdenware', color: '#2a4f9a', effect: null, prestige: 'bronze', height: 0.55, belly: 0.4 },
];

function museumPiece(owner: number, i: number, at: number): MuseumPiece {
  const l = MUSEUM_LOOKS[(owner + i) % MUSEUM_LOOKS.length];
  const design: Design = { ...KILN_DESIGN, id: `mwd${owner}-${i}`, name: l.name, form: l.form, body: l.body, profile: { ...KILN_DESIGN.profile, height: l.height, belly: l.belly } };
  return { id: `mw${owner}-${i}`, design, glazeColor: l.color, effect: l.effect, quality: l.prestige === 'gold' ? 3 : 2, prestige: l.prestige, patronName: 'Gräfin Adelheid', finishedAt: at - (i + 1) * 86_400_000 };
}

/** A believable village for dev pages and tests. */
export function mockVillage(n: number, buildings: string[], now = T0, opts: MockVillageOpts = {}): VillageView {
  let v: VillageState = newVillage('dev', 'Tonhausen', 42);
  for (let i = 0; i < n; i++) {
    const r = addMember(v, { playerId: `p${i + 1}`, name: NAMES[i], avatarSeed: 1000 + i * 7919, makerMark: { shape: (['heart', 'star', 'leaf', 'circle'] as const)[i % 4], letter: NAMES[i][0], color: COLORS[i] }, joinedAt: now - 86_400_000, lastSeen: now - (i % 3) * 3_600_000 });
    if (typeof r !== 'string') v = r;
  }
  v.buildings = buildings;
  v.completedJoint = buildings.length * 2 + 1;
  ensureJointOrders(v, now);
  v.offers = n > 1 ? [{ id: 'o1', from: 'p2', give: { kind: 'material', material: 'kobalt', count: 10 }, want: { kind: 'material', material: 'holz', count: 30 }, createdAt: now }] : [];
  v.requests = n > 2 ? [{ id: 'r1', from: 'p3', material: 'holz', count: 20, createdAt: now }] : [];
  if (opts.level !== undefined) {
    v.completedJoint = Math.min(v.completedJoint, opts.level);
    v.stagesDone = opts.level - v.completedJoint;
  }
  if (opts.kiln && opts.kiln !== 'empty') {
    v.greatKiln.loads = v.members.slice(0, 3).map((m, i) => ({ playerId: m.playerId, design: KILN_DESIGN, glazeColor: ['#4f9cc4', '#e9708d', '#7fb85c'][i], count: 8 + i * 4, wood: (8 + i * 4) * 4, qualityScore: 60, makerName: m.name, makerMark: m.makerMark }));
    if (opts.kiln === 'firing') {
      v.greatKiln.firesAt = now - KILN_FIRING_MS / 2;
      v.greatKiln.doneAt = v.greatKiln.firesAt + KILN_FIRING_MS;
      v.greatKiln.heat = 0.6;
    } else v.greatKiln.firesAt = now + KILN_WAIT_MS / 2;
  }
  v.projects.levels = { ...opts.levels };
  v.projects.offered = opts.offered ?? [];
  if (opts.project && PROJECTS[opts.project.id]) {
    const { id, level, stage } = opts.project;
    v.projects.active = { projectId: id, level, stage, parts: instantiateStage(PROJECTS[id], level, stage, Math.max(2, n)), startedAt: now - 86_400_000, stageStartedAt: now - 3_600_000 };
  }
  if (opts.contributions && v.projects.active) {
    for (const p of v.projects.active.parts) {
      const size = p.kind === 'taler' ? p.amount : p.count;
      for (const [id, f] of Object.entries(opts.contributions)) {
        const n = p.kind === 'taler' ? Math.round((size * f) / 1000) * 1000 : Math.floor(size * f);
        if (n > 0) { p.by[id] = n; p.filled += n; }
      }
    }
  }
  if (opts.lastFiring && v.members.length) {
    const m = v.members[1] ?? v.members[0];
    v.lastFiring = { firingId: 'k0', at: now - 5 * 3_600_000, heat: 0.75, contributors: v.members.slice(0, 3).map((x) => x.playerId), pieces: 48, best: { playerId: m.playerId, designName: 'Aschekrug', form: 'krug', effect: 'ascheglasur', quality: 3 } };
  }
  if (opts.museum) {
    const counts = opts.museum;
    v.museum = Object.fromEntries(v.members.map((m, i) => [m.playerId, Array.from({ length: counts[i % counts.length] }, (_, k) => museumPiece(i, k, now))]));
  }
  v.guestbooks = { p1: [{ from: 'p2', fromName: 'Ben', sticker: 'herz', at: now - 600_000 }] };
  const { helpsGiven: _h, rng: _r, nextId: _n, helpBoostUntil: _b, ...rest } = v;
  return { ...rest, helpsLeft: Object.fromEntries(v.members.map((m) => [m.playerId, 3])) };
}

/** Dev presets for `#game&vmock=<name>` (see GamePage). */
export function vmockPreset(name: string, now: number): VillageView | null {
  const all = ['tongrube', 'markthalle', 'glasurbibliothek', 'gildenhaus', 'gemeinschaftsofen'];
  switch (name) {
    case 'project': return mockVillage(4, all, now, { level: 14, project: { id: 'rathaus', level: 1, stage: 2 }, contributions: { p1: 0.15, p2: 0.3, p3: 0.1 }, levels: { glockenturm: 1, museum: 1 }, lastFiring: true });
    case 'offers': return mockVillage(4, all, now, { level: 9, offered: ['glockenturm', 'museum'] });
    case 'kiln': return mockVillage(4, all, now, { level: 9, kiln: 'loading', lastFiring: true, offered: ['glockenturm', 'museum'] });
    case 'firing': return mockVillage(4, all, now, { level: 9, kiln: 'firing', lastFiring: true });
    case 'museum': return mockVillage(4, all, now, { level: 20, levels: { museum: 1, glockenturm: 2 }, museum: [2, 1, 3, 1], offered: ['rathaus', 'dorfbrunnen'] });
    case 'done': return mockVillage(4, all, now, { level: 30, levels: { glockenturm: 3, museum: 3, rathaus: 3, dorfbrunnen: 3, kaolingrube: 3 } });
    default: return null;
  }
}
