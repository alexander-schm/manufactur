import { MATERIALS, own } from '../content';
import { fmtTaler } from '../format';
import { PRESTIGE_NAME, PRESTIGE_RANK } from '../masterwork';
import type { GameState } from '../types';
import { SUBSTITUTE_FACTOR, takeGoods } from './goods';
import { BASE_SHARE } from './joint';
import { noteLevelUp, villageLevel } from './level';
import { PROJECTS, ROMAN, ensureProjectOffers, instantiateStage, isStageComplete, maxProjectUnits, partSize, stageReward, stageShares } from './projects';
import { villageStorePrice } from './specialties';
import { activeMembers, addNews } from './state';
import type { ActivePart, ActiveProject, Delivery, Member, VillageAction, VillageState } from './types';

type ContributeProject = Extract<VillageAction, { type: 'contributeProject' }>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The project this contribution goes to; the first contribution picks it from the offers. */
function activeFor(v: VillageState, me: Member, projectId: string, now: number): ActiveProject | string {
  const pr = v.projects;
  if (pr.active) return pr.active.projectId === projectId ? pr.active : `Das Dorf baut gerade schon: ${PROJECTS[pr.active.projectId].name}`;
  const def = PROJECTS[projectId];
  if (!def || !pr.offered.includes(projectId)) return 'Dieses Projekt steht gerade nicht zur Wahl';
  const level = ((pr.levels[projectId] ?? 0) + 1) as 1 | 2 | 3;
  pr.active = { projectId, level, stage: 0, parts: instantiateStage(def, level, 0, activeMembers(v, now).length), startedAt: now, stageStartedAt: now };
  pr.offered = [];
  addNews(v, `${me.name} hat den ersten Stein gelegt: Das Dorf baut jetzt ${def.name} ${ROMAN[level - 1]}!`, null, now);
  return pr.active;
}

/** Units this request would add to the part (earthenware substitutes count three pieces per unit). */
const unitsOf = (p: ActivePart, a: ContributeProject): number =>
  p.kind === 'goods' && a.source === 'substitute' ? Math.floor(a.count / SUBSTITUTE_FACTOR) : a.count;

/** Errors that need no stock: the source does not fit the part. */
function sourceError(p: ActivePart, a: ContributeProject): string | null {
  switch (p.kind) {
    case 'material': return a.source === 'substitute' ? 'Dafür gibt es keinen Ersatz' : null;
    case 'goods': return a.source === 'store' ? 'Ware gibt es nicht im Dorfladen – die musst du selbst töpfern' : null;
    default: return a.source === 'own' ? null : 'Dafür gibt es keinen Ersatz';
  }
}

/** Take the contribution from the actor (mutates actor and v.lentMasterworks). Returns the units or a German error. */
function takeContribution(v: VillageState, actor: GameState, actorId: string, p: ActivePart, a: ContributeProject): number | string {
  switch (p.kind) {
    case 'material': {
      if (a.source === 'store') {
        const cost = villageStorePrice(p.material) * a.count;
        if (actor.taler < cost) return `Im Dorfladen kostet das ${fmtTaler(cost)} Taler – so viel hast du nicht`;
        actor.taler = round2(actor.taler - cost);
      } else {
        if ((actor.materials[p.material] ?? 0) < a.count) return `Du hast nicht genug ${own(MATERIALS, p.material)?.name ?? 'Material'}`;
        actor.materials[p.material] -= a.count;
      }
      return a.count;
    }
    case 'goods': {
      const taken = takeGoods(actor, p, { designId: a.designId, quality: a.quality, effect: a.effect }, a.count, a.source === 'substitute');
      return typeof taken === 'string' ? taken : taken.units;
    }
    case 'taler':
      if (actor.taler < a.count) return 'Dafür hast du nicht genug Taler';
      actor.taler = round2(actor.taler - a.count);
      return a.count;
    case 'masterwork': {
      const ids = a.masterworkIds ?? [];
      if (ids.length !== a.count) return 'Wähle genau die Meisterstücke aus, die du ins Dorf stellen möchtest';
      const keys: string[] = [];
      for (const id of ids) {
        const mw = actor.masterworks.find((m) => m.id === id);
        if (!mw) return 'Dieses Meisterstück gibt es nicht';
        const key = `${actorId}:${id}`;
        if (v.lentMasterworks.includes(key) || keys.includes(key)) return 'Dieses Meisterstück steht schon im Dorf';
        if (PRESTIGE_RANK[mw.prestige] < PRESTIGE_RANK[p.minPrestige]) return `Dafür braucht es mindestens ${PRESTIGE_NAME[p.minPrestige]}`;
        keys.push(key);
      }
      // lent, not used up: the masterwork stays on the actor's plinth
      v.lentMasterworks.push(...keys);
      return a.count;
    }
  }
}

/** Everyone gets the base share of the stage reward; the rest by stage share. Absent members are never left out. */
function stagePayout(v: VillageState, a: ActiveProject): Delivery[] {
  const reward = stageReward(v, a), shares = stageShares(a);
  const total = Object.values(shares).reduce((x, y) => x + y, 0) || 1, n = v.members.length;
  return v.members.map((m) => {
    const share = BASE_SHARE / n + (1 - BASE_SHARE) * ((shares[m.playerId] ?? 0) / total);
    return { to: m.playerId, delta: { taler: Math.round(reward.taler * share), ruf: Math.max(1, Math.round(reward.ruf * share)) } };
  });
}

/** Pay a finished stage and move on to the next stage or finish the project. Mutates v; returns deliveries. */
function completeStage(v: VillageState, a: ActiveProject, events: string[], now: number): Delivery[] {
  const def = PROJECTS[a.projectId], stage = def.stages[a.stage];
  const out = stagePayout(v, a);
  const before = villageLevel(v);
  v.stagesDone += 1;
  noteLevelUp(v, before, now);
  addNews(v, `Bauphase „${stage.name}“ am ${def.name} ist fertig! Alle bekommen ihren Anteil.`, null, now);
  if (a.stage + 1 < def.stages.length) {
    a.stage += 1;
    a.parts = instantiateStage(def, a.level, a.stage, activeMembers(v, now).length);
    a.stageStartedAt = now;
    return out;
  }
  const pr = v.projects;
  pr.levels[a.projectId] = a.level;
  pr.active = null;
  ensureProjectOffers(v);
  for (const d of out) {
    if (a.level === 1) d.delta.decor = [def.decor];
    d.delta.village = { projects: { ...pr.levels } };
  }
  const title = `${def.name} ${ROMAN[a.level - 1]}`;
  addNews(v, `${title} ist fertig! ${def.benefit(a.level)}`, null, now);
  events.push(`${title} ist fertig! 🎉`);
  return out;
}

/**
 * Contribute to the village's grand project (mutates `v` and `actor`, pushes to `events`).
 * Every source goes through the 70 % cap and is credited in units of the part.
 */
export function contributeToProject(v: VillageState, actor: GameState, me: Member, a: ContributeProject, now: number, events: string[]): Delivery[] | string {
  const active = activeFor(v, me, a.projectId, now);
  if (typeof active === 'string') return active;
  const p = active.parts[a.part];
  if (!p) return 'Diesen Teil gibt es nicht';
  const left = Math.max(0, partSize(p) - p.filled);
  if (left <= 0) return 'Dieser Teil ist schon fertig';
  const srcErr = sourceError(p, a);
  if (srcErr) return srcErr;
  const units = unitsOf(p, a), max = maxProjectUnits(active, a.part, me.playerId);
  if (units > max) {
    // the 70 % rule speaks first whenever it is the tighter limit
    if (max < left) return 'Mehr als 70 % einer Bauphase darf niemand allein geben – lass den anderen etwas übrig!';
    return `Es fehlen nur noch ${p.kind === 'taler' ? fmtTaler(left) : left}`;
  }
  const taken = takeContribution(v, actor, me.playerId, p, a);
  if (typeof taken === 'string') return taken;
  p.filled += taken;
  p.by[me.playerId] = (p.by[me.playerId] ?? 0) + taken;
  events.push('Beigesteuert – danke!');
  return isStageComplete(active) ? completeStage(v, active, events, now) : [];
}
