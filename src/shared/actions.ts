import { advance } from './advance';
import { EFFECTS, getStationDef, MATERIALS, STATIONS } from './content';
import { EXPERIMENT_COST, runExperiment, validateRecipe } from './discovery';
import { validateDesign } from './design';
import { newId } from './ids';
import { pieceValue } from './market';
import { orderReward } from './orders';
import { kilnCapacity, startNewBatch } from './production';
import { checkMilestones, touchSeen } from './progression';
import { rollWorker } from './state';
import type { Design, GameState, GlazeRecipe, MakerMark } from './types';

export type Action =
  | { type: 'buyMaterial'; material: string; amount: number }
  | { type: 'queueBatch'; designId: string; count: number }
  | { type: 'setStanding'; designId: string | null; batchSize?: number; autoBuy?: boolean }
  | { type: 'hire'; workerId: string }
  | { type: 'assign'; workerId: string; stationId: string | null }
  | { type: 'upgradeStation'; stationId: string }
  | { type: 'saveDesign'; design: Design }
  | { type: 'deliverOrder'; orderId: string; designId: string; quality: 1 | 2 | 3; effect: string | null }
  | { type: 'setStall'; designIds: string[] }
  | { type: 'sellNow'; designId: string; quality: 1 | 2 | 3; effect: string | null; count: number }
  | { type: 'experiment'; recipe: Omit<GlazeRecipe, 'id' | 'color' | 'effect' | 'name'> }
  | { type: 'handTouch'; stationId: string }
  | { type: 'setAvatar'; seed: number }
  | { type: 'setMakerMark'; mark: MakerMark }
  | { type: 'ackAway' }
  | { type: 'ackMilestone'; id: string };

export type ActionType = Action['type'];
export const ACTION_TYPES: ActionType[] = ['buyMaterial', 'queueBatch', 'setStanding', 'hire', 'assign', 'upgradeStation', 'saveDesign',
  'deliverOrder', 'setStall', 'sellNow', 'experiment', 'handTouch', 'setAvatar', 'setMakerMark', 'ackAway', 'ackMilestone'];

export type GameEvent = { kind: 'discovery' | 'glaze' | 'hint' | 'unlock' | 'milestone' | 'orderDone' | 'levelUp'; id: string; text: string };
export type ActionResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };

export const HAND_TOUCH_COOLDOWN_MS = 10 * 60_000;
export const HAND_TOUCH_SPEED = 1.15;
export const SELL_NOW_FACTOR = 0.6;
export const HIRE_COST_PER_WORKER = 30;

class Reject extends Error {}
const fail = (msg: string): never => { throw new Reject(msg); };
const isInt = (n: unknown, lo: number, hi: number) => typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;


export function applyAction(state: GameState, action: Action, now: number): ActionResult {
  try {
    if (!action || typeof action !== 'object' || !ACTION_TYPES.includes(action.type)) fail('Unbekannte Aktion');
    const s = structuredClone(advance(state, now));
    const events: GameEvent[] = [];
    run(s, action, now, events);
    const seen = touchSeen(s, now);
    const checked = checkMilestones(seen);
    events.push(...checked.events);
    const out = checked.state;
    out.version += 1;
    return { ok: true, state: out, events };
  } catch (e) {
    if (e instanceof Reject) return { ok: false, error: e.message };
    throw e;
  }
}

function needUnlock(s: GameState, id: string, msg: string) {
  if (!s.unlocks.includes(id)) fail(msg);
}

function run(s: GameState, a: Action, now: number, events: GameEvent[]): void {
  switch (a.type) {
    case 'buyMaterial': {
      const m = MATERIALS[a.material];
      if (!m) fail('Unbekanntes Material');
      if (m.locked || (m.unlock && !s.unlocks.includes(m.unlock))) fail(`${m.name} gibt es hier noch nicht zu kaufen`);
      if (!isInt(a.amount, 1, 1000)) fail('Ungültige Menge');
      const cost = m.price * a.amount;
      if (cost > s.taler) fail('Nicht genug Taler');
      s.taler -= cost;
      s.materials[a.material] = (s.materials[a.material] ?? 0) + a.amount;
      return;
    }
    case 'queueBatch': {
      const d = s.designs.find((x) => x.id === a.designId) ?? fail('Unbekannter Entwurf');
      const err = startNewBatch(s, d, a.count, false, (p) => newId(s, p));
      if (err) fail(err);
      return;
    }
    case 'setStanding': {
      if (a.designId === null) { s.standing = null; return; }
      if (!s.designs.some((x) => x.id === a.designId)) fail('Unbekannter Entwurf');
      const size = a.batchSize ?? 6;
      if (!isInt(size, 1, kilnCapacity(s))) fail(`Chargengröße 1–${kilnCapacity(s)}`);
      s.standing = { designId: a.designId, batchSize: size, autoBuy: a.autoBuy ?? true };
      return;
    }
    case 'hire': {
      needUnlock(s, 'hiring', 'Du kannst noch niemanden einstellen');
      const idx = s.hirePool.findIndex((w) => w.id === a.workerId);
      if (idx < 0) fail('Diese Person sucht keine Arbeit mehr');
      const cost = HIRE_COST_PER_WORKER * s.workers.length;
      if (cost > s.taler) fail('Nicht genug Taler');
      s.taler -= cost;
      const [w] = s.hirePool.splice(idx, 1);
      s.workers.push(w);
      s.hirePool.push(rollWorker(s));
      return;
    }
    case 'assign': {
      const w = s.workers.find((x) => x.id === a.workerId) ?? fail('Unbekannte Person');
      if (a.stationId !== null) {
        const st = s.stations.find((x) => x.id === a.stationId) ?? fail('Unbekannte Station');
        const def = getStationDef(st.kind);
        if (!def.usesWorkers) fail(`Am ${def.name} braucht es keine Hände`);
        const here = s.workers.filter((x) => x.stationId === st.id && x.id !== w.id).length;
        if (here >= def.maxWorkers) fail(`Am ${def.name} ist kein Platz mehr`);
      }
      w.stationId = a.stationId;
      return;
    }
    case 'upgradeStation': {
      needUnlock(s, 'upgrades', 'Ausbauen ist noch nicht freigeschaltet');
      const st = s.stations.find((x) => x.id === a.stationId) ?? fail('Unbekannte Station');
      const def = STATIONS[st.kind];
      if (st.level >= 5) fail('Schon auf höchster Stufe');
      const ruf = def.rufRequired[st.level - 1];
      if (s.ruf < ruf) fail(`Dafür brauchst du ${ruf} Ruf`);
      const cost = def.upgradeCost[st.level - 1];
      if (cost > s.taler) fail('Nicht genug Taler');
      s.taler -= cost;
      st.level += 1;
      events.push({ kind: 'levelUp', id: st.id, text: `${def.name} ist jetzt Stufe ${st.level}!` });
      return;
    }
    case 'saveDesign': {
      needUnlock(s, 'studio', 'Das Entwurfsstudio ist noch nicht freigeschaltet');
      const d = a.design;
      const err = validateDesign(d, s);
      if (err) fail(err);
      const clean: Design = {
        id: d.id, name: d.name.trim(), form: d.form, profile: { height: d.profile.height, belly: d.profile.belly, neck: d.profile.neck, foot: d.profile.foot, rim: d.profile.rim },
        handle: d.handle, rim: d.rim, glazeId: d.glazeId, pattern: d.pattern, patternColor: d.patternColor,
      };
      const idx = s.designs.findIndex((x) => x.id === d.id);
      if (idx >= 0) s.designs[idx] = clean;
      else { clean.id = newId(s, 'd'); s.designs.push(clean); }
      s.stats.designsSaved += 1;
      return;
    }
    case 'deliverOrder': {
      const order = s.orders.find((o) => o.id === a.orderId) ?? fail('Diesen Auftrag gibt es nicht mehr');
      const design = s.designs.find((d) => d.id === a.designId) ?? fail('Unbekannter Entwurf');
      if (design.form !== order.form) fail('Das ist die falsche Form');
      if (a.quality < order.minQuality) fail('Die Qualität reicht nicht');
      const stack = s.goods.find((g) => g.designId === a.designId && g.quality === a.quality && g.effect === a.effect);
      if (!stack || stack.count < order.count) fail('Davon hast du nicht genug im Regal');
      const glaze = s.glazes.find((g) => g.id === design.glazeId);
      const reward = orderReward(order, stack!, design, glaze);
      stack!.count -= order.count;
      s.goods = s.goods.filter((g) => g.count > 0);
      s.orders = s.orders.filter((o) => o.id !== order.id);
      s.taler += reward.taler;
      s.ruf += reward.ruf;
      s.stats.ordersDone += 1;
      s.stats.sold += order.count;
      events.push({ kind: 'orderDone', id: order.id, text: `${order.customerName} ist begeistert! +${reward.taler} Taler, +${reward.ruf} Ruf` });
      return;
    }
    case 'setStall': {
      if (!Array.isArray(a.designIds) || a.designIds.some((id) => !s.designs.some((d) => d.id === id))) fail('Unbekannter Entwurf');
      s.stallDesignIds = [...new Set(a.designIds)];
      return;
    }
    case 'sellNow': {
      if (!isInt(a.count, 1, 100000)) fail('Ungültige Menge');
      const stack = s.goods.find((g) => g.designId === a.designId && g.quality === a.quality && g.effect === a.effect);
      if (!stack || stack.count < a.count) fail('Davon hast du nicht genug im Regal');
      const taler = Math.round(a.count * pieceValue(s, stack!) * SELL_NOW_FACTOR * 100) / 100;
      stack!.count -= a.count;
      s.goods = s.goods.filter((g) => g.count > 0);
      s.taler = Math.round((s.taler + taler) * 100) / 100;
      s.stats.sold += a.count;
      return;
    }
    case 'handTouch': {
      const st = s.stations.find((x) => x.id === a.stationId) ?? fail('Unbekannte Station');
      if ((s.cooldowns[st.id] ?? 0) > now) fail('Deine Hände brauchen noch eine Pause');
      const b = s.batches.find((x) => x.stationId === st.id && x.startedAt !== null && !x.blocked);
      if (!b) fail('Hier läuft gerade nichts');
      const end = b!.startedAt! + b!.durationMs;
      const remaining = Math.max(0, end - now);
      b!.durationMs = Math.round(now - b!.startedAt! + remaining / HAND_TOUCH_SPEED);
      b!.touch = HAND_TOUCH_SPEED;
      s.cooldowns[st.id] = now + HAND_TOUCH_COOLDOWN_MS;
      return;
    }
    case 'setAvatar': {
      if (!isInt(a.seed, 0, 0xffffffff)) fail('Ungültiges Aussehen');
      s.avatarSeed = a.seed;
      return;
    }
    case 'setMakerMark': {
      const m = a.mark;
      if (!m || !['circle', 'heart', 'star', 'leaf'].includes(m.shape) || !/^[A-ZÄÖÜ]$/.test(m.letter) || !/^#[0-9a-f]{6}$/i.test(m.color)) fail('Ungültige Signatur');
      if (m.shape !== 'circle' && !s.unlocks.includes('zeichen')) fail('Diese Zeichenform ist noch nicht freigeschaltet');
      s.makerMark = { shape: m.shape, letter: m.letter, color: m.color };
      return;
    }
    case 'ackAway':
      s.away = null;
      return;
    case 'ackMilestone':
      if (s.milestonesDone.includes(a.id) && !s.milestonesAcked.includes(a.id)) s.milestonesAcked.push(a.id);
      return;
    case 'experiment': {
      needUnlock(s, 'studio', 'Glasurversuche gibt es ab dem Entwurfsstudio');
      const err = validateRecipe(a.recipe, s);
      if (err) fail(err);
      const need: Record<string, number> = { glasurbasis: EXPERIMENT_COST.glasurbasis };
      if (a.recipe.colorant) need[a.recipe.colorant] = EXPERIMENT_COST.colorant;
      for (const [m, n] of Object.entries(need)) if ((s.materials[m] ?? 0) < n) fail(`Für den Versuch fehlt ${MATERIALS[m].name}`);
      for (const [m, n] of Object.entries(need)) s.materials[m] -= n;
      const out = runExperiment(s, a.recipe);
      if (out.newEffect) events.push({ kind: 'discovery', id: out.newEffect, text: `Entdeckt: ${EFFECTS[out.newEffect].name}! ${EFFECTS[out.newEffect].description}` });
      else if (out.isNew) events.push({ kind: 'glaze', id: out.glaze.id, text: `Neue Glasur: ${out.glaze.name}` });
      if (out.hint) events.push({ kind: 'hint', id: out.glaze.id, text: out.hint });
      return;
    }
    default:
      fail('Noch nicht verfügbar');
  }
}

