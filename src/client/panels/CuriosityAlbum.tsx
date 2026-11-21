import type { GameState } from '../../shared/types';
import { DECOR } from '../../shared/village/decor';
import { CuriosityCard } from '../art/surprises/cards';
import type { Rarity } from '../surprises/types';
import { albumView } from './albumLogic';

const STARS: Record<Rarity, string> = { C: '★', R: '★★', L: '★★★' };

/** The Kuriositätenkabinett: every curiosity as a card, unfound ones only as a silhouette with their hint. */
export function CuriosityAlbum({ s }: { s: GameState }) {
  const v = albumView(s);
  return (
    <div class="book curio-book">
      <div class="book-page">
        <h3>{`${v.found} / ${v.total} entdeckt`}</h3>
        <p class="hand-note">
          {v.nextPrize ? `Noch ${v.nextPrize.left} bis zum nächsten Geschenk: ${DECOR[v.nextPrize.decor].name}` : 'Alle Geschenke abgeholt – jetzt heißt es nur noch staunen.'}
        </p>
      </div>
      {v.groups.map((g) => (
        <div class="book-page">
          <h3>{g.title}</h3>
          <div class="curio-grid">
            {g.cards.map((c) => (
              <div class={`curio-card${c.found ? '' : ' unfound'}`} data-curiosity={c.id}>
                <CuriosityCard card={c} />
                <div class="curio-head">
                  <strong>{c.name}</strong>
                  <span class="curio-stars" aria-label={`Seltenheit ${STARS[c.rarity].length}`}>{STARS[c.rarity]}</span>
                </div>
                <div class="hand-note">{c.text}</div>
                {c.foundAt !== null && <div class="muted curio-date">{`entdeckt am ${new Date(c.foundAt).toLocaleDateString('de-DE')}`}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
