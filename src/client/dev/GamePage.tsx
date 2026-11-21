import { me, serverState, startClock } from '../store';
import { GameScreen } from '../screens/GameScreen';
import { mockEndgame } from './mockEndgame';
import { mockWorkshop } from './ScenePage';
import { MILESTONES } from '../../shared/progression';
import { addOrder } from '../../shared/orders';

let ready = false;
export function GamePage() {
  if (!ready) {
    // dev-only: #game&endgame — deep Manufaktur state (everything acknowledged); &celebrate brings back the tier card
    const endgame = location.hash.includes('endgame');
    const s = endgame ? mockEndgame(Date.now()) : mockWorkshop(Date.now());
    for (const u of ['orders', 'studio', 'schale', 'hiring', 'recipes', 'upgrades', 'teller', 'vase', 'farbkoerper', 'formdetails', 'krug', 'patterns2', 'reduktion']) if (!s.unlocks.includes(u)) s.unlocks.push(u);
    if (!endgame) { s.ruf = 37; s.taler = 1840; }
    s.orders = [];
    for (let i = 0; i < 4; i++) addOrder(s, Date.now());
    const o = s.orders[0];
    s.goods.push({ designId: s.designs.find((d) => d.form === o.form && !d.origin)?.id ?? s.designs[0].id, quality: 3, effect: null, count: o.count + 2 });
    // dev-only: #game&tier=manufaktur&panel=station&arg=wheel
    if (location.hash.includes('tier=manufaktur')) {
      s.tier = 'manufaktur'; s.ruf = 400; s.taler = 60000;
      for (const st of s.stations) st.level = 6;
    }
    // dev-only: arg=<stationKind> is swapped for that station's id
    location.hash = location.hash.replace(/arg=([a-zA-Z]+)/, (m, k) => `arg=${s.stations.find((x) => x.kind === k)?.id ?? k}`);
    if (location.hash.includes('calm')) { // dev-only: no celebration cards over screenshots
      const held = MILESTONES.filter((m) => m.done(s)).map((m) => m.id);
      s.milestonesDone = [...held]; s.milestonesAcked = [...held];
    }
    if (endgame && location.hash.includes('celebrate')) s.milestonesAcked = s.milestonesAcked.filter((id) => id !== 'tierManufaktur');
    // dev-only: #game&endgame&mwdone — the gold masterwork has just left the kiln
    if (endgame && location.hash.includes('mwdone')) for (const m of s.masterworks) if (m.prestige === 'gold') m.acked = false;
    serverState.value = s;
    me.value = { playerId: 'dev', name: 'Alex', villageName: 'Tonhausen', inviteCode: 'TON234' };
    startClock();
    ready = true;
  }
  return <GameScreen onLogout={() => undefined} />;
}
