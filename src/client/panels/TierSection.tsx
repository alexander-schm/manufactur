import { nextTier, UNLOCKS, getTier } from '../../shared/content';
import { MILESTONES } from '../../shared/progression';
import type { GameState } from '../../shared/types';
import { dispatch } from '../store';
import { Button } from '../ui/Button';

export function TierSection({ s }: { s: GameState }) {
  const cur = getTier(s.tier);
  const next = nextTier(s);
  if (!next) return <section class="panel-section"><h3>{cur.name}</h3><p class="muted">Mehr Ausbau gibt es nicht – du bist ganz oben angekommen.</p></section>;
  const brings = MILESTONES.find((m) => m.tier === next.id)?.unlocks.map((u) => UNLOCKS[u]?.title).filter(Boolean) ?? [];
  const ok = s.taler >= next.price && s.ruf >= next.ruf;
  return (
    <section class="panel-section">
      <h3>Deine {cur.name}</h3>
      <p>Nächster Schritt: die <strong>{next.name}</strong> für {next.price.toLocaleString('de-DE')} Taler und {next.ruf} Ruf.</p>
      {brings.length > 0 && <p class="muted" style={{ fontSize: '.9em' }}>Bringt: {brings.join(', ')}</p>}
      <Button variant="primary" disabled={!ok} onClick={() => dispatch({ type: 'upgradeTier' })}>{`Zur ${next.name} aufsteigen · ${next.price} Taler`}</Button>
      {s.ruf < next.ruf && <p class="muted" style={{ fontSize: '.85em' }}>ab {next.ruf} Ruf</p>}
    </section>
  );
}
