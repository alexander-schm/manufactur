import type { Action, GameEvent } from '../shared/actions';
import type { GameState } from '../shared/types';
import type { Member, VillageAction, VillageView } from '../shared/village/types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: any) { super(message); }
}

export type Me = { playerId: string; name: string; villageName: string; inviteCode: string };
export type StateReply = { state: GameState; serverNow: number; catchingUp?: boolean };
export type ActionReply = StateReply & { events: GameEvent[] };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method, credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Keine Verbindung – bist du offline?', null);
  }
  if (res.status === 204) return undefined as T;
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Da ist etwas schiefgegangen', data);
  return data as T;
}

export const api = {
  found: (villageName: string, name: string, password: string) => request<{ inviteCode: string }>('POST', '/api/found', { villageName, name, password }),
  join: (inviteCode: string, name: string, password: string) => request<{ inviteCode: string; villageName: string }>('POST', '/api/join', { inviteCode, name, password }),
  login: (name: string, password: string) => request<{ ok: true }>('POST', '/api/login', { name, password }),
  logout: () => request<void>('POST', '/api/logout'),
  me: () => request<Me>('GET', '/api/me'),
  getState: () => request<StateReply>('GET', '/api/state'),
  postAction: (action: Action, version: number) => request<ActionReply>('POST', '/api/action', { action, version }),
  village: () => request<{ village: VillageView; serverNow: number }>('GET', '/api/village'),
  villageAction: (action: VillageAction) => request<{ village: VillageView; state: GameState; events: string[]; serverNow: number }>('POST', '/api/village/action', { action }),
  visit: (playerId: string) => request<{ state: GameState; member: Member; serverNow: number }>('GET', `/api/village/visit/${encodeURIComponent(playerId)}`),
};
