import { useState } from 'preact/hooks';
import { makeCharacter } from '../../../shared/character';
import { FORMS, MATERIALS } from '../../../shared/content';
import { COLOR_FAMILY_NAMES, colorFamily, type ColorFamily } from '../../../shared/design';
import type { GameState } from '../../../shared/types';
import { villageStorePrice } from '../../../shared/village/specialties';
import type { JointOrder, VillageAction, VillageView } from '../../../shared/village/types';
import { Character } from '../../art/character/Character';
import { Button } from '../../ui/Button';
import { Paper } from '../../ui/Paper';
import { villageDispatch } from '../../villageStore';
import { designColor, Stars } from '../common';
import { SWATCH } from './GivePicker';

function partLabel(p: JointOrder['parts'][number]): string {
  if (p.kind === 'material') return `${p.count} ${MATERIALS[p.material].name}`;
  const color = p.colorFamily ? ` in ${COLOR_FAMILY_NAMES[p.colorFamily as ColorFamily]}` : '';
  return `${p.count} ${FORMS[p.form].plural}${color}`;
}

/** Shelf stacks that fit a goods part. */
function fittingStacks(s: GameState, p: Extract<JointOrder['parts'][number], { kind: 'goods' }>) {
  return s.goods.filter((g) => {
    const d = s.designs.find((x) => x.id === g.designId);
    return d && d.form === p.form && g.quality >= p.minQuality && (!p.colorFamily || colorFamily(designColor(s, d)) === p.colorFamily);
  });
}

export function JointOrderCard({ v, s, meId, order, onContribute }: { v: VillageView; s: GameState; meId: string; order: JointOrder; onContribute: (a: VillageAction) => void }) {
  const contributors = Object.keys(order.contributions);
  return (
    <Paper tape seed={order.clientSeed % 97} class="joint-card">
      <div class="card-row">
        <Character look={makeCharacter(order.clientSeed)} pose="wave" seed={order.clientSeed} size={64} wobble={false} />
        <div class="grow">
          <h3 style={{ margin: 0 }}>{order.title}</h3>
          <div class="muted">für {order.client} · Belohnung {order.reward.taler} Taler, {order.reward.ruf} Ruf + Dekoration</div>
        </div>
      </div>
      <p class="together">🤝 Nur gemeinsam: mindestens zwei Leute müssen beitragen. Alle im Dorf bekommen einen Anteil – auch wer gerade nicht da ist.</p>
      {order.parts.map((p, i) => {
        const left = p.count - p.filled;
        const stacks = p.kind === 'goods' ? fittingStacks(s, p) : [];
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
            {left > 0 && (
              <div class="row joint-actions">
                {p.kind === 'material' && haveMat > 0 && <Button small variant="good" onClick={() => onContribute({ type: 'contribute', jointId: order.id, part: i, count: Math.min(left, haveMat), source: 'own' })}>{Math.min(left, haveMat)} aus deinem Lager</Button>}
                {p.kind === 'material' && <Button small variant="quiet" title={`${villageStorePrice(p.material)} Taler pro Stück`} disabled={s.taler < villageStorePrice(p.material)} onClick={() => onContribute({ type: 'contribute', jointId: order.id, part: i, count: Math.max(1, Math.min(left, Math.floor(s.taler / villageStorePrice(p.material)))), source: 'store' })}>Im Dorfladen kaufen (3×)</Button>}
                {stacks.map((g) => {
                  const d = s.designs.find((x) => x.id === g.designId)!;
                  const n = Math.min(left, g.count);
                  return <Button small variant="good" onClick={() => onContribute({ type: 'contribute', jointId: order.id, part: i, count: n, source: 'own', designId: g.designId, quality: g.quality, effect: g.effect })}>{n}× {d.name}</Button>;
                })}
                {p.kind === 'goods' && stacks.length === 0 && <span class="muted">Passende Stücke hast du gerade nicht im Regal.</span>}
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
