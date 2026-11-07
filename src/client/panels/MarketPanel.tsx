import { getStationDef } from '../../shared/content';
import { goodsTotal, shelfCapacity, stallRate } from '../../shared/market';
import type { GameState } from '../../shared/types';
import { dispatch } from '../store';
import { Button } from '../ui/Button';
import { GoodsItem } from './common';

export function MarketPanel({ s }: { s: GameState }) {
  const total = goodsTotal(s);
  const designsInStock = [...new Set(s.goods.map((g) => g.designId))];
  const toggle = (id: string) => {
    const set = new Set(s.stallDesignIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    dispatch({ type: 'setStall', designIds: [...set] });
  };
  const stall = s.stations.find((x) => x.kind === 'marketStall')!;
  return (
    <div>
      <section class="panel-section">
        <h3>Regal · {total} / {shelfCapacity(s)}</h3>
        {total === 0 ? <p class="muted">Noch leer. Sobald etwas aus dem Ofen kommt, steht es hier.</p> : (
          <div class="goods-grid">
            {s.goods.map((g) => (
              <GoodsItem s={s} g={g}>
                <Button small variant="quiet" onClick={() => dispatch({ type: 'sellNow', designId: g.designId, quality: g.quality, effect: g.effect, count: g.count })}>Alle verkaufen</Button>
              </GoodsItem>
            ))}
          </div>
        )}
        <p class="muted" style={{ fontSize: '.9em' }}>„Jetzt verkaufen“ bringt sofort Geld, aber weniger als der Marktstand.</p>
      </section>
      <section class="panel-section">
        <h3>{getStationDef('marketStall').name} · Stufe {stall.level}</h3>
        <p>Verkauft ganz von allein etwa <strong>{stallRate(s).toLocaleString('de-DE')}</strong> Stück pro Minute – auch nachts.</p>
        <p class="muted">Was soll der Stand verkaufen?</p>
        {s.designs.map((d) => (
          <label class="check"><input type="checkbox" checked={s.stallDesignIds.includes(d.id)} onChange={() => toggle(d.id)} />{d.name}{!designsInStock.includes(d.id) && <span class="muted"> (gerade nichts da)</span>}</label>
        ))}
      </section>
    </div>
  );
}
