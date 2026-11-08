import { DurableObject } from 'cloudflare:workers';
import { advance } from '../shared/advance';
import type { GameState } from '../shared/types';
import { applyDeltaOnce, applyVillageAction, markApplied } from '../shared/village/apply';
import { helpsLeft } from '../shared/village/help';
import { ensureJointOrders } from '../shared/village/joint';
import { addMember, MAX_MEMBERS, newVillage } from '../shared/village/state';
import type { Delivery, Member, VillageAction, VillageState, VillageView } from '../shared/village/types';
import { readBody, requirePlayer } from './auth';
import { CATCHUP_EVENTS } from './game';
import { error, json } from './http';
import type { Env } from './index';
import { loadWorkshop, saveWorkshop, updateWorkshop } from './workshops';


type ActResult = { status: 200; village: VillageView; state: GameState; events: string[] } | { status: 400 | 404 | 409; error: string; catchingUp?: boolean; state?: GameState };

function view(v: VillageState, viewerId: string, now: number): VillageView {
  const { helpsGiven: _h, rng: _r, nextId: _n, helpBoostUntil: _b, ...rest } = v;
  const left: Record<string, number> = {};
  for (const m of v.members) if (m.playerId !== viewerId) left[m.playerId] = helpsLeft(v, viewerId, m.playerId, now);
  return { ...structuredClone(rest), helpsLeft: left };
}

/** The workshop-side village snapshot for one member. */
function snapshotDelta(v: VillageState, m: Member): Delivery['delta'] {
  return { village: { villageId: v.villageId, specialty: m.specialty, buildings: [...v.buildings], members: v.members.length } };
}

type OutboxEntry = { key: string; to: string; delta: Delivery['delta'] };
/** Written together with the new village document, before any workshop is touched. */
type Pending = { opId: string; playerId: string; prev: VillageState };

const DRAIN_RETRY_MS = 30_000;

/**
 * One instance per village. Serialises every village operation (a promise chain, because awaiting D1
 * would otherwise let two requests interleave), keeps the village document in DO storage and
 * writes workshop changes to D1.
 *
 * Consistency: the new village document, the operation's deliveries (outbox) and a `pending` marker are
 * stored atomically first. Then the actor's workshop is written with the op id. If we crash in between,
 * recover() sees `pending`: if the actor's workshop has the op id the op happened, otherwise the
 * village document is rolled back. Deliveries carry keys and are applied exactly once; they stay in
 * the outbox until they land (retried by an alarm).
 */
export class VillageDO extends DurableObject<Env> {
  private queue: Promise<unknown> = Promise.resolve();

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async recover(): Promise<void> {
    const pending = await this.ctx.storage.get<Pending>('pending');
    if (!pending) return;
    const ws = await loadWorkshop(this.env, pending.playerId);
    if (ws?.appliedOps?.includes(pending.opId)) {
      await this.ctx.storage.delete('pending');
      return;
    }
    const outbox = (await this.ctx.storage.get<OutboxEntry[]>('outbox')) ?? [];
    await this.ctx.storage.put({ state: pending.prev, outbox: outbox.filter((e) => !e.key.startsWith(`${pending.opId}:`)) });
    await this.ctx.storage.delete('pending');
  }

  /** Apply queued deliveries; anything that can't land now stays queued and an alarm retries it. */
  private async drain(): Promise<void> {
    let outbox = (await this.ctx.storage.get<OutboxEntry[]>('outbox')) ?? [];
    if (!outbox.length) return;
    const left: OutboxEntry[] = [];
    for (const e of outbox) {
      try {
        const r = await updateWorkshop(this.env, e.to, (s) => applyDeltaOnce(s, e.key, e.delta));
        if (r === 'conflict') left.push(e);
      } catch (err) {
        console.error('delivery failed, will retry', e.key, err);
        left.push(e);
      }
    }
    outbox = left;
    await this.ctx.storage.put('outbox', outbox);
    if (outbox.length) await this.ctx.storage.setAlarm(Date.now() + DRAIN_RETRY_MS);
  }

  async alarm(): Promise<void> {
    await this.serial(async () => { await this.recover(); await this.drain(); });
  }

  private async enqueue(entries: OutboxEntry[]): Promise<void> {
    if (!entries.length) return;
    const outbox = (await this.ctx.storage.get<OutboxEntry[]>('outbox')) ?? [];
    await this.ctx.storage.put('outbox', [...outbox, ...entries]);
  }

  /** Load the village, creating or completing it from D1 (players who joined before the village existed). */
  private async ensure(villageId: string): Promise<VillageState> {
    await this.recover();
    let v = (await this.ctx.storage.get<VillageState>('state')) ?? null;
    const now = Date.now();
    if (!v) {
      const row = await this.env.DB.prepare('SELECT name FROM villages WHERE id = ?').bind(villageId).first<{ name: string }>();
      v = newVillage(villageId, row?.name ?? 'Dorf', parseInt(villageId.replace(/-/g, '').slice(0, 8), 16) || 1);
    }
    const rejected = new Set((await this.ctx.storage.get<string[]>('rejected')) ?? []);
    const known = new Set(v.members.map((m) => m.playerId));
    const rows = await this.env.DB.prepare('SELECT id, name, created_at FROM players WHERE village_id = ? ORDER BY created_at, id').bind(villageId).all<{ id: string; name: string; created_at: number }>();
    const missing = rows.results.filter((r) => !known.has(r.id) && !rejected.has(r.id));
    let added = false;
    for (const r of missing) {
      const ws = await loadWorkshop(this.env, r.id); // only newcomers are read
      const res = addMember(v, { playerId: r.id, name: r.name, avatarSeed: ws?.avatarSeed ?? 0, makerMark: ws?.makerMark ?? { shape: 'circle', letter: r.name[0]?.toUpperCase() ?? 'M', color: '#b44c36' }, joinedAt: r.created_at, lastSeen: ws?.lastSeen ?? r.created_at });
      if (typeof res === 'string') rejected.add(r.id);
      else { v = res; added = true; }
    }
    if (missing.length) await this.ctx.storage.put('rejected', [...rejected]);
    if (added) {
      ensureJointOrders(v, now);
      const opId = `join${v.members.length}-${now}`;
      await this.ctx.storage.put('state', v);
      await this.enqueue(v.members.map((m) => ({ key: `${opId}:${m.playerId}`, to: m.playerId, delta: snapshotDelta(v!, m) })));
    }
    await this.drain();
    return v;
  }

  /** Keep the village's picture of a member (look, mark, last seen) in sync with their workshop. */
  private syncMember(v: VillageState, ws: GameState): boolean {
    const m = v.members.find((x) => x.playerId === ws.playerId);
    if (!m) return false;
    const same = m.avatarSeed === ws.avatarSeed && JSON.stringify(m.makerMark) === JSON.stringify(ws.makerMark) && m.lastSeen >= ws.lastSeen;
    if (same) return false;
    m.avatarSeed = ws.avatarSeed;
    m.makerMark = { ...ws.makerMark };
    m.lastSeen = Math.max(m.lastSeen, ws.lastSeen);
    return true;
  }

  async join(villageId: string, playerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    return this.serial(async () => {
      const v = await this.ensure(villageId);
      return v.members.some((m) => m.playerId === playerId) ? { ok: true as const } : { ok: false as const, error: `Das Dorf ist voll (höchstens ${MAX_MEMBERS})` };
    });
  }

  async getView(villageId: string, playerId: string): Promise<VillageView | null> {
    return this.serial(async () => {
      const v = await this.ensure(villageId);
      if (!v.members.some((m) => m.playerId === playerId)) return null;
      const ws = await loadWorkshop(this.env, playerId);
      if (ws && this.syncMember(v, ws)) await this.ctx.storage.put('state', v);
      return view(v, playerId, Date.now());
    });
  }

  async act(villageId: string, playerId: string, action: VillageAction): Promise<ActResult> {
    return this.serial(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const v = await this.ensure(villageId);
        const now = Date.now();
        const stored = await loadWorkshop(this.env, playerId);
        if (!stored) return { status: 404, error: 'Keine Werkstatt gefunden' };
        const caught = advance(stored, now, CATCHUP_EVENTS);
        if (caught.lastTick < now) {
          await saveWorkshop(this.env, playerId, stored.version, caught);
          return { status: 409, error: 'Deine Werkstatt holt noch auf', catchingUp: true, state: caught };
        }
        this.syncMember(v, caught);
        const r = applyVillageAction(v, playerId, caught, action, now);
        if (typeof r === 'string') return { status: 400, error: r };
        const opId = `op${r.v.version}-${now}`;
        const actor = { ...r.actor, version: stored.version + 1 };
        markApplied(actor, opId);
        const outbox = (await this.ctx.storage.get<OutboxEntry[]>('outbox')) ?? [];
        const entries = r.deliveries.map((d, i) => ({ key: `${opId}:${i}`, to: d.to, delta: d.delta }));
        // 1) remember everything atomically, 2) write the actor, 3) clear the marker, 4) deliver
        await this.ctx.storage.put({ state: r.v, outbox: [...outbox, ...entries], pending: { opId, playerId, prev: v } satisfies Pending });
        if (!(await saveWorkshop(this.env, playerId, stored.version, actor))) {
          await this.ctx.storage.put({ state: v, outbox });
          await this.ctx.storage.delete('pending');
          continue; // the player acted meanwhile — redo on fresh state
        }
        await this.ctx.storage.delete('pending');
        await this.drain();
        return { status: 200, village: view(r.v, playerId, now), state: actor, events: r.events };
      }
      return { status: 409, error: 'Veraltet' };
    });
  }

  async visit(villageId: string, viewerId: string, targetId: string): Promise<{ state: GameState; member: Member } | null> {
    const v = await this.serial(() => this.ensure(villageId));
    if (!v.members.some((m) => m.playerId === viewerId)) return null;
    const member = v.members.find((m) => m.playerId === targetId);
    if (!member) return null;
    const ws = await loadWorkshop(this.env, targetId);
    if (!ws) return null;
    return { state: advance(ws, Date.now(), CATCHUP_EVENTS), member };
  }
}

const stub = (env: Env, villageId: string) => env.VILLAGE.get(env.VILLAGE.idFromName(villageId));

/** Called right after a player row is created (found/join). */
export async function joinVillage(env: Env, villageId: string, playerId: string) {
  return stub(env, villageId).join(villageId, playerId);
}

export async function handleVillageView(req: Request, env: Env): Promise<Response> {
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const v = await stub(env, who.villageId).getView(who.villageId, who.playerId);
  if (!v) return error(404, 'Kein Dorf gefunden');
  return json({ village: v, serverNow: Date.now() });
}

export async function handleVillageAction(req: Request, env: Env): Promise<Response> {
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const parsed = await readBody<{ action?: VillageAction }>(req);
  if ('error' in parsed) return parsed.error;
  if (!parsed.value.action || typeof parsed.value.action !== 'object') return error(400, 'Aktion fehlt');
  const r = await stub(env, who.villageId).act(who.villageId, who.playerId, parsed.value.action);
  if (r.status !== 200) return error(r.status, r.error, r.catchingUp ? { catchingUp: true, state: r.state, serverNow: Date.now() } : undefined);
  return json({ village: r.village, state: r.state, events: r.events, serverNow: Date.now() });
}

export async function handleVisit(req: Request, env: Env, targetId: string): Promise<Response> {
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const r = await stub(env, who.villageId).visit(who.villageId, who.playerId, targetId);
  if (!r) return error(404, 'Nicht gefunden');
  return json({ ...r, serverNow: Date.now() });
}
