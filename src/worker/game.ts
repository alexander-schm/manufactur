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

/** The server clock, optionally sped up in dev for end-to-end tests. */
export function serverNow(env: Env, req?: Request): number {
  return Date.now();
}

export async function handleGetState(req: Request, env: Env): Promise<Response> {
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const now = serverNow(env, req);
  const stored = await load(env, who.playerId);
  if (!stored) return error(404, 'Keine Werkstatt gefunden');
  const next = touchSeen(advance(stored, now), now);
  if (next !== stored) await save(env, who.playerId, stored.version, next); // version unchanged; a lost race is harmless
  return json({ state: next, serverNow: now });
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
  if (stored.version !== version) {
    return error(409, 'Veraltet', { state: touchSeen(advance(stored, now), now), serverNow: now });
  }
  const result = applyAction(stored, action, now);
  if (!result.ok) return error(400, result.error);
  if (!(await save(env, who.playerId, stored.version, result.state))) {
    const fresh = (await load(env, who.playerId))!;
    return error(409, 'Veraltet', { state: touchSeen(advance(fresh, now), now), serverNow: now });
  }
  return json({ state: result.state, events: result.events, serverNow: now });
}
