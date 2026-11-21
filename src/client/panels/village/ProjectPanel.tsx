import { makeCharacter } from '../../../shared/character';
import { MATERIALS } from '../../../shared/content';
import { fmtTaler } from '../../../shared/format';
import { PRESTIGE_NAME, PRESTIGE_RANK } from '../../../shared/masterwork';
import type { GameState } from '../../../shared/types';
import { levelBonus, villageLevel } from '../../../shared/village/level';
import {
  instantiateStage, MAX_PROJECT_LEVEL, MAX_STAGE_SHARE, maxProjectUnits, partSize, PROJECT_ORDER, PROJECTS, ROMAN, stageShares,
} from '../../../shared/village/projects';
import { villageStorePrice } from '../../../shared/village/specialties';
import { activeMembers } from '../../../shared/village/state';
import type { ActivePart, ActiveProject, ProjectPart, VillageAction, VillageView } from '../../../shared/village/types';
import { Character } from '../../art/character/Character';
import { Medal } from '../../art/workshop/Plinth';
import { T } from '../../strings';
import { Button } from '../../ui/Button';
import { Paper } from '../../ui/Paper';
import { villageDispatch } from '../../villageStore';
import { Stars } from '../common';
import { SWATCH } from './GivePicker';
import { goodsLabel, GoodsButtons } from './JointOrdersPanel';

type Contribute = (a: VillageAction) => void;
type Props = { v: VillageView; s: GameState; meId: string; now: number; onContribute: Contribute };

export function projectPartLabel(p: ProjectPart): string {
  switch (p.kind) {
    case 'material': return `${p.count} ${MATERIALS[p.material]?.name ?? p.material}`;
    case 'goods': return goodsLabel(p);
    case 'taler': return T.vl.talerPart(p.amount);
    case 'masterwork': return T.vl.masterworkPart(p.count, PRESTIGE_NAME[p.minPrestige]);
  }
}

/** What this player can put into one part right now (all limits from the shared 70 % rule). */
function PartButtons({ v, s, meId, a, i, onContribute }: { v: VillageView; s: GameState; meId: string; a: ActiveProject; i: number; onContribute: Contribute }) {
  const p = a.parts[i];
  const left = maxProjectUnits(a, i, meId);
  if (left <= 0) return null;
  const send = (extra: Omit<Extract<VillageAction, { type: 'contributeProject' }>, 'type' | 'projectId' | 'part'>) =>
    onContribute({ type: 'contributeProject', projectId: a.projectId, part: i, ...extra });
  switch (p.kind) {
    case 'material': {
      const have = Math.floor(s.materials[p.material] ?? 0), price = villageStorePrice(p.material);
      return (
        <div class="row joint-actions">
          {have > 0 && <Button small variant="good" onClick={() => send({ count: Math.min(left, have), source: 'own' })}>{T.vl.fromStock(Math.min(left, have))}</Button>}
          <Button small variant="quiet" title={`${fmtTaler(price)} Taler pro Stück`} disabled={s.taler < price}
            onClick={() => send({ count: Math.max(1, Math.min(left, Math.floor(s.taler / price))), source: 'store' })}>{T.vl.buyInStore}</Button>
        </div>
      );
    }
    case 'goods':
      return (
        <div class="row joint-actions">
          <GoodsButtons s={s} p={p} left={left} give={(g, count, substitute) => send({ count, source: substitute ? 'substitute' : 'own', designId: g.designId, quality: g.quality, effect: g.effect })} />
        </div>
      );
    case 'taler': {
      const n = Math.min(left, Math.floor(s.taler));
      return <div class="row joint-actions"><Button small variant="good" disabled={n <= 0} onClick={() => send({ count: n, source: 'own' })}>{T.vl.giveTaler(n)}</Button></div>;
    }
    case 'masterwork': {
      const lent = new Set(v.lentMasterworks);
      const mine = s.masterworks.filter((m) => PRESTIGE_RANK[m.prestige] >= PRESTIGE_RANK[p.minPrestige] && !lent.has(`${meId}:${m.id}`));
      return (
        <div class="row joint-actions">
          {mine.map((m) => (
            <Button small variant="good" data-lend={m.id} onClick={() => send({ count: 1, source: 'own', masterworkIds: [m.id] })}>
              <Medal prestige={m.prestige} size={14} /> {T.vl.lendMasterwork(m.design.name, PRESTIGE_NAME[m.prestige])}
            </Button>
          ))}
          {mine.length === 0 && <span class="muted">{T.vl.noMasterwork(PRESTIGE_NAME[p.minPrestige])}</span>}
          <span class="muted small-note">{T.vl.lentNote}</span>
        </div>
      );
    }
  }
}

function PartRow({ p, fresh = false, children }: { p: ActivePart; fresh?: boolean; children?: preact.ComponentChildren }) {
  const size = partSize(p);
  const show = (n: number) => (p.kind === 'taler' ? fmtTaler(n) : String(n));
  return (
    <div class="joint-part" data-part={p.kind}>
      <div class="card-row">
        {p.kind === 'material' && <span class="mat-dot big" style={{ background: SWATCH[p.material] ?? '#ddd' }} />}
        {p.kind === 'taler' && <span class="part-icon" aria-hidden="true">🪙</span>}
        {p.kind === 'masterwork' && <Medal prestige={p.minPrestige} size={22} />}
        <div class="grow">
          <strong>{projectPartLabel(p)}</strong>{p.kind === 'goods' && p.minQuality > 1 && <> · mind. <Stars n={p.minQuality} /></>}
          {!fresh && <div class="progressbar"><div style={{ width: `${Math.min(100, (p.filled / size) * 100)}%` }} /></div>}
          {!fresh && <span class="muted">{show(p.filled)}/{show(size)}</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Faces({ v, meId, ids }: { v: VillageView; meId: string; ids: string[] }) {
  if (!ids.length) return null;
  return (
    <div class="contributors">
      {ids.map((id) => {
        const m = v.members.find((x) => x.playerId === id);
        return m ? <span class="contrib" title={m.name}><Character look={makeCharacter(m.avatarSeed)} pose="work" seed={m.avatarSeed} size={30} wobble={false} />{m.playerId === meId ? 'du' : m.name}</span> : null;
      })}
    </div>
  );
}

function ActiveCard({ v, s, meId, a, lonely, onContribute }: { v: VillageView; s: GameState; meId: string; a: ActiveProject; lonely: boolean; onContribute: Contribute }) {
  const def = PROJECTS[a.projectId];
  const share = stageShares(a)[meId] ?? 0;
  const open = a.parts.map((p, i) => ({ p, i })).filter(({ p }) => p.filled < partSize(p));
  const capReached = open.length > 0 && (share >= MAX_STAGE_SHARE - 1e-9 || open.every(({ i }) => maxProjectUnits(a, i, meId) === 0));
  const who = [...new Set(a.parts.flatMap((p) => Object.entries(p.by).filter(([, n]) => n > 0).map(([id]) => id)))];
  return (
    <Paper tape seed={a.stage + 31} class="joint-card project-card" data-project-active={a.projectId}>
      <h3 style={{ margin: 0 }}>{T.vl.stageTitle(def.name, ROMAN[a.level - 1], a.stage + 1, def.stages.length, def.stages[a.stage].name)}</h3>
      <div class="muted">{def.description}</div>
      <p class="together">{T.vl.together}</p>
      <div class="project-share">
        <span>{T.vl.myShare(Math.round(share * 100))}</span>
        <div class="progressbar share-bar" aria-hidden="true"><div style={{ width: `${Math.min(100, (share / MAX_STAGE_SHARE) * 100)}%` }} /></div>
      </div>
      {capReached && <p class="hand-note">{T.vl.capReached}</p>}
      {lonely && <p class="hand-note">{T.vl.needTwo}</p>}
      {a.parts.map((p, i) => <PartRow p={p}><PartButtons v={v} s={s} meId={meId} a={a} i={i} onContribute={onContribute} /></PartRow>)}
      <Faces v={v} meId={meId} ids={who} />
    </Paper>
  );
}

function OfferCard({ v, s, meId, id, active, onContribute }: { v: VillageView; s: GameState; meId: string; id: string; active: number; onContribute: Contribute }) {
  const def = PROJECTS[id];
  const level = Math.min(MAX_PROJECT_LEVEL, (v.projects.levels[id] ?? 0) + 1) as 1 | 2 | 3;
  // what the first stage would look like if it started now: a virtual, empty stage
  const a: ActiveProject = { projectId: id, level, stage: 0, parts: instantiateStage(def, level, 0, active), startedAt: 0, stageStartedAt: 0 };
  return (
    <Paper tape seed={id.length * 7} class="joint-card project-card" data-project-offer={id}>
      <h3 style={{ margin: 0 }}>{def.name}{level > 1 ? ` ${ROMAN[level - 1]}` : ''}</h3>
      <div class="muted">{def.description}</div>
      <p class="project-first"><strong>{T.vl.firstStage(a.parts.map(projectPartLabel).join(', '))}</strong></p>
      {a.parts.map((p, i) => <PartRow p={p} fresh><PartButtons v={v} s={s} meId={meId} a={a} i={i} onContribute={onContribute} /></PartRow>)}
    </Paper>
  );
}

/** The grand project: the offers to choose from, or the stage being built. */
export function ProjectCard({ v, s, meId, now, onContribute }: Props) {
  const { active, offered, levels } = v.projects;
  const activeCount = activeMembers(v, now).length;
  const lonely = activeCount < 2;
  if (active) return <ActiveCard v={v} s={s} meId={meId} a={active} lonely={lonely} onContribute={onContribute} />;
  if (offered.length) {
    return (
      <div class="cards">
        <p class="together">{T.vl.firstChooses}</p>
        {lonely && <p class="hand-note">{T.vl.needTwo}</p>}
        {offered.map((id) => <OfferCard v={v} s={s} meId={meId} id={id} active={activeCount} onContribute={onContribute} />)}
      </div>
    );
  }
  const allDone = Object.keys(PROJECTS).every((id) => (levels[id] ?? 0) >= MAX_PROJECT_LEVEL);
  return <p class="muted">{allDone ? T.vl.allProjects : T.vl.noProjects}</p>;
}

export function ProjectPanel({ v, s, meId, now, onOpenMuseum }: Omit<Props, 'onContribute'> & { onOpenMuseum?: () => void }) {
  const done = PROJECT_ORDER.filter((id) => (v.projects.levels[id] ?? 0) > 0);
  const level = villageLevel(v);
  return (
    <div>
      <ProjectCard v={v} s={s} meId={meId} now={now} onContribute={(a) => void villageDispatch(a)} />
      {done.length > 0 && (
        <section class="panel-section">
          <h3>{T.vl.built}</h3>
          <ul class="project-done">
            {done.map((id) => {
              const def = PROJECTS[id], l = v.projects.levels[id];
              return (
                <li data-project-done={id}>
                  <strong>{def.name} {ROMAN[l - 1]}</strong> <span class="muted">{def.benefit(l)}</span>
                  {id === 'museum' && onOpenMuseum && <> <button class="link" onClick={onOpenMuseum}>{T.vl.openMuseum}</button></>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <p class="muted">{T.vl.villageLevel(level, Math.round((levelBonus(v) - 1) * 100))}</p>
    </div>
  );
}
