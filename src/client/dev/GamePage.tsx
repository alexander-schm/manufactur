import { me, serverState, startClock } from '../store';
import { GameScreen } from '../screens/GameScreen';
import { mockWorkshop } from './ScenePage';
import { MILESTONES } from '../../shared/progression';
import { addOrder } from '../../shared/orders';

let ready = false;
export function GamePage() {
  if (!ready) {
    const s = mockWorkshop(Date.now());
    s.unlocks.push('orders', 'studio', 'schale', 'hiring', 'recipes', 'upgrades', 'teller', 'vase', 'farbkoerper', 'formdetails', 'krug', 'patterns2', 'reduktion');
    s.ruf = 37; s.taler = 1840;
    s.orders = [];
    for (let i = 0; i < 4; i++) addOrder(s, Date.now());
    const o = s.orders[0];
    s.goods.push({ designId: s.designs.find((d) => d.form === o.form)?.id ?? s.designs[0].id, quality: 3, effect: null, count: o.count + 2 });
    // dev-only: #game&tier=manufaktur&panel=station&arg=wheel (kind name is swapped for the station id)
    if (location.hash.includes('tier=manufaktur')) {
      s.tier = 'manufaktur'; s.ruf = 400; s.taler = 60000;
      for (const st of s.stations) st.level = 6;
      location.hash = location.hash.replace(/arg=([a-zA-Z]+)/, (m, k) => `arg=${s.stations.find((x) => x.kind === k)?.id ?? k}`);
    }
    if (location.hash.includes('calm')) { // dev-only: no celebration cards over screenshots
      const held = MILESTONES.filter((m) => m.done(s)).map((m) => m.id);
      s.milestonesDone = [...held]; s.milestonesAcked = [...held];
    }
    serverState.value = s;
    me.value = { playerId: 'dev', name: 'Alex', villageName: 'Tonhausen', inviteCode: 'TON234' };
    startClock();
    ready = true;
  }
  return <GameScreen onLogout={() => undefined} />;
}
