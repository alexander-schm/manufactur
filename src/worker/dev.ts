import type { GameState } from '../shared/types';
import { readBody, requirePlayer } from './auth';
import { error, json } from './http';
import type { Env } from './index';

/** Move all timestamps `ms` into the past — the same as `ms` of time passing. Dev/testing only. */
export function shiftTime(state: GameState, ms: number): GameState {
  const s = structuredClone(state);
  s.createdAt -= ms;
  s.lastTick -= ms;
  s.lastSeen -= ms;
  s.lastOrderAt -= ms;
  if (s.boostUntil) s.boostUntil -= ms;
  if (s.away) s.away.since -= ms;
  for (const b of s.batches) if (b.startedAt !== null) b.startedAt -= ms;
  for (const k of Object.keys(s.cooldowns)) s.cooldowns[k] -= ms;
  for (const o of s.orders) if (o.bonusDeadline !== null) o.bonusDeadline -= ms;
  return s;
}

/** POST /api/dev/warp {minutes} — only when env.DEV_FAST === '1'. */
export async function handleWarp(req: Request, env: Env): Promise<Response> {
  if (env.DEV_FAST !== '1') return error(404, 'Nicht gefunden');
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const parsed = await readBody<{ minutes?: number }>(req);
  if ('error' in parsed) return parsed.error;
  const minutes = Number(parsed.value.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 60 * 24 * 60) return error(400, 'minutes 1…86400');
  const row = await env.DB.prepare('SELECT state FROM workshops WHERE player_id = ?').bind(who.playerId).first<{ state: string }>();
  if (!row) return error(404, 'Keine Werkstatt');
  const s = shiftTime(JSON.parse(row.state), minutes * 60_000);
  await env.DB.prepare('UPDATE workshops SET state = ? WHERE player_id = ?').bind(JSON.stringify(s), who.playerId).run();
  return json({ ok: true });
}
