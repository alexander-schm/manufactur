import { makeCharacter, type CharacterLook } from '../../shared/character';
import type { GameState, StationKind } from '../../shared/types';
import { Character } from '../art/character/Character';
import { Button } from '../ui/Button';
import type { PanelId } from './PanelHost';

export const GRETA: CharacterLook = { ...makeCharacter(1902), quirk: 'bigHat', eyes: 'glasses', hairStyle: 'bun', hairColor: '#d9d4cc', facial: 'freckles', mouth: 'grin', body: 'round', heightMul: 0.95, outfit: '#9a7ccf' };

type Step = { text: string; done: (s: GameState) => boolean; target?: StationKind; panel?: PanelId; panelArg?: (s: GameState) => string | undefined; button?: string };

const anyBatchAt = (s: GameState, stages: string[]) => s.batches.some((b) => stages.includes(b.stage));

export const ONBOARDING: Step[] = [
  { text: 'Willkommen in deiner Werkstatt! Ich bin Greta. Zuerst brauchst du Ton – hol dir welchen im Laden.', target: 'prepBench', panel: 'shop', button: 'Zum Laden',
    done: (s) => (s.materials.ton ?? 0) > 30 || s.stats.made > 0 || s.batches.length > 0 },
  { text: 'Jetzt an die Scheibe! Tipp auf die Töpferscheibe und wähle deinen ersten Becher.', target: 'wheel', panel: 'station', panelArg: (s) => s.stations.find((x) => x.kind === 'wheel')?.id, button: 'Zur Scheibe',
    done: (s) => s.batches.length > 0 || s.stats.made > 0 },
  { text: 'Wunderbar! Nach dem Trocknen geht’s ab in den Ofen. Schau ruhig zu, wie es glüht.', target: 'kiln',
    done: (s) => anyBatchAt(s, ['bisque', 'glaze', 'glazeFire']) || s.stats.made > 0 },
  { text: 'Jetzt bekommen deine Stücke Farbe am Glasurtisch – und dann noch einmal in den Ofen.', target: 'glazeTable',
    done: (s) => anyBatchAt(s, ['glazeFire']) || s.stats.made > 0 },
  { text: 'Fertig! Dein Marktstand verkauft die Becher ganz von allein – auch wenn du nicht da bist.', target: 'marketStall',
    done: (s) => s.stats.sold > 0 },
  { text: 'Die Leute im Dorf haben von dir gehört! Schau ins Auftragsbrett und liefere deinen ersten Auftrag.', panel: 'orders', button: 'Aufträge ansehen',
    done: (s) => s.stats.ordersDone > 0 },
  { text: 'Jetzt wird’s persönlich: Gestalte im Entwurfsstudio deinen ganz eigenen Becher.', panel: 'studio', button: 'Zum Studio',
    done: (s) => s.stats.designsSaved > 0 },
  { text: 'Zum Schluss ein Geheimnis: Probier eine eigene Glasur! Brenne eine Probekachel im Studio.', panel: 'studio', panelArg: () => 'glaze', button: 'Glasurversuch',
    done: (s) => s.stats.experiments > 0 },
];

/** Index of the first unfinished step (ONBOARDING.length when done). */
export function onboardingStep(s: GameState): number {
  const i = ONBOARDING.findIndex((st) => !st.done(s));
  return i < 0 ? ONBOARDING.length : i;
}

export function OnboardingCard({ s, onOpen, onSkip }: { s: GameState; onOpen: (id: PanelId, arg?: string) => void; onSkip: () => void }) {
  const i = onboardingStep(s);
  if (i >= ONBOARDING.length) return null;
  const step = ONBOARDING[i];
  return (
    <aside class="mentor" aria-live="polite">
      <Character look={GRETA} pose={i === 0 ? 'wave' : 'idle'} seed={7} size={70} wobble={false} />
      <div class="mentor-bubble">
        <div class="mentor-head"><strong>Meisterin Greta</strong><span class="muted">{i + 1}/{ONBOARDING.length}</span></div>
        <p>{step.text}</p>
        <div class="row">
          {step.panel && <Button small variant="primary" onClick={() => onOpen(step.panel!, step.panelArg?.(s))}>{step.button}</Button>}
          <button class="link" onClick={onSkip}>Ich komm allein zurecht</button>
        </div>
      </div>
    </aside>
  );
}
