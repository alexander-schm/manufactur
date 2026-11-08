import { useState } from 'preact/hooks';
import { makeCharacter } from '../../../shared/character';
import { MATERIALS } from '../../../shared/content';
import type { GameState } from '../../../shared/types';
import type { Offer, VillageView } from '../../../shared/village/types';
import { Character } from '../../art/character/Character';
import { Button } from '../../ui/Button';
import { villageDispatch } from '../../villageStore';
import { GiveChip, GivePicker, haveEnough, toRef, TRADEABLE, type PickerValue } from './GivePicker';

export function OfferCard({ v, s, meId, offer, onAccept, onCancel }: { v: VillageView; s: GameState; meId: string; offer: Offer; onAccept: () => void; onCancel: () => void }) {
  const from = v.members.find((m) => m.playerId === offer.from);
  const mine = offer.from === meId;
  const canPay = haveEnough(s, offer.want);
  return (
    <article class="card">
      <div class="card-row">
        {from && <Character look={makeCharacter(from.avatarSeed)} pose="idle" seed={from.avatarSeed} size={44} wobble={false} />}
        <div class="grow">
          <strong>{mine ? 'Dein Angebot' : from?.name}</strong>
          <div class="trade-line"><GiveChip g={offer.give} s={s} /> <span class="arrow">⇄</span> <GiveChip g={offer.want} s={s} /></div>
        </div>
        {mine ? <Button small variant="quiet" onClick={onCancel}>Zurückziehen</Button>
          : <Button small variant="good" disabled={!canPay} title={canPay ? undefined : 'Dafür hast du nicht genug'} onClick={onAccept}>Annehmen</Button>}
      </div>
    </article>
  );
}

export function TradePanel({ v, s, meId }: { v: VillageView; s: GameState; meId: string }) {
  const [give, setGive] = useState<PickerValue>({ kind: 'material', material: v.members.find((m) => m.playerId === meId)?.specialty ?? 'ton' });
  const [giveN, setGiveN] = useState(10);
  const [want, setWant] = useState<PickerValue>({ kind: 'material', material: 'holz' });
  const [wantN, setWantN] = useState(10);
  const [reqMat, setReqMat] = useState('holz');
  const [reqN, setReqN] = useState(10);
  const giveRef = toRef(s, give, giveN);
  const wantRef = toRef(s, want, wantN);
  return (
    <div>
      <section class="panel-section">
        <h3>Angebote</h3>
        {v.offers.length === 0 && <p class="muted">Noch hängt nichts am Brett.</p>}
        <div class="cards">
          {v.offers.map((o) => <OfferCard v={v} s={s} meId={meId} offer={o} onAccept={() => villageDispatch({ type: 'acceptOffer', offerId: o.id })} onCancel={() => villageDispatch({ type: 'cancelOffer', offerId: o.id })} />)}
        </div>
      </section>
      <section class="panel-section">
        <h3>Neues Angebot</h3>
        <p class="muted" style={{ fontSize: '.9em' }}>Was du anbietest, wird gleich ans Brett geheftet – du bekommst es zurück, wenn du das Angebot zurückziehst.</p>
        <strong>Ich gebe</strong>
        <GivePicker s={s} value={give} onChange={setGive} />
        <label class="slider"><span>{giveN}×</span><input type="range" min={1} max={100} value={giveN} onInput={(e) => setGiveN(Number(e.currentTarget.value))} /></label>
        <strong>und möchte dafür</strong>
        <GivePicker s={s} value={want} onChange={setWant} allowGoods={false} />
        <label class="slider"><span>{wantN}×</span><input type="range" min={1} max={100} value={wantN} onInput={(e) => setWantN(Number(e.currentTarget.value))} /></label>
        <Button variant="primary" disabled={!giveRef || !wantRef || !haveEnough(s, giveRef)} onClick={() => giveRef && wantRef && wantRef.kind !== 'goods' && villageDispatch({ type: 'postOffer', give: giveRef, want: wantRef })}>Ans Brett heften</Button>
      </section>
      <section class="panel-section">
        <h3>Wünsche</h3>
        {v.requests.length === 0 && <p class="muted">Gerade wünscht sich niemand etwas.</p>}
        <div class="cards">
          {v.requests.map((r) => {
            const who = v.members.find((m) => m.playerId === r.from);
            const mine = r.from === meId;
            const can = (s.materials[r.material] ?? 0) >= r.count;
            return (
              <article class="card card-row">
                <div class="grow"><strong>{mine ? 'Du' : who?.name}</strong> {mine ? 'brauchst' : 'braucht'} <GiveChip g={{ kind: 'material', material: r.material, count: r.count }} /></div>
                {mine ? <Button small variant="quiet" onClick={() => villageDispatch({ type: 'removeRequest', requestId: r.id })}>Erledigt</Button>
                  : <Button small variant="good" disabled={!can} onClick={() => villageDispatch({ type: 'gift', to: r.from, give: { kind: 'material', material: r.material, count: r.count } })}>Schenken</Button>}
              </article>
            );
          })}
        </div>
        <div class="row" style={{ marginTop: '8px' }}>
          <select class="pick" value={reqMat} onChange={(e) => setReqMat(e.currentTarget.value)}>{TRADEABLE.map((m) => <option value={m}>{MATERIALS[m].name}</option>)}</select>
          <input class="pick" type="number" min={1} max={500} value={reqN} onInput={(e) => setReqN(Math.max(1, Number(e.currentTarget.value) || 1))} style={{ width: '90px' }} />
          <Button small onClick={() => villageDispatch({ type: 'postRequest', material: reqMat, count: reqN })}>Wunsch anheften</Button>
        </div>
      </section>
    </div>
  );
}
