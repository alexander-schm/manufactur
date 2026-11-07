import type { Action } from '../../shared/actions';
import { makeCharacter } from '../../shared/character';
import type { GameState, Order } from '../../shared/types';
import { Character } from '../art/character/Character';
import { dispatch } from '../store';
import { Button } from '../ui/Button';
import { CoinIcon, StarIcon } from '../ui/Counter';
import { DesignPot, Stars } from './common';
import { bestDesignForOrder, deliverActionFor, describeTaste } from './logic';

export function OrderCard({ state: s, order: o, onDeliver, onProduce, onDecline }: { state: GameState; order: Order; onDeliver: (a: Action) => void; onProduce: (designId: string) => void; onDecline?: (id: string) => void }) {
  const deliver = deliverActionFor(s, o);
  const best = bestDesignForOrder(s, o);
  const producing = best && s.standing?.designId === best.id;
  return (
    <article class="card" data-order={o.id}>
      <div class="card-row">
        <Character look={makeCharacter(o.customerSeed)} pose={deliver ? 'wave' : 'idle'} seed={o.customerSeed} size={64} wobble={false} />
        <div class="grow">
          <strong>{o.customerName}</strong> <span class="muted">· {o.customerJob}</span>
          <div class="bubble">{describeTaste(o.taste, o.form, o.count)}</div>
          <div class="reward">
            <span class="counter"><CoinIcon />≈ {o.rewardTaler}+</span>
            <span class="counter"><StarIcon />{o.rewardRuf}+</span>
            {o.minQuality > 1 && <span>mind. <Stars n={o.minQuality} /></span>}
          </div>
        </div>
      </div>
      <div class="card-row" style={{ marginTop: '8px' }}>
        {best ? <DesignPot s={s} d={best} size={46} /> : null}
        <div class="grow muted" style={{ fontSize: '.9em' }}>{best ? `Passt am besten: ${best.name}` : 'Du hast noch keinen Entwurf in dieser Form.'}</div>
        {best && !deliver && <Button small variant="quiet" disabled={!!producing} onClick={() => onProduce(best.id)}>{producing ? 'Läuft' : 'Herstellen'}</Button>}
        <Button small variant="good" disabled={!deliver} onClick={() => deliver && onDeliver(deliver)}>Liefern</Button>
      </div>
      {!deliver && onDecline && <button class="link decline" onClick={() => onDecline(o.id)}>Ablehnen – kein Problem, es kommt ein neuer Auftrag</button>}
    </article>
  );
}

export function OrdersPanel({ s }: { s: GameState }) {
  return (
    <div class="cards">
      {s.orders.length === 0 && <p class="muted">Gerade keine Bestellungen – gleich klopft bestimmt jemand.</p>}
      {s.orders.map((o) => (
        <OrderCard state={s} order={o} onDeliver={(a) => dispatch(a)} onProduce={(designId) => dispatch({ type: 'setStanding', designId, batchSize: s.standing?.batchSize ?? 6, autoBuy: s.standing?.autoBuy ?? true })} onDecline={(orderId) => dispatch({ type: 'declineOrder', orderId })} />
      ))}
      <p class="muted" style={{ fontSize: '.9em' }}>Neue Bestellungen kommen alle paar Minuten – auch wenn du nicht da bist. Keine hat eine Frist.</p>
    </div>
  );
}
