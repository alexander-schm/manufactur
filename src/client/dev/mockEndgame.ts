import { collectionEntries, recordCollection } from '../../shared/collection';
import { BODIES } from '../../shared/content';
import { discoveredEffects, glazeColor } from '../../shared/discovery';
import { generateCommission } from '../../shared/masterwork';
import { MILESTONES } from '../../shared/progression';
import type { Batch, Design, GameState, MasterworkRecord, Prestige, StationKind, Tier } from '../../shared/types';
import { mockWorkshop } from './ScenePage';

const MIN = 60_000;
export const ENDGAME_DECOR = ['steinzeugtopf', 'glasurproben', 'papierlampions', 'meisterbrief'];

/** Dev state for a player deep into the Manufaktur: bays, stoneware, masterworks, collection and the new decor. */
export function mockEndgame(now: number, tier: Tier = 'manufaktur'): GameState {
  const s = mockWorkshop(now);
  s.tier = tier;
  s.ruf = 420;
  s.taler = 80000;
  for (const st of s.stations) {
    if (st.kind === 'kiln') st.level = 7;
    else if (st.kind === 'prepBench' || st.kind === 'wheel' || st.kind === 'glazeTable' || st.kind === 'dryingRack') st.level = 6;
  }

  const clear = structuredClone(BODIES.steinzeug.starterGlaze!);
  const oil = { id: 'g93', name: 'Ölfleck', base: 'opak' as const, colorant: 'eisenoxid', colorantPct: 8, firing: { temp: 'hoch' as const, atmosphere: 'oxidierend' as const, cooling: 'langsam' as const }, color: '', effect: 'oelfleck', body: 'steinzeug' as const };
  oil.color = glazeColor(oil);
  s.glazes.push(clear, oil);
  const teapot: Design = { id: 'd93', name: 'Ölfleckkanne', form: 'teekanne', profile: { height: 0.55, belly: 0.75, neck: 0.4, foot: 0.45, rim: 0.45 }, handle: 'round', rim: 'plain', glazeId: 'g93', pattern: 'none', patternColor: '#fff8ec', body: 'steinzeug' };
  const vase: Design = { id: 'd94', name: 'Graue Vase', form: 'vase', profile: { height: 0.85, belly: 0.55, neck: 0.3, foot: 0.4, rim: 0.5 }, handle: 'none', rim: 'flared', glazeId: clear.id, pattern: 'ranken', patternColor: '#3f5e8c', body: 'steinzeug' };
  s.designs.push(teapot, vase);
  s.unlocks.push('steinzeug', 'teekanne', 'meisterstuecke', 'vase', 'muster-ranken');

  const at = (kind: StationKind) => s.stations.find((x) => x.kind === kind)!.id;
  const batch = (id: string, designId: string, count: number, stage: Batch['stage'], kind: StationKind, ago: number, dur: number, masterwork = false): Batch =>
    ({ id, designId, count, stage, stationId: at(kind), startedAt: now - ago * MIN, durationMs: dur * MIN, quality: 72, ...(masterwork ? { masterwork } : {}) });
  s.batches = [
    batch('b901', 'd94', 8, 'form', 'wheel', 3, 12),
    batch('b902', 'd90', 12, 'form', 'wheel', 1, 10),
    batch('b903', 'd93', 1, 'glaze', 'glazeTable', 2, 20, true),
    batch('b904', 'd91', 10, 'dry', 'dryingRack', 2, 15),
    batch('b905', 'd92', 24, 'glazeFire', 'kiln', 4, 18),
    // second bays in use, so every station shows its side-by-side layout
    batch('b906', 'd94', 6, 'prepare', 'prepBench', 1, 9),
    batch('b907', 'd91', 10, 'glaze', 'glazeTable', 3, 12),
    batch('b908', 'd90', 6, 'prepare', 'prepBench', 4, 9),
  ];

  const record = (id: string, d: Design, prestige: Prestige, quality: 1 | 2 | 3, met: number, ago: number): MasterworkRecord => {
    const g = s.glazes.find((x) => x.id === d.glazeId);
    return { id, commissionId: `c${id}`, patronName: 'Gräfin Adelheid', design: structuredClone(d), glazeColor: g?.color ?? '#d3c7b4', effect: g?.effect ?? null, quality, met, total: 3, prestige, finishedAt: now - ago * MIN, acked: true };
  };
  s.masterworks = [
    record('mw1', s.designs.find((d) => d.id === 'd90')!, 'bronze', 2, 2, 3000),
    record('mw2', vase, 'silver', 3, 2, 1500),
    record('mw3', teapot, 'gold', 3, 3, 200),
  ];
  s.commission = generateCommission(s);
  // the collection only holds what this player could have made: every irdenware piece in a discovered effect
  // (so the "ohne" and Craquelé columns are complete and wear their ribbons), a few stoneware pieces
  s.collection = [];
  s.collectionRewards = [];
  const known = discoveredEffects(s);
  for (const e of collectionEntries()) {
    const made = e.body === 'irdenware' ? e.effect === null || known.includes(e.effect) : (e.effect === null && e.form !== 'teller') || (e.form === 'teekanne' && e.effect === 'oelfleck');
    if (made) recordCollection(s, e.form, e.body, e.effect);
  }
  s.decor = [...new Set([...s.decor, ...ENDGAME_DECOR])];
  s.decorPlaced = [...ENDGAME_DECOR];
  s.keepStock = { ton: 500 };

  // every milestone that holds is done and acknowledged, so no celebration card covers the scene
  const held = MILESTONES.filter((m) => m.done(s));
  for (const m of held) for (const u of m.unlocks) if (!s.unlocks.includes(u)) s.unlocks.push(u);
  s.milestonesDone = held.map((m) => m.id);
  s.milestonesAcked = [...s.milestonesDone];
  return s;
}
