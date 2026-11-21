import { describe, expect, it } from 'vitest';
import { applyAction } from '../../../src/shared/actions';
import { collectionKey } from '../../../src/shared/collection';
import { bodyOf } from '../../../src/shared/content';
import { MASTERWORK_MATERIAL_PIECES, MASTERWORK_QUALITY_BONUS, PRESTIGE_MUL } from '../../../src/shared/masterwork';
import { batchMaterials, batchQuality, productionWorkers, qualityTier } from '../../../src/shared/production';
import type { Commission, GameState } from '../../../src/shared/types';
import { applyDelta, applyDeltaOnce } from '../../../src/shared/village/apply';
import { GREAT_KILN_CAPACITY, KILN_QUALITY_BONUS, rollKilnEffect, tickGreatKiln } from '../../../src/shared/village/kiln';
import { validateVillageAction } from '../../../src/shared/village/state';
import { tickVillage } from '../../../src/shared/village/tick';
import type { VillageState } from '../../../src/shared/village/types';
import { T0, runAction, setTier, village } from './helpers';

const COMMISSION: Commission = {
  id: 'c1', patronSeed: 3, patronName: 'Gräfin Mohnblüte', patronJob: 'Gräfin', criteria: [{ kind: 'effect', effect: 'ascheglasur' }],
  costTaler: 3000, rewardTaler: 10000, rewardRuf: 30,
};

/** A village with a great kiln; Anna (p1) is at the Manufaktur with a patron waiting. */
function masterworkVillage() {
  const { v, ws } = village(3);
  setTier(v, ws, 'p1', 'manufaktur');
  tickVillage(v, T0);
  for (const id of Object.keys(ws)) { ws[id].taler = 100_000; ws[id].materials = { ton: 500, glasurbasis: 100, holz: 500 }; }
  ws.p1.unlocks.push('meisterstuecke');
  ws.p1.commission = structuredClone(COMMISSION);
  return { v, ws };
}

const loadMw = (v: VillageState, ws: Record<string, GameState>, wood = 6, designId = ws.p1.designs[0].id) =>
  runAction(v, ws, 'p1', { type: 'loadKilnMasterwork', designId, wood });

/** An rng state whose next masterwork roll at full heat gives the wanted effect. */
function rngFor(effect: string): number {
  for (let r = 1; r < 100_000; r++) if (rollKilnEffect(r, 1, true)[0] === effect) return r;
  throw new Error('no seed');
}

describe('masterworks in the great kiln', () => {
  it('loading a masterwork pays the fee, materials and wood, and blocks a second masterwork and swapping', () => {
    const { v, ws } = masterworkVillage();
    const design = ws.p1.designs[0];
    const need = batchMaterials(ws.p1, design, MASTERWORK_MATERIAL_PIECES);
    const r = loadMw(v, ws, 5);
    expect(r.error).toBeNull();
    expect(r.events).toEqual(['Dein Meisterstück steht im Gemeinschaftsofen – das Feuer entscheidet mit.']);
    const a = r.ws.p1;
    expect(a.taler).toBe(100_000 - COMMISSION.costTaler);
    expect(a.materials.ton).toBe(500 - need.ton);
    expect(a.materials.glasurbasis).toBe(100 - (need.glasurbasis ?? 0));
    expect(a.materials.holz).toBe(500 - (need.holz ?? 0) - 5);
    expect(a.kilnMasterwork).toEqual({ designId: design.id, firingId: r.v.greatKiln.firingId });
    expect(a.batches.some((b) => b.masterwork)).toBe(false);
    const l = r.v.greatKiln.loads[0];
    expect(l).toMatchObject({ playerId: 'p1', count: 1, wood: 5, masterwork: true });
    expect(l.qualityScore).toBe(batchQuality(a, design, productionWorkers(a)) + MASTERWORK_QUALITY_BONUS);
    expect(r.v.greatKiln.firesAt).not.toBeNull();
    // one masterwork at a time, and the patron stays
    const start = applyAction(a, { type: 'startMasterwork', designId: design.id }, T0 + 2000);
    expect(start.ok ? '' : start.error).toBe('Es entsteht schon ein Meisterstück');
    const swap = applyAction(a, { type: 'swapCommission' }, T0 + 2000);
    expect(swap.ok ? '' : swap.error).toBe('Während ein Meisterstück entsteht, bleibt der Auftrag');
    expect(loadMw(r.v, r.ws).error).toBe('Es entsteht schon ein Meisterstück');
  });

  it('checks the design, the wood and the room', () => {
    const { v, ws } = masterworkVillage();
    expect(validateVillageAction(v, 'p1', { type: 'loadKilnMasterwork', designId: 5 as never, wood: 4 })).toBe('Unbekannter Entwurf');
    expect(validateVillageAction(v, 'p1', { type: 'loadKilnMasterwork', designId: 'd', wood: 1 })).toBe('Ein Meisterstück braucht 2 bis 6 Holz');
    expect(validateVillageAction(v, 'p1', { type: 'loadKilnMasterwork', designId: 'd', wood: 7 })).toBe('Ein Meisterstück braucht 2 bis 6 Holz');
    expect(validateVillageAction(v, 'p1', { type: 'loadKilnMasterwork', designId: 'd', wood: 2.5 })).toBe('Ein Meisterstück braucht 2 bis 6 Holz');
    expect(validateVillageAction(v, 'p1', { type: 'loadKilnMasterwork', designId: 'd', wood: 2 })).toBeNull();
    expect(loadMw(v, ws, 4, 'nope').error).toBe('Diesen Entwurf gibt es nicht');
    ws.p1.designs.push({ ...structuredClone(ws.p2.designs[0]), id: 'f:x', origin: { playerName: 'Ben', makerMark: ws.p2.makerMark, glazeColor: '#fff' } });
    expect(loadMw(v, ws, 4, 'f:x').error).toBe('Geschenkte Stücke kannst du nicht nachmachen');
    const noPatron = structuredClone(ws); noPatron.p1.commission = null;
    expect(loadMw(v, noPatron).error).toBe('Gerade wartet kein Gönner');
    const full = structuredClone(v);
    full.greatKiln.loads.push({ ...structuredClone(full.greatKiln.loads[0] ?? { playerId: 'p1', design: ws.p1.designs[0], glazeColor: '#fff', count: 20, wood: 40, qualityScore: 50, makerName: 'Anna', makerMark: ws.p1.makerMark }) });
    expect(loadMw(full, ws).error).toBe('Dein Platz im Ofen reicht noch für 0 Stück');
    const burning = structuredClone(v); burning.greatKiln.doneAt = T0 + 5000;
    expect(loadMw(burning, ws).error).toBe('Der Ofen brennt gerade – danach kannst du wieder einräumen');
    expect(GREAT_KILN_CAPACITY).toBe(60);
  });

  it('when the kiln cools, the masterwork is judged with its kiln effect and recorded once', () => {
    const { v: v0, ws: ws0 } = masterworkVillage();
    let { v, ws } = loadMw(v0, ws0);
    ({ v, ws } = runAction(v, ws, 'p2', { type: 'loadKiln', designId: ws.p2.designs[0].id, count: 3, wood: 6 }));
    const quality = v.greatKiln.loads[0].qualityScore;
    const doneAt = T0 + 10_000;
    v.greatKiln.doneAt = doneAt;
    v.greatKiln.heat = 1;
    v.rng = rngFor('ascheglasur');
    const deliveries = tickGreatKiln(v, doneAt);
    // the kiln is empty again and the masterwork was not lost with it
    expect(v.greatKiln.loads).toEqual([]);
    expect(deliveries.filter((d) => d.to === 'p2').flatMap((d) => d.delta.kilnGoods ?? []).reduce((n, x) => n + x.count, 0)).toBe(3);
    const mw = deliveries.filter((d) => d.delta.kilnMasterwork);
    expect(mw).toHaveLength(1);
    expect(mw[0].to).toBe('p1');
    expect(mw[0].delta.kilnMasterwork).toMatchObject({ qualityScore: Math.min(100, quality + 20), effect: 'ascheglasur', at: doneAt });
    expect(mw[0].delta.kilnMasterwork!.design.id).toBe(ws.p1.designs[0].id);
    expect(KILN_QUALITY_BONUS).toBe(20);

    const before = ws.p1;
    const after = applyDeltaOnce(before, 'op:1', mw[0].delta)!;
    expect(after.masterworks).toHaveLength(before.masterworks.length + 1);
    const rec = after.masterworks.at(-1)!;
    const prestige = qualityTier(Math.min(100, quality + 20)) === 3 ? 'gold' : qualityTier(Math.min(100, quality + 20)) === 2 ? 'silver' : 'bronze';
    expect(rec).toMatchObject({ effect: 'ascheglasur', met: 1, total: 1, commissionId: 'c1', patronName: 'Gräfin Mohnblüte', finishedAt: doneAt, prestige });
    expect(rec.reward).toEqual({ taler: Math.round(10000 * PRESTIGE_MUL[prestige]), ruf: Math.round(30 * PRESTIGE_MUL[prestige]) });
    expect(after.taler).toBe(before.taler + rec.reward!.taler);
    expect(after.ruf).toBe(before.ruf + rec.reward!.ruf);
    expect(after.kilnMasterwork).toBeNull();
    expect(after.collection).toContain(collectionKey(rec.design.form, bodyOf(rec.design), 'ascheglasur'));
    expect(after.commission!.id).not.toBe('c1');
    // the outbox may retry: it is recorded only once
    expect(applyDeltaOnce(after, 'op:1', mw[0].delta)).toBeNull();
    // and with no wish for a kiln effect, a plain fire keeps the glaze's own effect
    const plain = applyDelta(before, { kilnMasterwork: { ...mw[0].delta.kilnMasterwork!, effect: null } });
    expect(plain.masterworks.at(-1)).toMatchObject({ effect: null, met: 0, total: 1 });
  });

  it('a masterwork whose design was deleted meanwhile is still recorded from the fired design', () => {
    const { v: v0, ws: ws0 } = masterworkVillage();
    const { v, ws } = loadMw(v0, ws0);
    v.greatKiln.doneAt = T0 + 10_000;
    v.greatKiln.heat = 0.5;
    const d = tickGreatKiln(v, T0 + 10_000).find((x) => x.delta.kilnMasterwork)!;
    const s = structuredClone(ws.p1);
    const name = s.designs[0].name;
    s.designs = s.designs.slice(1);
    const after = applyDelta(s, d.delta);
    expect(after.masterworks.at(-1)!.design.name).toBe(name);
    expect(after.kilnMasterwork).toBeNull();
  });
});
