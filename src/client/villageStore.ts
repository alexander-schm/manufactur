import { computed, signal } from '@preact/signals';
import type { VillageAction, VillageView } from '../shared/village/types';
import { api, ApiError } from './api';
import { adoptServerState, loadState, me } from './store';
import { toast } from './ui/Toast';

export const village = signal<VillageView | null>(null);

function readSeen(): number {
  try { return Number(localStorage.getItem('mf_news_seen') ?? 0) || 0; } catch { return 0; }
}
export const newsSeenAt = signal(typeof localStorage === 'undefined' ? 0 : readSeen());

export function markNewsSeen(): void {
  const latest = Math.max(newsSeenAt.value, ...(village.value?.news.map((n) => n.at) ?? [0]));
  newsSeenAt.value = latest;
  try { localStorage.setItem('mf_news_seen', String(latest)); } catch { /* ignore */ }
}

/** News for me (or everyone) that arrived since I last looked. */
export const unreadNews = computed(() => {
  const v = village.value, id = me.value?.playerId;
  if (!v || !id) return 0;
  return v.news.filter((n) => n.at > newsSeenAt.value && (n.for === null || n.for === id)).length;
});

function flag(key: string) {
  const s = signal(false);
  try { s.value = localStorage.getItem(key) === '1'; } catch { /* ignore */ }
  return { s, set: () => { s.value = true; try { localStorage.setItem(key, '1'); } catch { /* ignore */ } } };
}
const opened = flag('mf_village_opened');
const gave = flag('mf_gave_or_helped');
export const villageOpened = opened.s;
export const gaveOrHelped = gave.s;
export const markVillageOpened = opened.set;

export async function loadVillage(): Promise<void> {
  try {
    village.value = (await api.village()).village;
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) console.warn('village', e);
  }
}

export async function villageDispatch(a: VillageAction): Promise<string[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await api.villageAction(a);
      village.value = r.village;
      adoptServerState(r.state, r.serverNow);
      for (const e of r.events) toast(e, 'discovery');
      if (a.type === 'gift' || a.type === 'help') gave.set();
      return r.events;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && attempt === 0) { await loadState(); continue; }
      toast(e instanceof Error ? e.message : 'Da ist etwas schiefgegangen', 'error');
      return [];
    }
  }
  return [];
}

let poll: ReturnType<typeof setInterval> | null = null;
/** Refresh the village every minute while the tab is visible. */
export function startVillagePolling(): void {
  if (poll) return;
  poll = setInterval(() => { if (document.visibilityState === 'visible') void loadVillage(); }, 60_000);
}
