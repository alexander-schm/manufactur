import { SELF } from 'cloudflare:test';

export async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<{ status: number; json: any; cookie: string | null }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const res = await SELF.fetch(`https://x${path}`, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  const set = res.headers.get('set-cookie');
  return { status: res.status, json, cookie: set ? set.split(';')[0] : null };
}

let n = 0;
export const uniqueName = (p = 'Spieler') => `${p}${Date.now() % 100000}${n++}`;

export async function found(name = uniqueName()) {
  const r = await call('POST', '/api/found', { villageName: 'Tonhausen', name, password: 'geheim123' });
  return { ...r, name };
}
