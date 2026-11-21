import { useState } from 'preact/hooks';
import { makeCharacter } from '../../../shared/character';
import { BODIES, EFFECTS, FORMS, MATERIALS } from '../../../shared/content';
import { COLOR_FAMILY_NAMES, type ColorFamily } from '../../../shared/design';
import type { Design, GameState, GoodsStack } from '../../../shared/types';
import { allowsSubstitute, stackMismatch, substituteForm, SUBSTITUTE_FACTOR } from '../../../shared/village/goods';
import { maxContribution } from '../../../shared/village/joint';
import { villageStorePrice } from '../../../shared/village/specialties';
import type { GoodsPart, JointOrder, VillageAction, VillageView } from '../../../shared/village/types';
import { Character } from '../../art/character/Character';
import { Button } from '../../ui/Button';
import { Paper } from '../../ui/Paper';
import { villageDispatch } from '../../villageStore';
import { fmtTaler } from '../../../shared/format';
import { T } from '../../strings';
import { DesignPot, Stars } from '../common';
import { SWATCH } from './GivePicker';

/** "12 Krüge in Blau aus Steinzeug mit Ascheanflug" */
export function goodsLabel(p: GoodsPart): string {
  const color = p.colorFamily ? ` in ${COLOR_FAMILY_NAMES[p.colorFamily as ColorFamily]}` : '';
  const body = p.body ? ` aus ${BODIES[p.body]?.name ?? p.body}` : '';
  const effect = p.effect ? ` mit ${EFFECTS[p.effect]?.name ?? p.effect}` : '';
  return `${p.count} ${FORMS[p.form].plural}${color}${body}${effect}`;
}

function partLabel(p: JointOrder['parts'][number]): string {
  return p.kind === 'material' ? `${p.count} ${MATERIALS[p.material].name}` : goodsLabel(p);
}

/** Shelf stacks the village takes for a goods part – as they are, or as earthenware substitutes (shared rules). */
export function fittingStacks(s: GameState, p: GoodsPart, substitute = false): { g: GoodsStack; d: Design }[] {
  if (substitute && !allowsSubstitute(p)) return [];
  return s.goods.flatMap((g) => {
    const d = s.designs.find((x) => x.id === g.designId);
    return d && !stackMismatch(s, p, d, g, substitute) ? [{ g, d }] : [];
  });
}

/** Buttons for a goods part: one per fitting stack, plus earthenware substitutes in whole threes. `left` is in units. */
export function GoodsButtons({ s, p, left, give }: { s: GameState; p: GoodsPart; left: number; give: (g: GoodsStack, count: number, substitute: boolean) => void }) {
  const own = fittingStacks(s, p);
  const subs = fittingStacks(s, p, true).filter(({ g }) => g.count >= SUBSTITUTE_FACTOR);
  const plural = FORMS[substituteForm(p)]?.plural ?? substituteForm(p);
  return (
    <>
      {own.map(({ g, d }) => {
        const n = Math.min(left, g.count);
        return <Button small variant="good" class="goods-btn" onClick={() => give(g, n, false)}><DesignPot s={s} d={d} size={24} effect={g.effect} />{n}× {d.name}</Button>;
      })}
      {subs.map(({ g, d }) => {
        const pieces = Math.min(left, Math.floor(g.count / SUBSTITUTE_FACTOR)) * SUBSTITUTE_FACTOR;
        return <Button small variant="quiet" class="goods-btn" title={d.name} data-substitute={d.id} onClick={() => give(g, pieces, true)}><DesignPot s={s} d={d} size={24} effect={g.effect} />{T.vl.substitute(pieces, plural)}</Button>;
      })}
      {own.length === 0 && subs.length === 0 && (
        <span class="muted">{T.vl.noFittingGoods}{allowsSubstitute(p) ? ` ${T.vl.substituteHint(left * SUBSTITUTE_FACTOR, plural)}` : ''}</span>
      )}
    </>
  );
}

export function JointOrderCard({ v, s, meId, order, onContribute }: { v: VillageView; s: GameState; meId: string; order: JointOrder; onContribute: (a: VillageAction) => void }) {
  const contributors = Object.keys(order.contributions);
  return (
    <Paper tape seed={order.clientSeed % 97} class="joint-card">
      <div class="card-row">
        <Character look={makeCharacter(order.clientSeed)} pose="wave" seed={order.clientSeed} size={64} wobble={false} />
        <div class="grow">
          <h3 style={{ margin: 0 }}>{order.title}</h3>
          <div class="muted">für {order.client} · Belohnung {fmtTaler(order.reward.taler)} Taler, {order.reward.ruf} Ruf + Dekoration</div>
        </div>
      </div>
      <p class="together">🤝 Nur gemeinsam: mindestens zwei Leute müssen beitragen. Alle im Dorf bekommen einen Anteil – auch wer gerade nicht da ist.</p>
      {order.parts.map((p, i) => {
        const left = maxContribution(order, i, meId);
        const open = p.count - p.filled;
        const haveMat = p.kind === 'material' ? Math.floor(s.materials[p.material] ?? 0) : 0;
        return (
          <div class="joint-part">
            <div class="card-row">
              {p.kind === 'material' && <span class="mat-dot big" style={{ background: SWATCH[p.material] }} />}
              <div class="grow">
                <strong>{partLabel(p)}</strong>{p.kind === 'goods' && p.minQuality > 1 && <> · mind. <Stars n={p.minQuality} /></>}
                <div class="progressbar"><div style={{ width: `${(p.filled / p.count) * 100}%` }} /></div>
                <span class="muted">{p.filled}/{p.count}</span>
              </div>
            </div>
            {open > 0 && left === 0 && <p class="muted">Den letzten Rest lässt du jemand anderem – Großaufträge gehen nur gemeinsam.</p>}
            {left > 0 && (
              <div class="row joint-actions">
                {p.kind === 'material' && haveMat > 0 && <Button small variant="good" onClick={() => onContribute({ type: 'contribute', jointId: order.id, part: i, count: Math.min(left, haveMat), source: 'own' })}>{T.vl.fromStock(Math.min(left, haveMat))}</Button>}
                {p.kind === 'material' && <Button small variant="quiet" title={`${villageStorePrice(p.material)} Taler pro Stück`} disabled={s.taler < villageStorePrice(p.material)} onClick={() => onContribute({ type: 'contribute', jointId: order.id, part: i, count: Math.max(1, Math.min(left, Math.floor(s.taler / villageStorePrice(p.material)))), source: 'store' })}>{T.vl.buyInStore}</Button>}
                {p.kind === 'goods' && (
                  <GoodsButtons s={s} p={p} left={left} give={(g, count, substitute) => onContribute({ type: 'contribute', jointId: order.id, part: i, count, source: substitute ? 'substitute' : 'own', designId: g.designId, quality: g.quality, effect: g.effect })} />
                )}
              </div>
            )}
          </div>
        );
      })}
      {contributors.length > 0 && (
        <div class="contributors">
          {contributors.map((id) => {
            const m = v.members.find((x) => x.playerId === id);
            return m ? <span class="contrib" title={m.name}><Character look={makeCharacter(m.avatarSeed)} pose="work" seed={m.avatarSeed} size={30} wobble={false} />{m.playerId === meId ? 'du' : m.name}</span> : null;
          })}
        </div>
      )}
    </Paper>
  );
}

export function JointOrdersPanel({ v, s, meId }: { v: VillageView; s: GameState; meId: string }) {
  const [, force] = useState(0);
  if (v.members.length < 2) return <p class="muted">Großaufträge gibt es, sobald mindestens zwei Leute im Dorf wohnen.</p>;
  return (
    <div class="cards">
      {v.jointOrders.map((o) => <JointOrderCard v={v} s={s} meId={meId} order={o} onContribute={async (a) => { await villageDispatch(a); force((x) => x + 1); }} />)}
      <p class="muted">{v.completedJoint} Großaufträge hat euer Dorf schon geschafft.</p>
    </div>
  );
}
