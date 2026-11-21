import type { Design } from '../../shared/types';
import { ensureJointOrders } from '../../shared/village/joint';
import { KILN_FIRING_MS, KILN_WAIT_MS } from '../../shared/village/kilnRules';
import { instantiateStage, PROJECTS } from '../../shared/village/projects';
import { addMember, newVillage } from '../../shared/village/state';
import type { VillageState, VillageView } from '../../shared/village/types';

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
}

const KILN_DESIGN: Design = { id: 'dk1', name: 'Ofenbecher', form: 'becher', profile: { height: 0.5, belly: 0.5, neck: 0.5, foot: 0.5, rim: 0.5 }, handle: 'round', rim: 'plain', glazeId: 'g1', pattern: 'none', patternColor: '#fff8ec', body: 'steinzeug' };

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
    v.greatKiln.loads = v.members.slice(0, 3).map((m, i) => ({ playerId: m.playerId, design: KILN_DESIGN, glazeColor: ['#4f9cc4', '#e9708d', '#7fb85c'][i], count: 8 + i * 4, wood: 4, qualityScore: 60, makerName: m.name, makerMark: m.makerMark }));
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
  v.guestbooks = { p1: [{ from: 'p2', fromName: 'Ben', sticker: 'herz', at: now - 600_000 }] };
  const { helpsGiven: _h, rng: _r, nextId: _n, helpBoostUntil: _b, ...rest } = v;
  return { ...rest, helpsLeft: Object.fromEntries(v.members.map((m) => [m.playerId, 3])) };
}
