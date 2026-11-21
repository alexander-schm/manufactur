import { makeCharacter } from '../../../shared/character';
import { PRESTIGE_NAME } from '../../../shared/masterwork';
import { PROJECTS, ROMAN } from '../../../shared/village/projects';
import type { VillageView } from '../../../shared/village/types';
import { Character } from '../../art/character/Character';
import { Pot } from '../../art/Pot';
import { Medal } from '../../art/workshop/Plinth';
import { T } from '../../strings';
import { Paper } from '../../ui/Paper';

/** The village museum: one shelf per member with their best masterworks. */
export function MuseumView({ v }: { v: VillageView }) {
  const level = Math.max(1, v.projects.levels.museum ?? 1);
  const any = v.members.some((m) => (v.museum[m.playerId]?.length ?? 0) > 0);
  return (
    <Paper tape seed={44} class="museum">
      <h3 class="museum-title">{T.vl.museumTitle(ROMAN[level - 1])}</h3>
      <p class="muted museum-benefit">{PROJECTS.museum.benefit(level)}</p>
      {!any && <p class="hand-note">{T.vl.museumEmpty}</p>}
      {any && <div class="museum-shelves">{v.members.map((m) => {
        const pieces = v.museum[m.playerId] ?? [];
        return (
          <div class="museum-shelf" data-shelf={m.playerId}>
            <div class="museum-owner">
              <Character look={makeCharacter(m.avatarSeed)} pose="idle" seed={m.avatarSeed} size={26} wobble={false} />
              <strong>{m.name}</strong>
            </div>
            <div class="museum-pieces">
              {pieces.map((p) => (
                <figure class="museum-piece" data-museum-piece={p.id} title={`${p.design.name} · ${PRESTIGE_NAME[p.prestige]}`}>
                  <Pot design={p.design} glazeColor={p.glazeColor} effect={p.effect} quality={p.quality} size={64} fit wobble={false} mark={m.makerMark} />
                  <Medal prestige={p.prestige} size={18} />
                  <figcaption>{p.design.name}</figcaption>
                </figure>
              ))}
              {pieces.length === 0 && <span class="muted museum-empty">{T.vl.museumShelfEmpty}</span>}
            </div>
            <div class="museum-plank" aria-hidden="true" />
          </div>
        );
      })}</div>}
    </Paper>
  );
}
