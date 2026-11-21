/**
 * Everything surprise-related in the workshop, drawn above the stations and workers, in this order:
 * the cat (when its play needs it up here), surprise actors, bubbles, the wall cabinet, and the hit areas last.
 * Actors draw from `sx.plays` / `sx.calendar` alone: whether a surprise may play is the scheduler's business,
 * so a forced play always draws. Each actor root carries `data-surprise="<def id>"`.
 */
import type { GameState } from '../../../shared/types';
import { CURIOSITIES } from '../../../shared/content/curiosities';
import { SPOTS, catSpot } from '../../surprises/spots';
import type { Play, SurpriseView } from '../../surprises/types';
import { Cabinet } from './Cabinet';
import { CatHit, WorkshopCat, type CatPose } from './Cat';

/** Plays that pose the cat, strongest first. */
const CAT_PLAYS: [string, CatPose][] = [['katze-beleidigt', 'swat'], ['katze-streicheln', 'purr']];

/** The play that poses the cat right now, if any (a swat beats a purr). */
export function catPlay(plays: Play[]): { id: string; pose: CatPose } | null {
  for (const [id, pose] of CAT_PLAYS) if (plays.some((p) => p.id === id)) return { id, pose };
  return null;
}

type Props = {
  state: GameState; sx: SurpriseView;
  /** Opens the album from the wall cabinet; absent on visits. */
  onCabinet?: () => void;
  /** Server time of the last album visit; newer entries make the cabinet sparkle. */
  albumSeen?: number;
};

export function SurpriseLayer({ state, sx, onCabinet, albumSeen = 0 }: Props) {
  const cat = catPlay(sx.plays);
  const catAt = catSpot(sx.plays);
  // only entries the album knows count (an old or foreign save may carry unknown keys)
  const found = Object.entries(state.curiosities ?? {}).filter(([id]) => CURIOSITIES[id]);
  const fresh = !sx.readOnly && found.some(([, t]) => t > albumSeen);
  return (
    <g class="surprise-layer">
      {cat && (
        <g data-surprise={cat.id}>
          <WorkshopCat x={catAt.x} y={catAt.y} pose={cat.pose} still={sx.still} />
        </g>
      )}
      <Cabinet x={SPOTS.cabinet.x} y={SPOTS.cabinet.y} found={found.length} fresh={fresh} onClick={sx.readOnly ? undefined : onCabinet} />
      <CatHit x={catAt.x} y={catAt.y} onClick={() => sx.click('cat')} />
    </g>
  );
}
