import { migrateState } from '../shared/state';
import type { GameState } from '../shared/types';
import type { Env } from './index';

type Row = { version: number; state: string };

export async function loadWorkshop(env: Env, playerId: string): Promise<GameState | null> {
  const row = await env.DB.prepare('SELECT version, state FROM workshops WHERE player_id = ?').bind(playerId).first<Row>();
  if (!row) return null;
  const s = migrateState(JSON.parse(row.state));
  s.version = row.version;
  return s;
}

/** Conditional save; returns false if someone else saved in between. */
export async function saveWorkshop(env: Env, playerId: string, expectedVersion: number, state: GameState): Promise<boolean> {
  const r = await env.DB.prepare('UPDATE workshops SET version = ?, state = ?, updated_at = ? WHERE player_id = ? AND version = ?')
    .bind(state.version, JSON.stringify(state), Date.now(), playerId, expectedVersion).run();
  return r.meta.changes === 1;
}

/** Read-modify-write with retries; `change` must be safe to recompute from a fresh read. */
export async function updateWorkshop(env: Env, playerId: string, change: (s: GameState) => GameState, tries = 8): Promise<GameState | null> {
  for (let i = 0; i < tries; i++) {
    const s = await loadWorkshop(env, playerId);
    if (!s) return null;
    const next = { ...change(s), version: s.version + 1 };
    if (await saveWorkshop(env, playerId, s.version, next)) return next;
  }
  console.error('delivery failed after retries', playerId);
  return null;
}
