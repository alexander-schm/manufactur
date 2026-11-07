import { computed, signal } from '@preact/signals';
import { applyAction, type Action, type GameEvent } from '../shared/actions';
import { advance } from '../shared/advance';
import type { GameState } from '../shared/types';
import { api, ApiError, type Me, type StateReply } from './api';
import { toast } from './ui/Toast';

export const me = signal<Me | null>(null);
export const serverState = signal<GameState | null>(null);
/** serverNow − Date.now(), measured on every response. The server clock is the truth. */
export const clockOffset = signal(0);
export const now = signal(Date.now());
export const lastEvents = signal<GameEvent[]>([]);

/** Server time as best we know it. */
export const serverTime = () => Date.now() + clockOffset.value;

/** The state as it is right now (catch-up simulated locally between server responses). */
export const view = computed(() => (serverState.value ? advance(serverState.value, now.value + clockOffset.value) : null));

export function tick(): void {
  now.value = Date.now();
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startClock(ms = 250): void {
  if (timer) return;
  timer = setInterval(tick, ms);
}

function adopt(r: StateReply): void {
  clockOffset.value = r.serverNow - Date.now();
  now.value = Date.now();
  serverState.value = r.state;
}

export async function loadState(): Promise<void> {
  adopt(await api.getState());
}

export async function loadMe(): Promise<Me | null> {
  try {
    me.value = await api.me();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) me.value = null;
    else throw e;
  }
  return me.value;
}

let queue: Promise<unknown> = Promise.resolve();

/** Apply an action optimistically, then confirm it with the server. Calls are serialised. */
export function dispatch(action: Action): Promise<GameEvent[]> {
  const run = queue.then(() => doDispatch(action));
  queue = run.catch(() => undefined);
  return run;
}

function announce(events: GameEvent[]) {
  lastEvents.value = events;
  for (const e of events) {
    if (e.kind === 'milestone' || e.kind === 'unlock') continue; // shown as celebration cards
    toast(e.text, e.kind === 'discovery' || e.kind === 'glaze' ? 'discovery' : 'info', e.kind === 'hint' ? 7000 : 4200);
  }
}

async function doDispatch(action: Action): Promise<GameEvent[]> {
  const base = serverState.value;
  if (!base) return [];
  const local = applyAction(base, action, serverTime());
  if (!local.ok) {
    toast(local.error, 'error');
    return [];
  }
  serverState.value = local.state; // optimistic
  let version = base.version;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await api.postAction(action, version);
      adopt(r);
      announce(r.events);
      return r.events;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.state && attempt === 0) {
        adopt({ state: e.body.state, serverNow: e.body.serverNow ?? serverTime() });
        const retry = applyAction(e.body.state, action, serverTime());
        if (!retry.ok) { toast(retry.error, 'error'); return []; }
        serverState.value = retry.state;
        version = e.body.state.version;
        continue;
      }
      serverState.value = e instanceof ApiError && e.body?.state ? e.body.state : base; // roll back
      toast(e instanceof Error ? e.message : 'Da ist etwas schiefgegangen', 'error');
      return [];
    }
  }
  return [];
}
