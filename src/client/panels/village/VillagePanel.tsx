import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameState } from '../../../shared/types';
import type { Member, VillageView } from '../../../shared/village/types';
import { BUILDINGS } from '../../../shared/village/buildings';
import { marketDayAt } from '../../../shared/village/benefits';
import { PROJECTS } from '../../../shared/village/projects';
import { api } from '../../api';
import { VillageMap } from '../../art/village/VillageMap';
import { clockOffset, me, now, view } from '../../store';
import { hhmm, T } from '../../strings';
import { Button } from '../../ui/Button';
import { Tabs } from '../../ui/Tabs';
import { toast } from '../../ui/Toast';
import { loadVillage, markNewsSeen, markVillageOpened, newsSeenAt, village, villageDispatch } from '../../villageStore';
import { inviteLink } from '../../screens/AuthScreen';
import { NewsList, Guestbook } from './GuestbookPanel';
import { MuseumView } from './MuseumView';
import { VisitView } from './VisitView';
import { VillageTabs } from './VillageTabs';

export type VillageTab = 'joint' | 'project' | 'kiln' | 'trade' | 'gift' | 'guestbook' | 'news';
const TABS: VillageTab[] = ['joint', 'project', 'kiln', 'trade', 'gift', 'guestbook', 'news'];

/** Where a click on a map building leads: the kiln tab, the project tab, the museum, or nowhere (a toast). */
export function mapTarget(v: VillageView, id: string): 'kiln' | 'project' | 'museum' | null {
  if (id === 'gemeinschaftsofen') return v.buildings.includes(id) ? 'kiln' : null;
  if (!PROJECTS[id]) return null;
  return id === 'museum' && (v.projects.levels.museum ?? 0) > 0 ? 'museum' : 'project';
}

/** While the Glockenturm rings in the market day. */
export function MarketDayBanner({ s, now: t }: { s: GameState; now: number }) {
  const md = marketDayAt(s, t);
  if (!md) return null;
  return <div class="market-day" role="status">🔔 {T.vl.marketDay(hhmm(md.endsAt), Math.round(md.factor * 100))}</div>;
}

export function VillagePanel({ tab: initial }: { tab?: string }) {
  // a museum deep link lands on the project tab when the museum is not built yet
  const [tab, setTab] = useState<VillageTab>(initial === 'museum' ? 'project' : TABS.includes(initial as VillageTab) ? (initial as VillageTab) : 'joint');
  const [visit, setVisit] = useState<{ state: GameState; member: Member } | null>(null);
  const [museum, setMuseum] = useState(initial === 'museum');
  const body = useRef<HTMLDivElement>(null);
  // the tab content sits below the map: bring it into view for deep links and map clicks
  const [scrollTo, setScrollTo] = useState(!!initial && initial !== 'museum');
  useEffect(() => { void loadVillage(); markVillageOpened(); }, []);
  useEffect(() => { if (scrollTo && body.current) { body.current.scrollIntoView?.({ block: 'start' }); setScrollTo(false); } }, [scrollTo, tab, village.value]);
  useEffect(() => { if (tab === 'news') markNewsSeen(); }, [tab, village.value]);
  const v = village.value, meId = me.value?.playerId ?? '', s = view.value;
  const museumBuilt = (v?.projects.levels.museum ?? 0) > 0;
  useEffect(() => { if (museum && v && !museumBuilt) { setMuseum(false); setScrollTo(true); } }, [museum, v, museumBuilt]);
  if (!v) return <p class="muted">Das Dorf wird geladen …</p>;
  const hasKiln = v.buildings.includes('gemeinschaftsofen');
  const shown = tab === 'kiln' && !hasKiln ? 'joint' : tab;

  async function openHouse(playerId: string) {
    try { setVisit(await api.visit(playerId)); } catch (e) { toast(e instanceof Error ? e.message : 'Fehler', 'error'); }
  }

  if (visit) {
    return (
      <div>
        <Button small variant="quiet" onClick={() => setVisit(null)}>{T.vl.back}</Button>
        <VisitView village={v} meId={meId} member={visit.member} state={visit.state} now={now.value}
          onHelp={async (sticker) => { await villageDispatch({ type: 'help', target: visit.member.playerId, sticker }); }} />
      </div>
    );
  }

  if (museum && museumBuilt) {
    return (
      <div>
        <Button small variant="quiet" onClick={() => setMuseum(false)}>{T.vl.back}</Button>
        <MuseumView v={v} />
      </div>
    );
  }

  function onBuilding(id: string) {
    const target = v && mapTarget(v, id);
    if (target === 'museum') setMuseum(true);
    else if (target) { setTab(target); setScrollTo(true); }
    else { const d = BUILDINGS[id] ?? PROJECTS[id]; if (d) toast(`${d.name}: ${d.description}`); }
  }

  const t = now.value + clockOffset.value; // server time, like the panels below
  return (
    <div class="village-panel">
      {s && <MarketDayBanner s={s} now={t} />}
      <VillageMap village={v} meId={meId} now={t} onHouse={openHouse} onBoard={() => setTab('trade')} onBuilding={onBuilding} />
      {v.members.length < 2 && (
        <div class="invite-hint">
          <strong>Allein ist’s schön – zusammen noch schöner!</strong> Großaufträge gibt es ab zwei Leuten. Schick deinen Freunden diesen Link:
          <div class="small">{me.value && inviteLink(me.value.inviteCode)}</div>
        </div>
      )}
      <div ref={body} class="village-tabs">
        <Tabs tabs={TABS.filter((id) => id !== 'kiln' || hasKiln).map((id) => ({ id, label: T.vl.tabs[id] }))} value={shown} onChange={setTab} />
        <div class="tab-body">
          {shown === 'guestbook' && <Guestbook entries={v.guestbooks[meId] ?? []} />}
          {shown === 'news' && <NewsList news={v.news} meId={meId} seenAt={newsSeenAt.value} />}
          {shown !== 'guestbook' && shown !== 'news' && <VillageTabs tab={shown} onOpenMuseum={() => setMuseum(true)} />}
        </div>
      </div>
    </div>
  );
}
