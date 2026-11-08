import { DECOR, MAX_DECOR_PLACED } from '../../../shared/village/decor';
import type { GameState } from '../../../shared/types';
import { dispatch } from '../../store';
import { Button } from '../../ui/Button';

export function DecorSection({ s }: { s: GameState }) {
  return (
    <section class="panel-section">
      <h3>Dekoration ({s.decorPlaced.length}/{MAX_DECOR_PLACED} aufgestellt)</h3>
      {s.decor.length === 0 && <p class="muted">Dekoration gibt es als Belohnung für Großaufträge im Dorf.</p>}
      <div class="cards">
        {s.decor.map((id) => {
          const placed = s.decorPlaced.includes(id);
          return (
            <div class="card card-row">
              <div class="grow"><strong>{DECOR[id]?.name ?? id}</strong></div>
              {placed ? <Button small variant="quiet" onClick={() => dispatch({ type: 'removeDecor', id })}>Wegräumen</Button>
                : <Button small variant="good" disabled={s.decorPlaced.length >= MAX_DECOR_PLACED} onClick={() => dispatch({ type: 'placeDecor', id })}>Aufstellen</Button>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
