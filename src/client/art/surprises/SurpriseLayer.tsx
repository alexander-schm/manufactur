/**
 * Everything surprise-related in the workshop, drawn above the stations and workers, in this order:
 * the cat (when its play needs it up here), surprise actors (the birthday cake), bubbles, the wall cabinet, and the hit areas last.
 * Actors draw from `sx.plays` / `sx.calendar` alone: whether a surprise may play is the scheduler's business,
 * so a forced play always draws. Each actor root carries `data-surprise="<def id>"`.
 */
import { makeCharacter } from '../../../shared/character';
import type { GameState, Worker } from '../../../shared/types';
import { CURIOSITIES } from '../../../shared/content/curiosities';
import { CAT_HITS, SPOTS, catPlace, catSpot } from '../../surprises/spots';
import type { Play, SurpriseView } from '../../surprises/types';
import { Character } from '../character/Character';
import { inkStyle } from '../ink';
import { ScenePot } from '../workshop/stations/Stations';
import { Cabinet } from './Cabinet';
import { BirthdayCake } from './Seasonal';
import { CatGift, CatHit, WorkshopCat, type CatPose } from './Cat';

/** Whether a surprise is on right now: in today's calendar, or playing (a dev-forced play included). */
export function showing(sx: SurpriseView, id: string): boolean {
  return sx.calendar.includes(id) || sx.plays.some((p) => p.id === id);
}

/** Whole years since the workshop opened (local calendar years), at least one. */
export function workshopYears(sx: SurpriseView): number {
  return sx.created ? Math.max(1, sx.local.year - sx.created.year) : 1;
}

/** Plays that pose the cat, strongest first. */
const CAT_PLAYS: [string, CatPose][] = [['katze-beleidigt', 'swat'], ['katze-streicheln', 'purr']];

/**
 * The play that poses the cat right now, if any: a pet (a swat beats a purr) wins, and is drawn wherever the cat is;
 * otherwise the play that took the cat away (onto the kiln, into a pot, to its gift, onto the shelf).
 */
export function catPlay(plays: Play[]): { id: string; pose: CatPose } | null {
  for (const [id, pose] of CAT_PLAYS) if (plays.some((p) => p.id === id)) return { id, pose };
  const away = catPlace(plays);
  return away.id ? { id: away.id, pose: away.place as CatPose } : null;
}

/** Who catches the pot the cat nudges off the shelf: the first idle worker, else the first worker. */
export function catcherOf(s: GameState): Worker | undefined {
  return s.workers.find((w) => !w.stationId) ?? s.workers[0];
}

/**
 * The cat's gift: the first one ever is the sock; later `seed % 3` picks. A record made by this very play
 * (it arrives while the gift is shown) still counts as the first; an earlier one is at least a cooldown older.
 */
export function giftOf(state: GameState, play: Play): 0 | 1 | 2 {
  const t = state.curiosities?.['katze-geschenk'];
  const first = t === undefined || t >= play.startedAt - 60 * 60_000;
  return first ? 2 : ((play.seed % 3) as 0 | 1 | 2);
}

/** The worker who catches the nudged pot, standing at the shelf's foot, with the pot in their hands (the still pose: the catch). */
function PotCatch({ state, worker, still }: { state: GameState; worker: Worker; still: boolean }) {
  const { x, y } = SPOTS.catcher;
  const look = makeCharacter(worker.seed);
  // Character box: 100 wide, 150 tall above the feet; the hands sit at (60, 118) in its 136×204 box, scaled about the feet by the height
  const k = 100 / 136;
  const handsY = y - 150 + (196 - (196 - 118) * look.heightMul + 4) * k;
  const goods = state.goods.find((g) => g.count > 0);
  const design = state.designs.find((d) => d.id === goods?.designId) ?? state.designs[0];
  const glaze = design && (state.glazes.find((g) => g.id === design.glazeId)?.color ?? '#c8784c');
  // the pot starts at the shelf's top corner, in front of the cat's paw
  const from = { x: SPOTS.catShelf.x + 86 - x, y: SPOTS.catShelf.y - (handsY + 6) };
  return (
    <g class={still ? 'pot-catch still' : 'pot-catch'}>
      <g transform={`translate(${x - 50} ${y - 150})`}>
        <Character look={look} pose="catch" seed={worker.seed} size={100} title={worker.name} />
      </g>
      {design && (
        <g class="nudged-pot" style={{ '--fx': `${from.x}px`, '--fy': `${from.y}px` }}>
          <ScenePot x={x} y={handsY + 8} size={40} design={{ ...design, handle: 'none' }} color={glaze!} />
        </g>
      )}
      {/* the hands, in front of the pot they hold */}
      <circle cx={x - 8} cy={handsY} r="4.6" fill={look.skin} style={inkStyle(1.6)} />
      <circle cx={x + 8} cy={handsY} r="4.6" fill={look.skin} style={inkStyle(1.6)} />
      <g class="catch-phew" font-family="var(--font-hand)" fill="var(--line)">
        <path d={`M${x + 22} ${y - 128} q-5 8 0 11 q5 -3 0 -11 Z`} fill="#bfe3f2" style={inkStyle(1.2)} />
        <rect x={x - 100} y={y - 136} width="54" height="28" rx="12" fill="var(--paper)" style={inkStyle(1.4)} />
        <path d={`M${x - 52} ${y - 116} l10 6 l-4 -10`} fill="var(--paper)" style={inkStyle(1.4)} />
        <text x={x - 73} y={y - 115} font-size="19" text-anchor="middle">Puh!</text>
      </g>
    </g>
  );
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
  const place = catPlace(sx.plays);
  const gift = sx.plays.find((p) => p.id === 'katze-geschenk');
  const nudge = sx.plays.some((p) => p.id === 'katze-schubs') ? catcherOf(state) : undefined;
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
      {gift && place.place === 'gift' && <CatGift x={SPOTS.gift.x - 80} y={SPOTS.gift.y} kind={giftOf(state, gift)} still={sx.still} />}

      {showing(sx, 'geburtstag') && (
        <g data-surprise="geburtstag"><BirthdayCake x={SPOTS.cake.x} y={SPOTS.cake.y} years={workshopYears(sx)} still={sx.still} /></g>
      )}
      <Cabinet x={SPOTS.cabinet.x} y={SPOTS.cabinet.y} found={found.length} fresh={fresh} onClick={sx.readOnly ? undefined : onCabinet} />
      {/* in front of the wall cabinet: the catcher stands right below it */}
      {nudge && place.place === 'shelf' && (
        <g data-surprise="katze-schubs" pointer-events="none"><PotCatch state={state} worker={nudge} still={sx.still} /></g>
      )}
      <CatHit x={catAt.x} y={catAt.y} hit={CAT_HITS[place.place]} onClick={() => sx.click('cat')} />
    </g>
  );
}
