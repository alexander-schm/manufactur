import { newGame } from '../shared/state';
import { error, json } from './http';
import type { Env } from './index';

export const SESSION_COOKIE = 'mf_session';
export const SESSION_TTL_S = 90 * 24 * 3600;
const PBKDF2_ITERATIONS = 100_000;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return b64(bits);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function inviteCode(): string {
  return Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function sessionCookie(token: string, maxAge = SESSION_TTL_S): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > 32 * 1024) return null;
  try {
    const text = await req.text();
    if (text.length > 32 * 1024) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

type Creds = { name?: unknown; password?: unknown };

function validateCreds(body: Creds): string | null {
  if (typeof body.name !== 'string') return 'Name fehlt';
  const name = body.name.trim();
  if (name.length < 2 || name.length > 20) return 'Der Name muss 2–20 Zeichen lang sein';
  if (typeof body.password !== 'string' || body.password.length < 6) return 'Passwort zu kurz (mind. 6 Zeichen)';
  if (body.password.length > 200) return 'Passwort zu lang';
  return null;
}

async function createSession(env: Env, playerId: string): Promise<string> {
  const token = b64(randomBytes(32)).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
  await env.DB.prepare('INSERT INTO sessions (token, player_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, playerId, Date.now() + SESSION_TTL_S * 1000).run();
  return token;
}

async function createPlayer(env: Env, villageId: string, name: string, password: string): Promise<{ playerId: string } | Response> {
  const nameKey = name.toLowerCase();
  const taken = await env.DB.prepare('SELECT 1 FROM players WHERE name_key = ?').bind(nameKey).first();
  if (taken) return error(409, 'Name schon vergeben');
  const playerId = crypto.randomUUID();
  const salt = randomBytes(16);
  const hash = await hashPassword(password, salt);
  const now = Date.now();
  const seed = new Uint32Array(randomBytes(4).buffer)[0];
  const state = newGame(playerId, seed, now);
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO players (id, village_id, name, name_key, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(playerId, villageId, name, nameKey, hash, b64(salt), now),
      env.DB.prepare('INSERT INTO workshops (player_id, version, state, updated_at) VALUES (?, ?, ?, ?)')
        .bind(playerId, state.version, JSON.stringify(state), now),
    ]);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error(409, 'Name schon vergeben');
    throw e;
  }
  return { playerId };
}

export async function handleFound(req: Request, env: Env): Promise<Response> {
  const body = await readJson<Creds & { villageName?: unknown }>(req);
  if (!body) return error(400, 'Ungültige Anfrage');
  const bad = validateCreds(body);
  if (bad) return error(400, bad);
  const villageName = typeof body.villageName === 'string' ? body.villageName.trim() : '';
  if (villageName.length < 2 || villageName.length > 30) return error(400, 'Der Dorfname muss 2–30 Zeichen lang sein');
  const name = (body.name as string).trim();
  const nameKey = name.toLowerCase();
  if (await env.DB.prepare('SELECT 1 FROM players WHERE name_key = ?').bind(nameKey).first()) return error(409, 'Name schon vergeben');
  const villageId = crypto.randomUUID();
  let code = inviteCode();
  for (let i = 0; i < 5 && (await env.DB.prepare('SELECT 1 FROM villages WHERE invite_code = ?').bind(code).first()); i++) code = inviteCode();
  await env.DB.prepare('INSERT INTO villages (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)').bind(villageId, villageName, code, Date.now()).run();
  const p = await createPlayer(env, villageId, name, body.password as string);
  if (p instanceof Response) return p;
  const token = await createSession(env, p.playerId);
  return json({ inviteCode: code }, 201, { 'set-cookie': sessionCookie(token) });
}

export async function handleJoin(req: Request, env: Env): Promise<Response> {
  const body = await readJson<Creds & { inviteCode?: unknown }>(req);
  if (!body) return error(400, 'Ungültige Anfrage');
  const bad = validateCreds(body);
  if (bad) return error(400, bad);
  const code = typeof body.inviteCode === 'string' ? body.inviteCode.trim().toUpperCase() : '';
  const village = await env.DB.prepare('SELECT id, name FROM villages WHERE invite_code = ?').bind(code).first<{ id: string; name: string }>();
  if (!village) return error(404, 'Einladungscode unbekannt');
  const p = await createPlayer(env, village.id, (body.name as string).trim(), body.password as string);
  if (p instanceof Response) return p;
  const token = await createSession(env, p.playerId);
  return json({ inviteCode: code, villageName: village.name }, 201, { 'set-cookie': sessionCookie(token) });
}

export async function handleLogin(req: Request, env: Env): Promise<Response> {
  const body = await readJson<Creds>(req);
  if (!body || typeof body.name !== 'string' || typeof body.password !== 'string') return error(400, 'Ungültige Anfrage');
  const row = await env.DB.prepare('SELECT id, pw_hash, pw_salt FROM players WHERE name_key = ?')
    .bind(body.name.trim().toLowerCase()).first<{ id: string; pw_hash: string; pw_salt: string }>();
  // hash anyway so timing doesn't reveal whether the name exists
  const hash = await hashPassword(body.password, row ? fromB64(row.pw_salt) : new Uint8Array(16));
  if (!row || !timingSafeEqual(hash, row.pw_hash)) return error(401, 'Name oder Passwort falsch');
  const token = await createSession(env, row.id);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token) });
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function handleLogout(req: Request, env: Env): Promise<Response> {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return new Response(null, { status: 204, headers: { 'set-cookie': sessionCookie('', 0) } });
}

export async function requirePlayer(req: Request, env: Env): Promise<{ playerId: string; villageId: string } | Response> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return error(401, 'Bitte melde dich an');
  const row = await env.DB.prepare(
    'SELECT s.player_id AS playerId, s.expires_at AS expiresAt, p.village_id AS villageId FROM sessions s JOIN players p ON p.id = s.player_id WHERE s.token = ?',
  ).bind(token).first<{ playerId: string; expiresAt: number; villageId: string }>();
  if (!row || row.expiresAt < Date.now()) return error(401, 'Bitte melde dich an');
  return { playerId: row.playerId, villageId: row.villageId };
}

export async function handleMe(req: Request, env: Env): Promise<Response> {
  const who = await requirePlayer(req, env);
  if (who instanceof Response) return who;
  const row = await env.DB.prepare('SELECT p.name AS name, v.name AS villageName, v.invite_code AS inviteCode FROM players p JOIN villages v ON v.id = p.village_id WHERE p.id = ?')
    .bind(who.playerId).first<{ name: string; villageName: string; inviteCode: string }>();
  if (!row) return error(401, 'Bitte melde dich an');
  return json({ playerId: who.playerId, ...row });
}
