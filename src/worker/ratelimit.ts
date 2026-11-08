import type { Env } from './index';

export const WINDOW_MS = 15 * 60_000;
export const LOGIN_FAILS_PER_NAME = 10;
export const JOIN_FAILS_PER_IP = 30;

/** True if `key` already has `max` failures in the current window. */
export async function isBlocked(env: Env, key: string, max: number, now = Date.now()): Promise<boolean> {
  const row = await env.DB.prepare('SELECT window_start, count FROM attempts WHERE key = ?').bind(key).first<{ window_start: number; count: number }>();
  return !!row && now - row.window_start < WINDOW_MS && row.count >= max;
}

export async function recordFailure(env: Env, key: string, now = Date.now()): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO attempts (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ?2 - window_start >= ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ?2 - window_start >= ?3 THEN ?2 ELSE window_start END`,
  ).bind(key, now, WINDOW_MS).run();
}

export async function clearFailures(env: Env, key: string): Promise<void> {
  await env.DB.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run();
}

export const clientIp = (req: Request) => req.headers.get('CF-Connecting-IP') ?? 'unbekannt';
export const TOO_MANY = 'Zu viele Versuche – bitte warte ein paar Minuten.';
