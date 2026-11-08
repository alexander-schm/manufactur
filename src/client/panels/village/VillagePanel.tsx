import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../../../shared/types';
import type { Member } from '../../../shared/village/types';
import { BUILDINGS } from '../../../shared/village/buildings';
import { api } from '../../api';
import { VillageMap } from '../../art/village/VillageMap';
import { me, now } from '../../store';
import { Button } from '../../ui/Button';
import { Tabs } from '../../ui/Tabs';
import { toast } from '../../ui/Toast';
import { loadVillage, markNewsSeen, markVillageOpened, newsSeenAt, village, villageDispatch } from '../../villageStore';
import { inviteLink } from '../../screens/AuthScreen';
import { NewsList, Guestbook } from './GuestbookPanel';
import { VisitView } from './VisitView';
import { VillageTabs } from './VillageTabs';

export type VillageTab = 'joint' | 'trade' | 'gift' | 'guestbook' | 'news';

export function VillagePanel({ tab: initial }: { tab?: string }) {
  const [tab, setTab] = useState<VillageTab>((initial as VillageTab) ?? 'joint');
  const [visit, setVisit] = useState<{ state: GameState; member: Member } | null>(null);
  useEffect(() => { void loadVillage(); markVillageOpened(); }, []);
  useEffect(() => { if (tab === 'news') markNewsSeen(); }, [tab, village.value]);
  const v = village.value, meId = me.value?.playerId ?? '';
  if (!v) return <p class="muted">Das Dorf wird geladen …</p>;

  async function openHouse(playerId: string) {
    try { setVisit(await api.visit(playerId)); } catch (e) { toast(e instanceof Error ? e.message : 'Fehler', 'error'); }
  }

  if (visit) {
    return (
      <div>
        <Button small variant="quiet" onClick={() => setVisit(null)}>‹ Zurück zum Dorf</Button>
        <VisitView village={v} meId={meId} member={visit.member} state={visit.state} now={now.value}
          onHelp={async (sticker) => { await villageDispatch({ type: 'help', target: visit.member.playerId, sticker }); }} />
      </div>
    );
  }

  return (
    <div class="village-panel">
      <VillageMap village={v} meId={meId} now={now.value} onHouse={openHouse} onBoard={() => setTab('trade')}
        onBuilding={(id) => toast(`${BUILDINGS[id].name}: ${BUILDINGS[id].description}`)} />
      {v.members.length < 2 && (
        <div class="invite-hint">
          <strong>Allein ist’s schön – zusammen noch schöner!</strong> Großaufträge gibt es ab zwei Leuten. Schick deinen Freunden diesen Link:
          <div class="small">{me.value && inviteLink(me.value.inviteCode)}</div>
        </div>
      )}
      <Tabs tabs={[{ id: 'joint', label: 'Großaufträge' }, { id: 'trade', label: 'Tauschbrett' }, { id: 'gift', label: 'Schenken' }, { id: 'guestbook', label: 'Gästebuch' }, { id: 'news', label: 'Neuigkeiten' }]} value={tab} onChange={setTab} />
      <div class="tab-body">
        {tab === 'guestbook' && <Guestbook entries={v.guestbooks[meId] ?? []} />}
        {tab === 'news' && <NewsList news={v.news} meId={meId} seenAt={newsSeenAt.value} />}
        {(tab === 'joint' || tab === 'trade' || tab === 'gift') && <VillageTabs tab={tab} />}
      </div>
    </div>
  );
}
