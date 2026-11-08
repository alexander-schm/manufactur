import { applyAction, type Action } from '../shared/actions';
import { advance } from '../shared/advance';
import { touchSeen } from '../shared/progression';
import { migrateState } from '../shared/state';
import type { GameState } from '../shared/types';
import { readBody, requirePlayer } from './auth';
import { error, json } from './http';
import type { Env } from './index';

type Row = { version: number; state: string };

async function load(env: Env, playerId: string): Promise<GameState | null> {
  const row = await env.DB.prepare('SELECT version, state FROM workshops WHERE player_id = ?').bind(playerId).first<Row>();
  if (!row) return null;
  const s = migrateState(JSON.parse(row.state));
  s.version = row.version;
  return s;
}

/** Conditional save; returns false if someone else saved in between. */
async function save(env: Env, playerId: string, expectedVersion: number, state: GameState): Promise<boolean> {
  const r = await env.DB.prepare('UPDATE workshops SET version = ?, state = ?, updated_at = ? WHERE player_id = ? AND version = ?')
    .bind(state.version, JSON.stringify(state), Date.now(), playerId, expectedVersion).run();
  return r.meta.changes === 1;
}

/** The server clock. (Dev time travel happens via /api/dev/warp, not here.) */
export function serverNow(_env: Env, _req?: Request): number {
  return Date.now();
}

/** Simulation events per request: keeps CPU per request small even after weeks away (~3–5 ms). */
export const CATCHUP_EVENTS = 3000;

/** Catch up as far as the budget allows; only mark the player present once fully caught up. */
function catchUp(stored: GameState, now: number): { state: GameState; catchingUp: boolean } {
  const s = advance(stored, now, CATCHUP_EVENTS);
  if (s.lastTick < now) return { state: s, catchingUp: true };
  return { state: touchSeen(s, now), catchingUp: false };
}

export async function handleGetState(req: Request, env: Env): Promise<Response> {
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const now = serverNow(env, req);
  const stored = await load(env, who.playerId);
  if (!stored) return error(404, 'Keine Werkstatt gefunden');
  const { state, catchingUp } = catchUp(stored, now);
  if (state !== stored) await save(env, who.playerId, stored.version, state); // version unchanged; a lost race is harmless
  return json({ state, serverNow: now, catchingUp });
}

export async function handleAction(req: Request, env: Env): Promise<Response> {
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const parsed = await readBody<{ action?: Action; version?: unknown }>(req);
  if ('error' in parsed) return parsed.error;
  const { action, version } = parsed.value;
  if (typeof version !== 'number' || !Number.isInteger(version)) return error(400, 'Version fehlt');
  if (!action || typeof action !== 'object') return error(400, 'Aktion fehlt');
  const now = serverNow(env, req);
  const stored = await load(env, who.playerId);
  if (!stored) return error(404, 'Keine Werkstatt gefunden');
  const pre = catchUp(stored, now);
  if (pre.catchingUp) {
    await save(env, who.playerId, stored.version, pre.state);
    return error(409, 'Deine Werkstatt holt noch auf', { state: pre.state, serverNow: now, catchingUp: true });
  }
  if (stored.version !== version) return error(409, 'Veraltet', { state: pre.state, serverNow: now });
  const result = applyAction(pre.state, action, now);
  if (!result.ok) return error(400, result.error);
  if (!(await save(env, who.playerId, stored.version, result.state))) {
    const fresh = (await load(env, who.playerId))!;
    return error(409, 'Veraltet', { state: catchUp(fresh, now).state, serverNow: now });
  }
  return json({ state: result.state, events: result.events, serverNow: now });
}
