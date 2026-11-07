import { me, serverState, startClock } from '../store';
import { GameScreen } from '../screens/GameScreen';
import { mockWorkshop } from './ScenePage';
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
    serverState.value = s;
    me.value = { playerId: 'dev', name: 'Alex', villageName: 'Tonhausen', inviteCode: 'TON234' };
    startClock();
    ready = true;
  }
  return <GameScreen onLogout={() => undefined} />;
}
