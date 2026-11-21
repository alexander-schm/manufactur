# Village Long Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the village weeks-long shared goals: joint orders that keep coming (now with stoneware, porcelain, tiles and great-kiln pieces), a great kiln (Gemeinschaftsofen) that fires by alarm, five grand building projects with three levels each, and a village level. All of it changes the map and is tied to the solo branches.

**Architecture:** All rules live in pure, deterministic modules under `src/shared/village/`: `level.ts`, `goods.ts`, `kiln.ts`, `projects.ts`, `projectActions.ts`, `benefits.ts`, `museum.ts`, `tick.ts`. They are wired into `applyVillageAction` and a new `tickVillage`. The `VillageDO` runs `tickVillage` on every load and from its alarm, and stores the new state and the outbox entries in one atomic write. Lasting benefits reach workshops through `VillageSnapshot.projects` (workshop-side: Ruf trickle, market day, kaolin price) or are applied village-side (Rathaus joint orders). The client gets map art (great kiln, project sites with stage and level looks, level decorations), three panels and a museum view, all screenshot-reviewed.

**Tech Stack:** TypeScript, Preact + SVG, Vitest (+ Workers pool with `cloudflare:test`), Cloudflare Worker + D1 + Durable Object (alarms), Playwright for screenshots/e2e.

**Spec:** `docs/superpowers/specs/2026-11-21-village-long-goals-design.md` (builds on `docs/superpowers/specs/2026-11-21-branches-and-long-goals-design.md`, implemented on this branch; interface names in `docs/superpowers/plans/2026-11-21-branches-and-long-goals.md`)

Delivery order follows spec §6: joint orders (Tasks 1–2), great kiln (Tasks 3–6), grand projects (Tasks 7–9, Kaolingrube gated on porcelain), then map, panels and e2e (Tasks 10–13).

## Global Constraints

- All in-game text is German. Exact texts given in this plan are copy: use them verbatim.
- `src/shared` stays deterministic: no `Date.now()`, no `Math.random()`. Village randomness only through `v.rng` (`nextRandom`/`pick` from `src/shared/rng.ts`), workshop randomness through `state.rng`.
- `VillageState.schemaVersion` 1 → 2 with `migrateVillage`. Existing villages keep everything (spec §3).
- **GameState: optional fields only, no `SCHEMA_VERSION` bump** (stays 3). The surprises project, executed after this one, does GameState 3 → 4. New optional fields: `GameState.kilnMasterwork?`, `VillageSnapshot.projects?`, `VillageSnapshot.rufCarry?`. Do not touch `docs/superpowers/plans/2026-11-21-surprises.md`.
- Village → workshop changes travel only as `WorkshopDelta` deliveries through the DO outbox (exactly-once keys). A new village state and its outbox entries are always stored in one `storage.put({...})`.
- Anti-goals (spec §2): one rich player never finishes a stage alone (**no single player may give more than 70 % of a stage's value**, village-store purchases and Taler included). Absent players never block or lose anything (base share `BASE_SHARE` for every member). No step waits on a specific person.
- **Active member:** `lastSeen` within the last 7 days. A stage needs **two contributors**.
- **Great-kiln-only effects (Ascheglasur, Flammenspur, Ascheanflug) are never produced by experiments** (`matchEffect`), never hinted (`hintFor`), get overlays in `src/client/art/Pot.tsx` `Effect` (the existing test that every `EFFECTS` id renders a non-null overlay must stay green) and enter the collection book.
- Every goods part that needs stoneware, porcelain, tiles or an effect accepts an **earthenware substitute at 3× the count**.
- Balance context: Manufaktur costs 250.000 Taler, Hofmanufaktur 2.500.000. Late-game income is about 0,5–1 Mio. Taler/day for an optimizer. Taler parts are a big sink but only one part per stage.
- Taler amounts shown to players use `fmtTaler` from `src/shared/format.ts`.
- Art: hand-inked style of `docs/art/art-style-reference.png`. There are no owner review gates. Each art step is a **self-review**: run `npm run dev`, then `npm run shot -- "<url>" <name>`, look at both PNGs, and fix until they pass. Shot output must show `horizontalOverflow=0px` and no `ERRORS`. Commit the PNGs in `docs/screens/`.
- Tests: `npx vitest run`, `npm run test:worker`, `npm run check`, e2e `node test/e2e/village-smoke.mjs http://localhost:5173` (dev server with `DEV_FAST=1`). Known flake: "[Review Focus 1] 30 days of absence" in `test/shared/advance.test.ts`. Re-run it alone before you treat it as a failure.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stay on branch `feat/endgame`. Commit only the files of the current task (`git add <paths>`).

## Review Focus

1. **A v1 village with 10 members, open joint orders, a full news list and guestbooks migrates on first load and stays small.** Expected: it keeps everything, the village level equals `completedJoint`, and the stored state (with full museums) is under 100 KB, well inside the DO's 128 KiB per-value limit. Tests: Task 1 and Task 6.
2. **A kiln firing whose alarm runs twice, or whose delivery is drained twice, or which runs while a player acts.** Expected: every contributor gets their pieces exactly once. Test: Task 6 worker test.
3. **The 70 % boundary reached through a big Taler payment, village-store purchases or earthenware substitutes.** Expected: a player at 69 % is refused anything that would cross 70 %, with the German error, and the exact boundary is allowed. Test: Task 8.
4. **Two players pick different offered projects at nearly the same time.** Expected: the first contribution wins. The second gets "Das Dorf baut gerade schon: …", pays nothing and loses nothing. Test: Task 8.
5. **A long catch-up (days offline) across a Saturday market day.** Expected: stall sales inside the window are priced with the market-day factor and sales outside it are not. The total equals selling the segments separately. Test: Task 9.

---

## File Structure

**Create (shared, `src/shared/village/`)**
- `level.ts`: village level, reward bonus, level decorations, level-up news.
- `goods.ts`: goods-part matching shared by joint orders and projects (exact pieces or earthenware substitute).
- `kiln.ts`: great kiln constants, heat, loading, firing and effect rolls.
- `museum.ts`: which masterworks a member shows in the museum.
- `projects.ts`: project data (`PROJECTS`), stage instantiation, shares, the 70 % rule, offers and rewards.
- `projectActions.ts`: the `contributeProject` action (all part kinds), stage and project completion.
- `benefits.ts`: lasting project benefits, read from a workshop's `VillageSnapshot` or from `VillageState`.
- `tick.ts`: `tickVillage` (kiln building, kiln phases, project offers) and `nextVillageWake`.

**Create (client)**
- `src/client/art/village/GreatKiln.tsx`, `ProjectSites.tsx`, `Decorations.tsx`
- `src/client/panels/village/GreatKilnPanel.tsx`, `ProjectPanel.tsx`, `MuseumView.tsx`
- `src/client/dev/VillageSitesPage.tsx`

**Create (tests)**
- `test/shared/village/{level,kiln,kiln-masterwork,projects,project-actions,benefits,migrate}.test.ts`
- `test/client/village-longgoals.test.tsx`

**Modify:** `src/shared/village/{types,state,joint,apply,buildings,decor,specialties}.ts`, `src/shared/{types,masterwork,market,advance,discovery,collection,actions}.ts`, `src/shared/content/effects.ts`, `src/worker/{village,dev,index}.ts`, `src/client/art/Pot.tsx`, `src/client/art/village/{VillageMap,Buildings}.tsx`, `src/client/art/village/village.css`, `src/client/art/workshop/Decor.tsx`, `src/client/panels/{RecipeBook,MasterworkPanel,StationPanel,collectionLogic,CollectionBook}.tsx|ts`, `src/client/panels/village/{VillagePanel,JointOrdersPanel}.tsx`, `src/client/dev/{mockVillage.ts,VillagePage.tsx,GamePage.tsx}`, `src/client/main.tsx` (dev route table), `test/shared/village/helpers.ts`, `test/shared/village/joint.test.ts`, `test/shared/{discovery,collection,masterwork}.test.ts`, `test/worker/village.test.ts`, `test/e2e/village-smoke.mjs`, `README.md`.

---

### Task 1: VillageState schema 2, migration, village level

**Files:**
- Create: `src/shared/village/level.ts`, `test/shared/village/level.test.ts`, `test/shared/village/migrate.test.ts`
- Modify: `src/shared/village/types.ts`, `src/shared/village/state.ts`, `src/client/dev/mockVillage.ts`, `test/shared/village/helpers.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `Member.tier: Tier`
  - `JointPart` goods variant gains `body?: BodyId; effect?: string`; `export type GoodsPart = Extract<JointPart, { kind: 'goods' }>`
  - `export type ProjectPart = { kind: 'material'; material: string; count: number } | GoodsPart | { kind: 'taler'; amount: number } | { kind: 'masterwork'; count: number; minPrestige: Prestige }`
  - `export type ActivePart = ProjectPart & { filled: number; by: Record<string, number> }`. `filled` and `by` are in required units (Taler for a taler part).
  - `export interface ActiveProject { projectId: string; level: 1 | 2 | 3; stage: number; parts: ActivePart[]; startedAt: number; stageStartedAt: number }`
  - `export interface ProjectsState { active: ActiveProject | null; offered: string[]; levels: Record<string, number> }` (`levels[id]` = highest completed level, 0–3)
  - `export interface KilnLoad { playerId: string; design: Design; count: number; wood: number; qualityScore: number; makerName: string; makerMark: MakerMark; masterwork?: boolean }`
  - `export interface GreatKiln { firingId: string; loads: KilnLoad[]; firesAt: number | null; doneAt: number | null; heat: number | null }`
  - `export interface KilnFiringReport { firingId: string; at: number; heat: number; contributors: string[]; pieces: number; best: { playerId: string; designName: string; form: string; effect: string | null; quality: 1 | 2 | 3 } | null }`
  - `export type MuseumPiece = Pick<MasterworkRecord, 'id' | 'design' | 'glazeColor' | 'effect' | 'quality' | 'prestige' | 'patronName' | 'finishedAt'>`
  - `export interface KilnReturn { design: Design; quality: 1 | 2 | 3; effect: string | null; count: number; makerName: string; makerMark: MakerMark }`
  - `export interface KilnMasterworkResult { design: Design; qualityScore: number; effect: string | null; at: number }`
  - `WorkshopDelta` gains `kilnGoods?: KilnReturn[]; kilnMasterwork?: KilnMasterworkResult`, and `village` gains `projects?: Record<string, number>`
  - `VillageState`: `schemaVersion: 2`, plus `stagesDone: number; greatKiln: GreatKiln; lastFiring: KilnFiringReport | null; projects: ProjectsState; museum: Record<string, MuseumPiece[]>; lentMasterworks: string[]` (keys `${playerId}:${masterworkId}`)
  - `VillageAction` gains `| { type: 'loadKiln'; designId: string; count: number; wood: number } | { type: 'loadKilnMasterwork'; designId: string; wood: number } | { type: 'contributeProject'; projectId: string; part: number; count: number; source: 'own' | 'store' | 'substitute'; designId?: string; quality?: 1 | 2 | 3; effect?: string | null; masterworkIds?: string[] }`; `contribute.source` becomes `'own' | 'store' | 'substitute'`; `VILLAGE_ACTION_TYPES` lists the three new types
- Produces (`state.ts`): `VILLAGE_SCHEMA_VERSION = 2`; `emptyKiln(id: string): GreatKiln`; `newVillage` returns v2; `addMember(v, m: Omit<Member, 'specialty' | 'houseSlot' | 'tier'> & { tier?: Tier })` (default `'werkstatt'`); `migrateVillage(raw: unknown): VillageState`; `ACTIVE_MEMBER_MS = 7 * 86_400_000`; `activeMembers(v, now): Member[]`; `maxMemberTier(v): Tier`
- Produces (`level.ts`): `villageLevel(v): number` (= `completedJoint + stagesDone`); `LEVEL_BONUS_PER_LEVEL = 0.02`; `LEVEL_BONUS_CAP = 0.4`; `levelBonus(v): number` (= `1 + min(0.4, 0.02 × level)`); `LEVEL_DECORATIONS: { level: number; id: string; name: string }[]`; `decorationsFor(level): string[]`; `noteLevelUp(v, before: number, now: number): void`
- Produces (`test/shared/village/helpers.ts`): `runAction(v, ws, actor, a, now = T0 + 1000)` → `{ v, ws, error: string | null, events: string[] }` (moved from `joint.test.ts`'s local `run`, deliveries applied with `applyDelta`); `setTier(v, ws, id, tier)` (sets workshop and member tier)

- [ ] **Step 1: Write the failing tests**

`migrate.test.ts`:
```ts
it('a v1 village migrates without loss; level = completed joint orders', () => {
  const v1 = structuredClone(village(3).v) as any;
  v1.schemaVersion = 1; v1.completedJoint = 9; v1.buildings = ['tongrube', 'markthalle', 'glasurbibliothek', 'gildenhaus'];
  for (const k of ['stagesDone', 'greatKiln', 'lastFiring', 'projects', 'museum', 'lentMasterworks']) delete v1[k];
  for (const m of v1.members) delete m.tier;
  const v = migrateVillage(v1);
  expect(v.schemaVersion).toBe(2);
  expect(v.members.map((m) => m.tier)).toEqual(['werkstatt', 'werkstatt', 'werkstatt']);
  expect(v.projects).toEqual({ active: null, offered: [], levels: {} });
  expect(v.greatKiln.loads).toEqual([]);
  expect(villageLevel(v)).toBe(9);
  expect(migrateVillage(structuredClone(v))).toEqual(v); // idempotent on v2
});
it('rejects garbage and future versions', () => {
  expect(() => migrateVillage(null)).toThrow();
  expect(() => migrateVillage({ ...village(1).v, schemaVersion: 3 })).toThrow();
});
it('[Review Focus 1] a full v1 village of 10 stays under 100 KB after migration', () => {
  // 10 members, 100 news, 50 guestbook entries each, 6 museum pieces each (design from newGame)
  expect(JSON.stringify(v).length).toBeLessThan(100_000);
});
```
`level.test.ts`: `levelBonus` is `1` at level 0, `1.2` at 10 and `1.4` at 20 and at 35. `decorationsFor(4)` is `[]`, `decorationsFor(12)` is `['blumenbeete', 'laternen']`. `noteLevelUp(v, 4, now)` with level 5 adds news `Das Dorf ist jetzt auf Stufe 5! Neu auf dem Dorfplatz: Blumenbeete.`, and with level 6 it adds `Das Dorf ist jetzt auf Stufe 6!`. `activeMembers` drops a member whose `lastSeen` is 7 days + 1 ms old.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/shared/village/migrate.test.ts test/shared/village/level.test.ts`
Expected: FAIL (`migrateVillage` / `villageLevel` not exported)

- [ ] **Step 3: Implement the types, `migrateVillage`, the `level.ts` functions and the helpers**

`LEVEL_DECORATIONS` is exactly `[{5,'blumenbeete','Blumenbeete'},{10,'laternen','Laternen am Dorfplatz'},{15,'maibaum','Maibaum'},{20,'wimpel','Wimpel über dem Platz'},{25,'baenke','Bänke am Brunnen'},{30,'rosenbogen','Rosenbogen'}]`. `migrateVillage` validates the required keys (`villageId`, `members`, `jointOrders`, `version`), throws `'Ungültiges Dorf'` or `'Dorf ist neuer als das Spiel'`, and fills the v2 fields with empty values (kiln `emptyKiln('k1')`). Update `mockVillage` so it still type-checks (destructure the same private fields). Fix every compile error `npm run check` reports from the new required fields.

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run test/shared/village && npm run check`
Expected: PASS, no type errors

- [ ] **Step 5: Commit**

```bash
git add src/shared/village/{types,state,level}.ts src/client/dev/mockVillage.ts test/shared/village/
git commit -m "feat(village): schema 2, migration and village level"
```

---

### Task 2: Joint orders keep coming (body/effect parts, substitutes, branch templates, level bonus)

**Files:**
- Create: `src/shared/village/goods.ts`
- Modify: `src/shared/village/joint.ts`, `src/shared/village/apply.ts`, `src/shared/village/state.ts` (validation of `source`)
- Test: `test/shared/village/joint.test.ts`

**Interfaces:**
- Consumes: `GoodsPart`, `maxMemberTier`, `levelBonus`, `noteLevelUp`, `villageLevel` (Task 1)
- Produces (`goods.ts`):
  - `SUBSTITUTE_FACTOR = 3`; `SUBSTITUTE_FORM: Record<string, string> = { fliese: 'teller', figur: 'vase', teekanne: 'krug' }`
  - `allowsSubstitute(p: GoodsPart): boolean`: true when `p.body` is set and not `'irdenware'`, or `p.effect` is set, or `p.form` has a `FormDef.tier` above `'werkstatt'`
  - `substituteForm(p: GoodsPart): string`
  - `takeGoods(actor: GameState, p: GoodsPart, ref: { designId?: string; quality?: 1 | 2 | 3; effect?: string | null }, count: number, substitute: boolean): { units: number; points: number } | string`. Mutates the actor. `units` is `count` (exact) or `count / 3` (substitute). `points` is `pieceValue × count`.
- Produces (`joint.ts`): `JointTemplate.needs?: { tier?: Tier; building?: string }`; five new templates (below); `contributeTo(..., source: 'own' | 'store' | 'substitute', ...)`; `payout` × `levelBonus(v)`; `generateJointOrder` applies `RATHAUS_COUNT_MUL`/`RATHAUS_REWARD_MUL` (Task 9 defines the constants in `benefits.ts`. Create `benefits.ts` here with only those two arrays.)
- Produces (`benefits.ts`, first part): `RATHAUS_COUNT_MUL = [1.25, 1.5, 1.75]`, `RATHAUS_REWARD_MUL = [1.6, 2.2, 3]`, `levelOf(levels: Record<string, number> | undefined, id: string): number`

Exact goods-part rules in `takeGoods` (exact mode). The design is the actor's own or foreign. `form` must match. `quality ≥ minQuality`. `colorFamily` must match as today. `p.body` must equal `bodyOf(design)`, else `'Das ist der falsche Ton'`. `p.effect` must equal the stack's effect, else `'Da fehlt der Effekt'`. Substitute mode: the design must be earthenware (`'Ersatz geht nur aus Irdenware'`), its form must be `substituteForm(p)`, `quality ≥ minQuality`, `colorFamily` must match, any effect is fine, and `count % 3 === 0` (`'Ersatz aus Irdenware geht nur in Dreierpacks'`). For a part where `allowsSubstitute` is false, the error is `'Für diesen Teil gibt es keinen Ersatz'`.

New templates (all `needs` the tier or building named; `minQuality: 1` unless stated):

| id | title | client | needs | parts | reward taler / ruf / decor |
|---|---|---|---|---|---|
| `bierkeller` | Steinzeugkrüge für den Bierkeller | Braumeister Hopfinger | manufaktur | krug body steinzeug 12; holz 80; salz 20 | 4000 / 80 / `steinzeugtopf` |
| `teestube` | Teeservice für die Teestube | Frau Kamille | manufaktur | teekanne steinzeug 6; becher steinzeug 24; kobalt 20 | 6000 / 100 / `glasurproben` |
| `kurhaus` | Porzellan fürs Kurhaus | Kurdirektor Sprudel | hofmanufaktur | teller porzellan 24 minQuality 2; schale porzellan 12; kaolin 40 | 15000 / 160 / `porzellanvoegel` |
| `badehaus` | Fliesen fürs Badehaus | Bademeisterin Welle | hofmanufaktur | fliese 160; kobalt 30; holz 100 | 12000 / 140 / `teppich-blau` |
| `herbstmarkt` | Aschekrüge für den Herbstmarkt | Marktmeister Korb | building `gemeinschaftsofen` | krug effect ascheanflug 6; becher 20; holz 120 | 8000 / 120 / `laterne` |

- [ ] **Step 1: Write the failing tests** (add to `joint.test.ts`, using `runAction`/`setTier`)

```ts
it('branch templates appear only once a member can make them', () => {
  // 200 generated orders after completedJoint=4: no bierkeller/teestube/kurhaus/badehaus/herbstmarkt while all are werkstatt;
  // after setTier(p1,'manufaktur'): bierkeller or teestube appear, kurhaus/badehaus never; herbstmarkt only once buildings has 'gemeinschaftsofen'
});
it('a stoneware part refuses earthenware, accepts 3× earthenware as substitute in packs of three', () => {
  // order part {kind:'goods', form:'krug', body:'steinzeug', count: 4}
  // own earthenware krug, source 'own' → 'Das ist der falsche Ton'
  // source 'substitute', count 4 → 'Ersatz aus Irdenware geht nur in Dreierpacks'
  // source 'substitute', count 6 → filled +2, actor's krug stack −6
});
it('a tile part takes plates as substitute; an effect part takes plain pieces of the form ×3', () => { /* … */ });
it('orders keep coming after the four buildings and raise the village level', () => {
  // completedJoint 8, buildings all four: complete one → jointOrders.length 2, villageLevel 9, buildings unchanged
});
it('payouts grow 2 % per village level, at most 40 %', () => {
  // same order, same contributions: payout at level 0 vs completedJoint 10 → taler ×1.2 (±1 rounding); level 30 → ×1.4
});
it('a Rathaus makes joint orders larger and better paying', () => {
  // v.projects.levels.rathaus = 2 → part counts ×1.5 (ceil), reward taler ×2.2 vs same rng seed without Rathaus
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/shared/village/joint.test.ts`
Expected: FAIL on the new cases

- [ ] **Step 3: Implement `goods.ts`, the `joint.ts` changes and the `contribute` source in `apply.ts`/`state.ts`**

`generateJointOrder` pool after the tier-1 phase: `JOINT_TEMPLATES.filter((t) => !t.tier && needsMet(t, v))`. Here `needsMet` checks `tierAtLeast({ tier: maxMemberTier(v) }, t.needs.tier)` and `v.buildings.includes(t.needs.building)`. `completeJointOrder` captures `villageLevel(v)` before the increment and calls `noteLevelUp(v, before, now)` after it. The existing check that the first person can't fill the last unit stays.

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/shared/village && npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/village/{goods,joint,apply,state,benefits}.ts test/shared/village/joint.test.ts
git commit -m "feat(village): joint orders keep coming with body, effect and substitute parts"
```

---

### Task 3: Great-kiln effects (content, never from experiments, collection book, overlays)

**Files:**
- Modify: `src/shared/content/effects.ts`, `src/shared/discovery.ts`, `src/shared/collection.ts`, `src/client/panels/RecipeBook.tsx`, `src/client/panels/collectionLogic.ts`, `src/client/panels/CollectionBook.tsx`, `src/client/art/Pot.tsx`
- Test: `test/shared/discovery.test.ts`, `test/shared/collection.test.ts`, `test/client/collection.test.tsx` (existing `test/client/pot.test.tsx` covers overlays)

**Interfaces:**
- Produces: `EffectDef.greatKiln?: true`; `GREAT_KILN_EFFECTS = ['ascheanflug', 'flammenspur', 'ascheglasur'] as const` (exported from `effects.ts` and re-exported from `content/index.ts`); `isGreatKilnEffect(id: string | null): boolean`
- Collection rule: great-kiln entries exist on every body page (`form|body|ascheanflug` and so on). **They are excluded from `collectionPercent` and from row (`rowId`) prizes**, so solo percentages and solo row prizes are unchanged. Their own columns (`colId`) award prizes as usual.

Exact content (`conditions: []`, no `body`):

| id | name | valueMul | description | hint |
|---|---|---|---|---|
| `ascheanflug` | Ascheanflug | 2.2 | Feine Holzasche ist im Feuer auf die Schulter geflogen und zu grünlich-goldenen Tropfen geschmolzen. | Greta lächelt: „Das schafft kein Glasurrezept. Nur ein großes Holzfeuer – am besten mit vielen Leuten.“ |
| `flammenspur` | Flammenspur | 2.6 | Die Flamme hat ihren Weg über das Stück gemalt: warme, rötlich-orange Schlieren. | Greta zeigt auf den Gemeinschaftsofen: „Wo die Flamme entlangleckt, bleibt ihre Spur.“ |
| `ascheglasur` | Ascheglasur | 3.4 | Eine dicke, glasig-grüne Haut aus geschmolzener Asche, mit Tropfen, die wie Tränen herablaufen. | Greta flüstert: „Nur wenn der große Ofen richtig heiß wird – viele Hände, viel Holz –, schmilzt die Asche zu Glas.“ |

- [ ] **Step 1: Write the failing tests**

```ts
// discovery.test.ts
it('experiments never produce or hint a great-kiln effect', () => {
  // exhaustive grid: base × colorant (null + every MATERIALS colorant) × pct 0..10 × temp × atmosphere × cooling × body
  for (const r of grid) { expect(isGreatKilnEffect(matchEffect(r))).toBe(false); }
  // hintFor on a fresh hofmanufaktur state with every other effect discovered never names Ascheglasur/Flammenspur/Ascheanflug
});
// collection.test.ts
it('great-kiln columns exist on every body page but do not change the percentage or row prizes', () => {
  // collectionEntries() has form|body|ascheglasur for every FORMS × BODIES
  // a state with every non-kiln entry of one body: collectionPercent(s, body) === 100; row prize for (body, becher) awarded
  // recordCollection(s,'becher','irdenware','ascheglasur') pushes the key; percent unchanged
  // all forms on irdenware with ascheglasur → colId('irdenware','ascheglasur') prize awarded
});
// client collection.test.tsx
it('the book labels a found great-kiln column with its name, under the heading Gemeinschaftsofen', () => { /* render CollectionBook: 'Gemeinschaftsofen' header present; 'Ascheglasur' label once a key with it is in s.collection, '?' before */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/shared/discovery.test.ts test/shared/collection.test.ts test/client/collection.test.tsx test/client/pot.test.tsx`
Expected: FAIL (the pot overlay test also fails once the three effects exist and have no art)

- [ ] **Step 3: Implement**

In `matchEffect`, `hintFor` and the `GlazeBook` undiscovered list in `RecipeBook.tsx`, filter out `e.greatKiln`. In `collection.ts`, `collectionPercent` and the row-group `award` skip `isGreatKilnEffect(e.effect)` entries. In `collectionLogic.ts`, a great-kiln column's label is its name once any `s.collection` key ends in `|${id}`, and its found cell uses the body's `clearColor`. `CollectionBook` draws one shared header band `Gemeinschaftsofen` over the three kiln columns. In `Pot.tsx` `Effect`, add the three overlays (each 3–40 elements, seeded by `rnd(seed, …)`, with `data-effect`):
- `ascheanflug`: a greenish-gold speckle field on the upper third (shoulder), with a few larger drops;
- `flammenspur`: 2–3 broad, soft orange-red diagonal swooshes (opacity ≈ 0.45);
- `ascheglasur`: a glassy green band over the top quarter plus 5–7 runs with drop ends trickling down.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS

- [ ] **Step 5: Art self-review**

Add the three effects to the effects row of `src/client/dev/PotsPage.tsx` if that row does not iterate `EFFECTS` already. Run `npm run shot -- "http://localhost:5173/#pots" village-kiln-effects --full`. Check on cups, plates, tiles and figurines that each effect reads clearly, stays inside the silhouette and matches the ink style. Fix until it passes.

- [ ] **Step 6: Commit**

```bash
git add src/shared/content/{effects,index}.ts src/shared/{discovery,collection}.ts src/client/panels/{RecipeBook.tsx,collectionLogic.ts,CollectionBook.tsx} src/client/art/Pot.tsx src/client/dev/PotsPage.tsx test/shared/{discovery,collection}.test.ts test/client/collection.test.tsx docs/screens/village-kiln-effects-*.png
git commit -m "feat(content): great-kiln effects, collection column and overlays"
```

---

### Task 4: The great kiln (building, loading, firing, returns)

**Files:**
- Create: `src/shared/village/kiln.ts`, `src/shared/village/tick.ts`
- Modify: `src/shared/village/buildings.ts`, `src/shared/village/apply.ts`, `src/shared/village/state.ts` (validation)
- Test: `test/shared/village/kiln.test.ts`

**Interfaces:**
- Consumes: `GreatKiln`, `KilnLoad`, `KilnReturn`, `KilnFiringReport`, `emptyKiln`, `maxMemberTier` (Task 1); `batchMaterials`, `missingMaterialCost`, `useMaterials`, `batchQuality`, `productionWorkers`, `qualityTier` (`production.ts`); `buyError` (`shop.ts`); `GREAT_KILN_EFFECTS` (Task 3)
- Produces (`kiln.ts`):
  - `GREAT_KILN_CAPACITY = 60`, `KILN_MEMBER_SHARE = 20`, `KILN_WAIT_MS = 24 * 3_600_000`, `KILN_FIRING_MS = 2 * 3_600_000`, `KILN_WOOD_MIN = 2`, `KILN_WOOD_MAX = 6` (per piece), `KILN_QUALITY_BONUS = 20`
  - `heatFor(contributors: number, wood: number, pieces: number): number` = `min(1, 0.15 + 0.2 × min(contributors, 4) + 0.25 × clamp((wood / pieces − 2) / 4, 0, 1))`
  - `kilnPieces(k: GreatKiln): number`; `shareLeft(k: GreatKiln, playerId: string): number`
  - `kilnCost(s: GameState, design: Design, pieces: number, wood: number): { need: Record<string, number>; taler: number } | string` (`need` = `batchMaterials` + `holz: wood`; `taler` = `missingMaterialCost`; error from `buyError`)
  - `loadKiln(v: VillageState, actor: GameState, me: Member, designId: string, count: number, wood: number, now: number): string | null` (mutates both)
  - `rollKilnEffect(rng: number, heat: number, masterwork: boolean): [string | null, number]`: P(effect) = `0.2 + 0.6 × heat` (masterwork: `0.4 + 0.6 × heat`). Weights are `ascheanflug 5`, `flammenspur 3`, `ascheglasur 6 × heat²`.
  - `tickGreatKiln(v: VillageState, now: number): Delivery[]`; `nextKilnWake(v: VillageState): number | null`
- Produces (`tick.ts`): `tickVillage(v: VillageState, now: number): { changed: boolean; deliveries: Delivery[] }`. In this task it does two things. (1) It adds `'gemeinschaftsofen'` to `v.buildings` once `maxMemberTier(v)` ≥ manufaktur, with news, and delivers `village: { buildings }` to every member. (2) It runs `tickGreatKiln`. Task 7 adds project offers. Also `nextVillageWake(v): number | null`.
- Produces (`apply.ts`): `applyVillageAction` calls `tickVillage(v, now)` first and keeps its deliveries. `applyDelta` handles `kilnGoods`: when `s.designs` has `design.id` without `origin`, call `addGoods` + `recordCollection` + `stats.made += count`; otherwise `importStack` as a foreign copy.
- `BUILDINGS.gemeinschaftsofen = { id: 'gemeinschaftsofen', name: 'Gemeinschaftsofen', description: 'Ein großer Holzofen für alle: Je mehr Leute mitbrennen und je mehr Holz, desto heißer das Feuer und desto seltener die Effekte.' }`. It is **not** in `BUILDING_ORDER`.

Kiln lifecycle (all times deterministic from the action/tick `now`):
- The first load sets `firesAt = now + KILN_WAIT_MS`. When a load makes `kilnPieces === GREAT_KILN_CAPACITY`, set `firesAt = now`.
- A tick with `firesAt ≤ now` and `doneAt === null` sets `heat = heatFor(distinct playerIds, Σ wood, pieces)` and `doneAt = firesAt + KILN_FIRING_MS`, and adds news `Der Gemeinschaftsofen brennt! In zwei Stunden ist er abgekühlt.`
- A tick with `doneAt ≤ now` rolls every piece of every load. A masterwork load is handled in Task 5. Normal loads are grouped into one `KilnReturn` per (load, effect) with quality `qualityTier(min(100, qualityScore + KILN_QUALITY_BONUS × heat))`. One delivery `{ kilnGoods }` goes per contributor. The tick sets `v.lastFiring`, adds news, and resets to `emptyKiln(vid(v, 'k'))`. Both transitions can happen in one tick.
- Loading while `doneAt !== null` is refused.

German copy:
- Errors: `'Den Gemeinschaftsofen gibt es erst, wenn jemand im Dorf die Manufaktur erreicht hat'`, `'Der Ofen brennt gerade – danach kannst du wieder einräumen'`, `'Geschenkte Stücke kannst du nicht nachmachen'`, `` `Dein Platz im Ofen reicht noch für ${n} Stück` ``, `` `Der Ofen hat nur noch Platz für ${n} Stück` ``, `` `Pro Stück braucht es ${KILN_WOOD_MIN} bis ${KILN_WOOD_MAX} Holz` ``, `` `Dafür brauchst du ${fmtTaler(t)} Taler` ``
- News: `'Im Dorf steht jetzt ein Gemeinschaftsofen! Wer mitbrennt, macht das Feuer heißer.'`; on load `` `${name} hat ${count} ${FORMS[form].plural} in den Gemeinschaftsofen geräumt.` ``; when finished `` `Der Gemeinschaftsofen ist abgekühlt: ${pieces} Stücke von ${k} Leuten. Schönstes Stück: ${maker}s ${formName} mit ${effectName}!` ``, or without any effect `` `… Schönstes Stück: ${maker}s ${formName}.` `` ("best" = highest `valueMul`, then quality)
- Actor event: `'Eingeräumt – jetzt heißt es warten, bis der Ofen brennt.'`

- [ ] **Step 1: Write the failing tests** (`kiln.test.ts`)

```ts
it('the kiln appears once a member reaches the Manufaktur, with news and a snapshot for everyone', () => { /* tickVillage → changed, buildings has 'gemeinschaftsofen', deliveries to every member with village.buildings */ });
it('loading pays materials and wood up front, buying what is missing', () => {
  // ws.p1 holz 0, taler 1000: loadKiln 5 cups wood 10 → taler drops by missingMaterialCost; ton −5·clayPerPiece; kiln.loads[0].count 5
});
it('a member may load at most 20; the kiln holds 60 and fires at once when full', () => { /* errors verbatim; 3 members × 20 → firesAt === now */ });
it('heat: alone with little wood 0.35, three with little wood 0.75, three with full wood 1', () => {
  expect(heatFor(1, 40, 20)).toBeCloseTo(0.35); expect(heatFor(3, 120, 60)).toBeCloseTo(0.75); expect(heatFor(3, 360, 60)).toBeCloseTo(1);
});
it('fires 24 h after the first piece, cools 2 h later, pieces return to their own design and the collection', () => {
  // load at T0; tick T0+24h−1 → nothing; tick T0+24h → doneAt set, news 'brennt'; tick T0+26h → deliveries;
  // applyDelta(ws.p1, d) → goods on ws.p1.designs[0].id (no 'f:' copy), stats.made +5, collection has 'becher|irdenware|<effect>' when an effect rolled
});
it('three contributors make Ascheglasur likely; a lone potter rarely gets it', () => {
  // 300 seeds: trio (3×20, wood 6/piece) → ≥ 1 ascheglasur piece in ≥ 99 % of firings; solo (20, wood 2/piece) → in < 65 %
});
it('a village of 1 can fire alone', () => { /* village(1), setTier manufaktur, load, tick past doneAt → delivery to p1 */ });
it('a piece whose design was deleted meanwhile comes back as a foreign copy', () => { /* remove design before applyDelta → goods on an 'f:' design */ });
it('no loading while it fires', () => { /* error 'Der Ofen brennt gerade – danach kannst du wieder einräumen' */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/shared/village/kiln.test.ts`
Expected: FAIL (module missing)

- [ ] **Step 3: Implement `kiln.ts`, `tick.ts`, the building, the `loadKiln` case in `applyVillageAction` and `applyDelta.kilnGoods`**

`validateVillageAction` for `loadKiln` checks `designId` is a string, `count` passes `isCount(·, KILN_MEMBER_SHARE)` and `wood` passes `isCount(·, KILN_MEMBER_SHARE × KILN_WOOD_MAX)`. The load stores a travelling copy of the design: `structuredClone(design)` without `origin`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/shared/village && npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/village/{kiln,tick,buildings,apply,state}.ts test/shared/village/kiln.test.ts
git commit -m "feat(village): the great kiln — loading, heat, firing and returns"
```

---

### Task 5: Masterworks in the great kiln (great-kiln effects in masterwork criteria)

**Files:**
- Modify: `src/shared/types.ts`, `src/shared/masterwork.ts`, `src/shared/actions.ts`, `src/shared/village/kiln.ts`, `src/shared/village/apply.ts`, `src/client/panels/{MasterworkPanel,StationPanel}.tsx`
- Test: `test/shared/village/kiln-masterwork.test.ts`, `test/shared/masterwork.test.ts`

**Interfaces:**
- Consumes: `KilnMasterworkResult` (Task 1), `rollKilnEffect`, `loadKiln` rules (Task 4)
- Produces:
  - `GameState.kilnMasterwork?: { designId: string; firingId: string } | null` (optional, no schema bump)
  - `masterworkBusy(s: GameState): boolean` (= `!!masterworkInProgress(s) || !!s.kilnMasterwork`). Use it in `startMasterwork`, `swapCommission`, `MasterworkPanel` and `StationPanel` in place of `masterworkInProgress` truthiness.
  - `payMasterwork(s: GameState, design: Design, extra: Record<string, number>): string | null`: the checks and payment extracted from `startMasterwork` (tier, commission, busy, origin, materials for `MASTERWORK_MATERIAL_PIECES` plus `extra`, fee). `startMasterwork` = `payMasterwork(s, d, {})` + push batch.
  - `recordMasterwork(s: GameState, design: Design, qualityScore: number, kilnEffect: string | null, t: number): void`: the body of `finishMasterwork` after the batch removal. The record's effect is `kilnEffect ?? glaze effect`.
  - `criteriaMet(s, design, c, kilnEffect: string | null = null)`: an `effect` criterion is met when `glaze?.effect === x.effect || kilnEffect === x.effect`.
  - `finishKilnMasterwork(s: GameState, r: KilnMasterworkResult): void`: clears `s.kilnMasterwork` and calls `recordMasterwork` with the workshop's own design when it still exists (else `r.design`).
  - `generateCommission`: when `done ≥ 3`, `s.village?.buildings.includes('gemeinschaftsofen')` and the player has a great-kiln effect in `s.collection`, roll once. With probability 0.25 the effect criterion names one of those found great-kiln effects. **No roll otherwise**, so existing rng sequences are unchanged.
  - Village action `loadKilnMasterwork`: needs `KILN_MEMBER_SHARE` room for 1 piece, `wood` between `KILN_WOOD_MIN` and `KILN_WOOD_MAX`, and calls `payMasterwork(actor, design, { holz: wood })`. It pushes a `KilnLoad` with `count: 1`, `masterwork: true` and `qualityScore = batchQuality + MASTERWORK_QUALITY_BONUS`, and sets `actor.kilnMasterwork`. When finished, the masterwork load rolls with `rollKilnEffect(rng, heat, true)` and delivers `{ kilnMasterwork: { design, qualityScore: min(100, qualityScore + 20 × heat), effect, at: doneAt } }`.
  - `applyDelta` handles `kilnMasterwork` by calling `finishKilnMasterwork`.
- German copy: event `'Dein Meisterstück steht im Gemeinschaftsofen – das Feuer entscheidet mit.'`. `MasterworkPanel` busy text while `kilnMasterwork` is set: `'Dein Meisterstück brennt im Gemeinschaftsofen.'`

- [ ] **Step 1: Write the failing tests**

```ts
it('loading a masterwork pays the fee, materials and wood, and blocks a second masterwork and swapping', () => { /* commission.costTaler deducted; startMasterwork → 'Es entsteht schon ein Meisterstück'; swapCommission rejected */ });
it('when the kiln cools, the masterwork is judged with its kiln effect and recorded once', () => {
  // force rollKilnEffect via heat 1 + seed → effect 'ascheglasur'; commission criterion {kind:'effect', effect:'ascheglasur'}
  // after applyDelta: masterworks.length +1, record.effect 'ascheglasur', criterion met, reward paid, kilnMasterwork cleared, collection key recorded
});
it('criteriaMet accepts either the glaze effect or the kiln effect', () => { /* … */ });
it('commissions name a great-kiln effect only with a kiln in the village and the effect found', () => {
  // 200 seeds without kiln: never; with kiln + 'becher|irdenware|flammenspur' in collection, done=3: sometimes 'flammenspur', never another kiln effect
  // without kiln: the commission for a fixed seed is identical to before this change (snapshot of criteria)
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/shared/village/kiln-masterwork.test.ts test/shared/masterwork.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement as specified above**

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/{types,masterwork,actions}.ts src/shared/village/{kiln,apply}.ts src/client/panels/{MasterworkPanel,StationPanel}.tsx test/shared/village/kiln-masterwork.test.ts test/shared/masterwork.test.ts
git commit -m "feat(village): masterworks can be fired in the great kiln"
```

---

### Task 6: VillageDO: migration on load, member sync, ticking by alarm, dev village warp

**Files:**
- Create: `src/shared/village/museum.ts`
- Modify: `src/worker/village.ts`, `src/worker/dev.ts`, `src/worker/index.ts`
- Test: `test/worker/village.test.ts`, `test/shared/village/migrate.test.ts` (museum size)

**Interfaces:**
- Consumes: `migrateVillage` (Task 1), `tickVillage`, `nextVillageWake` (Task 4)
- Produces:
  - `museum.ts`: `MUSEUM_PER_MEMBER = 6`; `museumEntries(s: GameState): MuseumPiece[]` (best prestige first, then newest, at most 6)
  - `VillageDO`:
    - `ensure()` runs `migrateVillage` on the stored state and saves if it changed. New members get `tier: ws?.tier ?? 'werkstatt'`.
    - After the member pass, `ensure()` runs `tickVillage(v, now)`. When `changed`, it bumps `v.version` and stores `{ state: v, outbox: [...outbox, ...entries] }` in **one** put, with keys `` `tick${v.version}-${now}:${i}` ``.
    - Private `rearm(v)` sets the alarm to `min(nextVillageWake(v), outbox non-empty ? now + DRAIN_RETRY_MS : ∞)`, or deletes it when both are absent. `ensure`, `act` and `alarm` call it last. `drain` no longer sets alarms itself.
    - `alarm()` (serialized) runs `recover()`, loads the stored state (returns when there is none), runs the same tick-and-store path, then `drain()` and `rearm()`.
    - `syncMember` also copies `ws.tier` into `m.tier` and `museumEntries(ws)` into `v.museum[m.playerId]`. "Changed" now also compares tier and the museum entry ids.
    - `snapshotDelta` includes `projects: { ...v.projects.levels }`.
    - `devWarp(villageId: string, ms: number): Promise<VillageView | null>` shifts the time with `shiftVillageTime` and then ticks.
  - `src/worker/dev.ts`: `shiftVillageTime(v: VillageState, ms: number): VillageState` (moves `greatKiln.firesAt`/`doneAt` earlier by `ms`); `handleVillageWarp(req, env)` for `POST /api/dev/village-warp { minutes }` (only with `DEV_FAST === '1'`, otherwise 404; minutes 1…100 000). The route is added to `src/worker/index.ts`.

- [ ] **Step 1: Write the failing worker tests** (new `describe('village long goals', …)` in `test/worker/village.test.ts`)

Helper in the test file: `patchWorkshop(playerId, fn)` reads the `workshops` row from `env.DB`, applies `fn` to the parsed state and writes it back. Give A `tier: 'manufaktur'` and `taler: 5000`.

```ts
it('a stored v1 village is migrated on first load', async () => {
  // runInDurableObject: write a v1-shaped state (drop v2 fields, schemaVersion 1, completedJoint 3)
  // GET /api/village → schemaVersion 2, members intact, completedJoint 3
});
it('the kiln appears after a member reaches the Manufaktur and the alarm is armed when loaded', async () => {
  // patch A to manufaktur; GET /api/village (A) → buildings includes 'gemeinschaftsofen'
  // vact(A, loadKiln design0 count 5 wood 10) → 200; runInDurableObject: storage.getAlarm() === state.greatKiln.firesAt
});
it('[Review Focus 2] the alarm fires the kiln and returns pieces exactly once', async () => {
  // set firesAt = Date.now()-1 in storage; runDurableObjectAlarm(stub) → doneAt set
  // set doneAt = Date.now()-1; runDurableObjectAlarm(stub) twice, plus GET /api/village in between
  // A's cups: exactly +5 versus before the load minus 5; lastFiring.pieces === 5; news contains 'abgekühlt'
});
it('a member’s tier and masterworks reach the village', async () => { /* patch masterworks [one gold]; GET → members[i].tier 'manufaktur', museum[idA].length 1 */ });
it('village warp is not available unless DEV_FAST=1', async () => { /* POST /api/dev/village-warp → 404 */ });
```
`migrate.test.ts`: extend the [Review Focus 1] size test with `museum` full (6 × 10 pieces built from `newGame` designs).

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:worker && npx vitest run test/shared/village/migrate.test.ts`
Expected: FAIL on the new cases

- [ ] **Step 3: Implement as specified above**

- [ ] **Step 4: Run tests**

Run: `npm run test:worker && npx vitest run && npm run check`
Expected: PASS (all old village worker tests too)

- [ ] **Step 5: Commit**

```bash
git add src/shared/village/museum.ts src/worker/{village,dev,index}.ts test/worker/village.test.ts test/shared/village/migrate.test.ts
git commit -m "feat(worker): village ticks by alarm, migrates, syncs tiers and museum"
```

---

### Task 7: Grand projects: data, stages, offers, the 70 % rule

**Files:**
- Create: `src/shared/village/projects.ts`
- Modify: `src/shared/village/tick.ts` (offers), `src/shared/village/benefits.ts` (constants used in benefit text)
- Test: `test/shared/village/projects.test.ts`

**Interfaces:**
- Consumes: `ProjectPart`, `ActivePart`, `ActiveProject`, `activeMembers`, `maxMemberTier`, `levelBonus` (Task 1)
- Produces (`projects.ts`):
  - `interface StageDef { name: string; parts: ProjectPart[] }`; `interface ProjectDef { id: string; name: string; description: string; tier: Tier; decor: string; stages: StageDef[]; benefit: (level: number) => string }`
  - `PROJECTS: Record<string, ProjectDef>`; `PROJECT_ORDER = ['glockenturm', 'museum', 'rathaus', 'dorfbrunnen', 'kaolingrube']`; `ROMAN = ['I', 'II', 'III']`; `MAX_PROJECT_LEVEL = 3`
  - `LEVEL_COUNT_MUL = [1, 1.5, 2]`, `LEVEL_TALER_MUL = [1, 4, 12]`, `MAX_STAGE_SHARE = 0.7`, `MIN_STAGE_CONTRIBUTORS = 2`
  - `projectScale(active: number): number` = `0.6 + 0.2 × min(max(active, 2), 6)`
  - `instantiateStage(def: ProjectDef, level: 1 | 2 | 3, stage: number, active: number): ActivePart[]`. Material and goods parts use `max(1, ceil(count × LEVEL_COUNT_MUL × scale))`. The taler part uses `round(amount × LEVEL_TALER_MUL × scale / 1000) × 1000`. Masterwork parts use `ceil(count × LEVEL_COUNT_MUL)` (not member-scaled). At level 3 goods get `minQuality + 1` (at most 3). All parts start with `filled: 0, by: {}`.
  - `partSize(p: ProjectPart): number` (taler → `amount`, else `count`)
  - `stageShares(a: ActiveProject): Record<string, number>` = Σ over parts of `by[id] / size / parts.length`
  - `maxProjectUnits(a: ActiveProject, part: number, actorId: string): number` = `min(left, floor((MAX_STAGE_SHARE − share(actor)) × size × parts.length + 1e-9))`, never negative
  - `isStageComplete(a): boolean` (all filled and at least `MIN_STAGE_CONTRIBUTORS` distinct contributors)
  - `stageReward(v: VillageState, a: ActiveProject): { taler: number; ruf: number }`: taler `round((0.25 × talerPartAmount + 2000 × (stage + 1)) × levelBonus(v))`, ruf `round((25 + 10 × stage + 25 × (level − 1)) × levelBonus(v))`
  - `ensureProjectOffers(v: VillageState): boolean`: when `active === null`, top `offered` up to 2 by `pick` over `v.rng` from `PROJECT_ORDER` ids with `levels[id] < 3` and `tierAtLeast({ tier: maxMemberTier(v) }, def.tier)`. Drop offered ids that no longer qualify. Returns whether anything changed.
  - `tickVillage` calls `ensureProjectOffers`.

Exact project data (base counts for one stage at level I; `q2` = `minQuality 2`, otherwise 1; every stage has exactly one taler part):

| Project (`tier`, `decor`) | Stage | Parts |
|---|---|---|
| **Glockenturm** (`manufaktur`, `tischglocke`) | Fundament | ton 400 · holz 300 · krug steinzeug 12 · taler 30000 |
| | Turmschaft | steinzeugton 300 · becher steinzeug 40 · eisenoxid 60 · taler 50000 |
| | Glockenstuhl | holz 600 · vase steinzeug 15 q2 · kupferoxid 60 · taler 80000 |
| | Glocke und Dach | teekanne steinzeug 10 · masterwork 1 bronze · kobalt 40 · taler 120000 |
| **Museum** (`manufaktur`, `museumsplakat`) | Grundmauern | ton 500 · steinzeugton 200 · teller steinzeug 30 · taler 40000 |
| | Ausstellungshalle | holz 400 · vase steinzeug 20 q2 · masterwork 1 bronze · taler 60000 |
| | Vitrinen | glasurbasis 300 · schale steinzeug 40 · vase effect ascheanflug 4 · taler 90000 |
| | Eröffnung | masterwork 2 silver · krug steinzeug 15 q2 · kobalt 50 · taler 120000 |
| **Rathaus** (`manufaktur`, `ratssiegel`) | Bauplatz | ton 600 · holz 500 · eisenoxid 80 · taler 40000 |
| | Mauern | steinzeugton 400 · becher steinzeug 60 · kupferoxid 60 · taler 70000 |
| | Ratssaal | teller steinzeug 40 q2 · teekanne steinzeug 12 · glasurbasis 300 · taler 100000 |
| | Turm und Uhr | vase steinzeug 25 q2 · kobalt 60 · holz 800 · taler 150000 |
| | Festsaal | masterwork 2 silver · krug steinzeug 20 q2 · becher effect flammenspur 10 · taler 250000 |
| **Dorfbrunnen** (`hofmanufaktur`, `brunnenfliese`) | Becken | ton 500 · fliese 120 · steinzeugton 200 · taler 60000 |
| | Brunnenrand | fliese 200 colorFamily blau · kobalt 80 · schale steinzeug 30 · taler 100000 |
| | Brunnenfigur | figur porzellan 6 q2 · fliese 150 · masterwork 1 silver · taler 150000 |
| **Kaolingrube** (`hofmanufaktur`, `kaolinbrocken`) | Stollen | holz 800 · eisenoxid 100 · krug steinzeug 20 · taler 80000 |
| | Schlämmbecken | kaolin 300 · schale porzellan 30 · glasurbasis 300 · taler 120000 |
| | Förderturm | vase porzellan 15 q2 · figur porzellan 6 · masterwork 1 gold · taler 200000 |

Descriptions (copy): Glockenturm `'Ein Turm mit Glocke, die jeden Samstag den Markttag einläutet.'`; Museum `'Ein kleines Museum für die Meisterstücke des ganzen Dorfs.'`; Rathaus `'Das Herz des Dorfs: Hier werden die großen Aufträge vergeben.'`; Dorfbrunnen `'Ein gefliester Brunnen mitten im Dorf, an dem sich alle treffen.'`; Kaolingrube `'Eine eigene Grube für weiße Porzellanerde – nie wieder teures Kaolin.'`

Benefit texts by level `L` (the constants come from `benefits.ts`, see Task 9):
- Dorfbrunnen: `` `Jeden Tag ${BRUNNEN_RUF_PER_DAY[L-1]} Ruf für alle im Dorf.` ``
- Glockenturm: `` `Jeden Samstagvormittag ist Markttag: ${MARKET_DAY_HOURS[L-1]} Stunden lang verkaufen die Marktstände zu ${Math.round(MARKET_DAY_FACTOR[L-1]*100)} % des Werts.` ``
- Museum: `` `Zeigt die Meisterstücke aller im Dorf. Besucher bringen jeden Tag ${L} Ruf pro eigenem Meisterstück (bis zu ${MUSEUM_MAX_COUNTED}).` ``
- Kaolingrube: `` `Kaolin kostet für alle im Dorf ${Math.round((1-KAOLIN_PRICE_FACTOR[L-1])*100)} % weniger.` ``
- Rathaus: `` `Großaufträge werden ${Math.round((RATHAUS_COUNT_MUL[L-1]-1)*100)} % größer und zahlen ${Math.round((RATHAUS_REWARD_MUL[L-1]-1)*100)} % mehr.` ``

- [ ] **Step 1: Write the failing tests** (`projects.test.ts`)

```ts
it('five projects, 3–5 stages each, 3–5 parts per stage, exactly one taler part per stage, known materials/forms/effects/decor', () => { /* … */ });
it('nothing is offered while everyone is a Werkstatt; two Manufaktur projects once someone is Manufaktur; Brunnen and Kaolingrube only with a Hofmanufaktur', () => { /* ensureProjectOffers + setTier */ });
it('a project at level 3 is never offered again', () => { /* levels.rathaus = 3 → never in offered over 50 seeds */ });
it('stage size grows with level and with active members; absent members do not count', () => {
  // instantiateStage(rathaus, 1, 0, 3) ton 600×1.2 = 720; level 2 → 1080; level 3 goods minQuality +1; taler level 3 = 40000×12×1.2 = 576000
  // projectScale(1) === projectScale(2) === 1.0; projectScale(9) === 1.8
});
it('the 70 % rule: units allowed for a fresh actor and at the boundary', () => {
  // 4 parts, actor has given 100 % of parts 0 and 1 → share 0.5; part 2 size 100 → maxProjectUnits 80 (0.2 × 100 × 4)
});
it('[pacing] level-I Taler for 3 active members is 300k–800k per project; level III Rathaus stays under 10 M', () => { /* sum of taler parts */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/shared/village/projects.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `projects.ts` and the offer step in `tickVillage`**

Add the benefit constants from Task 9 to `benefits.ts` now (values only), so the benefit texts compile.

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/shared/village && npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/village/{projects,tick,benefits}.ts test/shared/village/projects.test.ts
git commit -m "feat(village): grand projects — data, stages, offers and the 70 % rule"
```

---

### Task 8: Contributing to projects, stage and project completion

**Files:**
- Create: `src/shared/village/projectActions.ts`
- Modify: `src/shared/village/apply.ts`, `src/shared/village/state.ts` (validation), `src/shared/village/decor.ts`
- Test: `test/shared/village/project-actions.test.ts`

**Interfaces:**
- Consumes: everything in `projects.ts` (Task 7), `takeGoods`/`allowsSubstitute` (Task 2), `villageStorePrice`, `PRESTIGE_RANK`, `PRESTIGE_NAME`, `noteLevelUp`, `levelBonus`, `BASE_SHARE`
- Produces: `contributeToProject(v: VillageState, actor: GameState, me: Member, a: Extract<VillageAction, { type: 'contributeProject' }>, now: number): Delivery[] | string` (mutates `v` and `actor`). It is called from `applyVillageAction` and fills `events`.
- Validation (`state.ts`): `projectId` is a string, `part` is an integer ≥ 0, `source` ∈ {own, store, substitute}, `count` passes `isCount(·, 100_000_000)`, and `masterworkIds` is absent or an array of ≤ 10 strings.
- `DECOR` gains: `brunnenfliese: 'Brunnenfliese', wall`; `tischglocke: 'Kleine Messingglocke', window`; `museumsplakat: 'Museumsplakat', wall`; `kaolinbrocken: 'Kaolinbrocken', floor`; `ratssiegel: 'Ratssiegel', wall`.

Rules:
- **Choosing.** With `active === null`: if `projectId` ∈ `offered`, the project becomes active at level `levels[id] + 1`, stage 0, parts `instantiateStage(def, level, 0, activeMembers(v, now).length)`, and `offered = []`. News: `` `${me.name} hat den ersten Stein gelegt: Das Dorf baut jetzt ${def.name} ${ROMAN[level-1]}!` ``. Otherwise the error is `'Dieses Projekt steht gerade nicht zur Wahl'`. With an active project and a different `projectId`, the error is `` `Das Dorf baut gerade schon: ${PROJECTS[active.projectId].name}` ``. Nothing is taken in either case.
- **Cap first.** `units > maxProjectUnits(active, part, actorId)` → `'Mehr als 70 % einer Bauphase darf niemand allein geben – lass den anderen etwas übrig!'`. `units > left` → `` `Es fehlen nur noch ${left}` ``.
- **material:** `own` takes from `actor.materials`. `store` costs `villageStorePrice × count` Taler (`` `Im Dorfladen kostet das ${fmtTaler(cost)} Taler – so viel hast du nicht` ``). `substitute` is refused.
- **goods:** `own` uses `takeGoods(…, false)`, `substitute` uses `takeGoods(…, true)` (units = count / 3, cap checked on units), `store` → `'Ware gibt es nicht im Dorfladen – die musst du selbst töpfern'`.
- **taler:** `count` is Taler. The actor needs `taler ≥ count` (`'Dafür hast du nicht genug Taler'`). Units = count.
- **masterwork:** `masterworkIds.length === count`. Each id must be in `actor.masterworks` (`'Dieses Meisterstück gibt es nicht'`), not yet in `v.lentMasterworks` (`'Dieses Meisterstück steht schon im Dorf'`), and have `PRESTIGE_RANK ≥ minPrestige` (`` `Dafür braucht es mindestens ${PRESTIGE_NAME[min]}` ``). Push `` `${actorId}:${id}` `` to `lentMasterworks`. The actor keeps the masterwork.
- On success: `filled += units`, `by[actorId] += units`, event `'Beigesteuert – danke!'`.
- **Stage complete** (`isStageComplete`):
  - Deliveries go to every member: `share = BASE_SHARE / n + (1 − BASE_SHARE) × stageShares[id] / Σshares`, Taler `round(reward.taler × share)`, Ruf `max(1, round(reward.ruf × share))`.
  - `stagesDone += 1`, then `noteLevelUp`. News: `` `Bauphase „${stage.name}“ am ${def.name} ist fertig! Alle bekommen ihren Anteil.` ``
  - The next stage is instantiated with the current active count and `stageStartedAt = now`.
- **Project complete** (after the last stage):
  - Set `levels[id] = level` and `active = null`, then run `ensureProjectOffers`.
  - At level 1, every member also gets `decor: [def.decor]`. Every member gets `village: { projects: { ...levels } }`.
  - News: `` `${def.name} ${ROMAN[level-1]} ist fertig! ${def.benefit(level)}` ``
  - Actor event: `` `${def.name} ${ROMAN[level-1]} ist fertig! 🎉` ``

- [ ] **Step 1: Write the failing tests** (`project-actions.test.ts`, with `runAction`, `setTier`, a stocking helper like `stock()` in `joint.test.ts`)

```ts
it('the first contribution picks the project; the other offer disappears', () => { /* … news text verbatim */ });
it('[Review Focus 4] a contribution to the other offered project after the pick is refused and costs nothing', () => {
  // p1 picks offered[0]; p2 contributes to offered[1] → error 'Das Dorf baut gerade schon: <name>', ws.p2 unchanged (deep equal)
});
it('[Review Focus 3] nobody gives more than 70 % — not with Taler, not with the village store, not with substitutes', () => {
  // p1 at 0.69 share: taler part beyond the boundary → error; exactly maxProjectUnits → ok; store material beyond → error; substitute count 3×(max+1) → error
});
it('substitutes: 3 earthenware per unit, tiles as plates, packs of three only', () => { /* … */ });
it('a masterwork part lends a masterwork once forever; it stays on the plinth', () => {
  // contribute mw1 → lentMasterworks ['p1:mw1'], ws.p1.masterworks still has mw1; again → 'Dieses Meisterstück steht schon im Dorf'; bronze for silver part → 'Dafür braucht es mindestens Silber'
});
it('a completed stage pays everyone, absent members included, and raises the village level', () => {
  // 3 members, p3 lastSeen 30 days ago, p1+p2 fill: p3 gets taler ≥ round(reward.taler × 0.4/3); stagesDone 1; stage index 1 instantiated
});
it('with only one active member the stage waits; their contributions stay', () => { /* village(2), p2 lastSeen −8 d: p1 fills up to 70 %, stage not complete, filled kept */ });
it('a completed project grants the decor, the snapshot level, and offers the next level', () => {
  // drive all stages of 'glockenturm' with two stocked players → levels.glockenturm 1, every delivery has village.projects.glockenturm 1 and decor 'tischglocke'; offered may include 'glockenturm' (level 2)
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/shared/village/project-actions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `projectActions.ts`, wire it into `applyVillageAction`, add validation and `DECOR` entries**

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS (the progression test that checks `DECOR` ids still passes)

- [ ] **Step 5: Commit**

```bash
git add src/shared/village/{projectActions,apply,state,decor}.ts test/shared/village/project-actions.test.ts
git commit -m "feat(village): contribute to grand projects, stage and project completion"
```

---

### Task 9: Lasting benefits in the workshop (Ruf trickle, market day, kaolin)

**Files:**
- Modify: `src/shared/types.ts` (`VillageSnapshot`), `src/shared/village/benefits.ts`, `src/shared/advance.ts`, `src/shared/market.ts`, `src/shared/village/specialties.ts`
- Test: `test/shared/village/benefits.test.ts`

**Interfaces:**
- Produces:
  - `VillageSnapshot.projects?: Record<string, number>`; `VillageSnapshot.rufCarry?: number` (optional, no schema bump; `applyDelta`'s `Object.assign` already carries `projects`)
  - `benefits.ts`:
    - Constants: `BRUNNEN_RUF_PER_DAY = [3, 6, 10]`, `MUSEUM_MAX_COUNTED = 10`, `MARKET_DAY_HOURS = [3, 4, 6]`, `MARKET_DAY_FACTOR = [1.2, 1.35, 1.5]`, `MARKET_DAY_START_UTC_HOUR = 9`, `KAOLIN_PRICE_FACTOR = [0.6, 0.45, 0.3]`
    - `projectLevel(s: { village: VillageSnapshot | null }, id: string): number`
    - `villageRufPerDay(s: GameState): number` = Brunnen value + `museumLevel × min(10, s.masterworks.length)`
    - `trickleVillageRuf(s: GameState, from: number, to: number): void` (carry in `village.rufCarry`)
    - `marketDayAt(s: GameState, t: number): { factor: number; endsAt: number } | null` (Saturday = `floor(t / DAY) % 7 === 2`, window `[day + 9 h, day + 9 h + hours)` UTC)
    - `nextMarketEdge(s: GameState, t: number): number | null`
    - `kaolinFactor(s: GameState): number`
  - `advance.ts` `sell()` calls `trickleVillageRuf` next to `trickle`.
  - `market.ts`: `stallPriceFactor(s, t: number)` returns the market-day factor inside the window and the existing value outside. `stallSalesBetween` splits `[from, to)` at `nextMarketEdge` points and sells each segment with its factor. Splitting is only needed when `projectLevel(s,'glockenturm') > 0`, which keeps the hot path unchanged for everyone else.
  - `shopPrice` multiplies kaolin by `kaolinFactor(s)` after the other rules.

- [ ] **Step 1: Write the failing tests** (`benefits.test.ts`)

```ts
it('Dorfbrunnen I gives 3 Ruf a day, carried in fractions; III gives 10', () => { /* trickleVillageRuf over 8 h ×3 → +3 total */ });
it('the museum brings level × own masterworks (at most 10) Ruf a day', () => { /* museum 2, 12 masterworks → 20/day */ });
it('market day: Saturday from 09:00 UTC, factor and length by Glockenturm level; never without it', () => { /* marketDayAt at Sat 08:59, 09:00, 11:59, 12:00 for level 1 */ });
it('[Review Focus 5] a catch-up across the market day prices each part of it right', () => {
  // state with glockenturm 2, stall stocked; stallSalesBetween(Fri 20:00 → Sun 08:00) taler === sum of the three segments sold separately on clones (±0.01)
});
it('the Kaolingrube makes kaolin cheaper for everyone', () => { /* shopPrice kaolin: 6 → 3.6 (I), 1.8 (III); other materials unchanged */ });
it('without village projects nothing changes', () => { /* ruf, prices identical to a state with village.projects undefined */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/shared/village/benefits.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement as specified above**

- [ ] **Step 4: Run tests, including the catch-up bounds**

Run: `npx vitest run && npm run check`
Expected: PASS (the 30-day catch-up time bounds in `test/shared/advance.test.ts` still pass)

- [ ] **Step 5: Commit**

```bash
git add src/shared/{types,advance,market}.ts src/shared/village/{benefits,specialties}.ts test/shared/village/benefits.test.ts
git commit -m "feat(village): lasting project benefits — Ruf trickle, market day, cheap kaolin"
```

---

### Task 10: Map: bigger village, great kiln, project sites with stages and levels, level decorations

**Files:**
- Create: `src/client/art/village/GreatKiln.tsx`, `src/client/art/village/ProjectSites.tsx`, `src/client/art/village/Decorations.tsx`, `src/client/dev/VillageSitesPage.tsx`
- Modify: `src/client/art/village/VillageMap.tsx`, `src/client/art/village/Buildings.tsx`, `src/client/art/village/village.css`, `src/client/dev/mockVillage.ts`, `src/client/dev/VillagePage.tsx`, `src/client/main.tsx` (dev route table)
- Test: `test/client/villagemap.test.tsx`, `test/client/village-longgoals.test.tsx`

**Interfaces:**
- Consumes: `VillageView` (with `greatKiln`, `projects`, `stagesDone`), `villageLevel`, `decorationsFor`, `PROJECTS`
- Produces:
  - `MAP_H = 1200`; `BUILDING_SPOTS.gemeinschaftsofen = { x: 1000, y: 640 }`; `PROJECT_SPOTS: Record<string, { x: number; y: number }> = { dorfbrunnen: { x: 420, y: 1000 }, glockenturm: { x: 1000, y: 1000 }, museum: { x: 200, y: 1110 }, kaolingrube: { x: 1220, y: 1110 }, rathaus: { x: 700, y: 1130 } }` (starting coordinates; move them during self-review if anything overlaps)
  - `GreatKilnArt({ x, y, phase, fill }: { x: number; y: number; phase: 'idle' | 'loading' | 'firing'; fill: number })`: a domed brick wood kiln with a chimney and a stacked woodpile. `loading` shows pots in the open door, scaled by `fill` 0..1. `firing` shows a glowing door, class `smoke` puffs and a pulsing glow (CSS). Root element: `data-kiln={phase}`.
  - `ProjectSite({ id, x, y, level, building, offered, onClick })`, where `building: { level: 1 | 2 | 3; stage: number; stages: number } | null`:
    - Not started and never built: an empty plot with a stake sign. If `offered`, the sign reads `` `Zur Wahl: ${name}` ``, otherwise `'Bauplatz'`.
    - Under construction: the finished drawing for `building.level`, revealed bottom-up by a clip rect of height `stage / stages`, with wooden scaffolding over the unbuilt part and a sign `` `${name} ${ROMAN} · ${stage}/${stages}` ``.
    - Built: the finished drawing at `level`.
    - Root: `data-project-site={id} data-stage={stage} data-level={level}`.
  - One draw function per project with three looks:
    - Dorfbrunnen: a tiled basin and water. II adds a fountain jet. III adds a blue-and-white porcelain figure.
    - Glockenturm: a stone tower with a bell. II adds a clock. III adds a gilded spire.
    - Museum: a columned hall. II adds banners. III adds a glass dome.
    - Kaolingrube: a white pit with a headframe. II adds a cart rail. III adds a second shaft and a white heap.
    - Rathaus: a half-timbered hall with a tower. II adds a balcony with flags. III adds a gilded clock and a fountain-side stair.
  - `LevelDecorations({ level })`: draws every unlocked `LEVEL_DECORATIONS` item at fixed spots around the square (flower beds, lanterns, maypole, bunting, benches, rose arch). Each has `data-decoration={id}`.
  - The map sign reads `` `${village.name} · Stufe ${villageLevel(village)}` `` (widen the sign plaque).
  - `VillageMap` `onBuilding` also receives `'gemeinschaftsofen'` and project ids. The museum, once built, calls `onBuilding('museum')`.
  - `mockVillage(n, buildings, now, opts?: { level?: number; kiln?: 'empty' | 'loading' | 'firing'; project?: { id: string; level: 1 | 2 | 3; stage: number }; levels?: Record<string, number>; offered?: string[] })`
  - `VillagePage` reads `#village&n=5&kiln=firing&project=rathaus:1:2&levels=dorfbrunnen:2,museum:1&level=12&offered=glockenturm,museum`.
  - `VillageSitesPage` (`#village-sites`) is a grid: every project at plot, offered, each stage 1..n−1 of level I, and finished I/II/III. Plus the kiln in all three phases and `LevelDecorations` at level 30.
  - Phone CSS: below 900 px the map keeps scrolling horizontally inside `.village-scroll` at `height: min(70vh, 640px)`. No page overflow.

- [ ] **Step 1: Write the failing tests**

```ts
it('the kiln shows its phase; project sites show plot, stage and level; the sign shows the village level', () => {
  const v = mockVillage(4, ['tongrube', 'gemeinschaftsofen'], T0, { kiln: 'firing', project: { id: 'rathaus', level: 1, stage: 2 }, levels: { museum: 2 }, level: 12 });
  const html = render(<VillageMap village={v} meId="p1" now={T0} onHouse={() => {}} onBuilding={() => {}} />);
  expect(html).toContain('data-kiln="firing"');
  expect(html).toMatch(/data-project-site="rathaus" data-stage="2" data-level="1"/);
  expect(html).toMatch(/data-project-site="museum"[^>]*data-level="2"/);
  expect((html.match(/data-project-site=/g) ?? []).length).toBe(5);
  expect((html.match(/data-decoration=/g) ?? []).length).toBe(2);
  expect(html).toContain('Stufe 12');
  expect(html).not.toMatch(/NaN|undefined/);
});
it('every project draws all three levels and every stage without NaN', () => { /* render ProjectSite for each id × level × stage */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/client/villagemap.test.tsx test/client/village-longgoals.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement the art and map changes as specified above**

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS

- [ ] **Step 5: Art self-review (every new building and every construction stage, spec §5.4)**

```bash
npm run shot -- "http://localhost:5173/#village-sites" village-sites --full
npm run shot -- "http://localhost:5173/#village&n=5&kiln=firing&project=rathaus:1:2&levels=dorfbrunnen:2,museum:1,glockenturm:3&level=17" village-lg-map
npm run shot -- "http://localhost:5173/#village&n=2&offered=glockenturm,museum&kiln=loading&level=3" village-lg-early
```
Check against the style reference: the ink weight matches the existing buildings, every stage reads as progress, the level looks are clearly different, nothing overlaps houses, the well or the board, smoke animates (two shots 1 s apart look different), and on the phone houses are still tappable without page overflow. Fix and re-shoot until it passes.

- [ ] **Step 6: Commit**

```bash
git add src/client/art/village/ src/client/dev/{mockVillage.ts,VillagePage.tsx,VillageSitesPage.tsx} src/client/main.tsx test/client/{villagemap,village-longgoals}.test.tsx docs/screens/village-{sites,lg-map,lg-early}-*.png
git commit -m "feat(art): great kiln, project sites with stages and levels, village decorations"
```

---

### Task 11: Project decor in the workshop

**Files:**
- Modify: `src/client/art/workshop/Decor.tsx`, `src/client/dev/mockEndgame.ts` (a `VILLAGE_DECOR` list for the dev scene)
- Test: `test/client/workshop.test.tsx`

**Interfaces:**
- Consumes: the five `DECOR` ids from Task 8 (`brunnenfliese`, `tischglocke`, `museumsplakat`, `kaolinbrocken`, `ratssiegel`)
- Produces: a draw entry per id in the `Decor.tsx` table, each at a fixed position for its `spot` that does not collide with the existing items of the same spot:
  - `brunnenfliese`: a framed blue-and-white tile with a tiny fountain;
  - `tischglocke`: a small brass bell on the window sill;
  - `museumsplakat`: a poster showing a vase and the word `Museum`;
  - `kaolinbrocken`: a white lump on a little wooden stand;
  - `ratssiegel`: a red wax seal on a ribbon.

- [ ] **Step 1: Write the failing test**

```ts
it('every DECOR id draws in the room', () => {
  for (const id of Object.keys(DECOR)) { const html = render(<Room … decorPlaced={[id]} />); expect(html, id).toMatch(new RegExp(`data-decor="${id}"`)); expect(html).not.toMatch(/NaN|undefined/); }
});
```
(Use the existing `Room` render setup in `workshop.test.tsx`. If decor items have no `data-decor` attribute yet, add it to the shared wrapper.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run test/client/workshop.test.tsx`
Expected: FAIL for the five new ids

- [ ] **Step 3: Implement the five drawings**

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS

- [ ] **Step 5: Art self-review**

Add `&vdecor` handling to `GamePage` (dev-only: replaces `decorPlaced` with the five project decor items). Run `npm run shot -- "http://localhost:5173/#game&endgame&calm&vdecor" village-decor`. Check that the items are cute, legible at phone size and don't collide. Fix until it passes.

- [ ] **Step 6: Commit**

```bash
git add src/client/art/workshop/Decor.tsx src/client/dev/{mockEndgame.ts,GamePage.tsx} test/client/workshop.test.tsx docs/screens/village-decor-*.png
git commit -m "feat(art): workshop decor for the five village projects"
```

---

### Task 12: Village panels (great kiln, projects, museum, substitutes)

**Files:**
- Create: `src/client/panels/village/GreatKilnPanel.tsx`, `src/client/panels/village/ProjectPanel.tsx`, `src/client/panels/village/MuseumView.tsx`
- Modify: `src/client/panels/village/{VillagePanel,VillageTabs,JointOrdersPanel}.tsx`, `src/client/dev/GamePage.tsx` (`&vmock=` sets `village.value` from `mockVillage` and `me.playerId = 'p1'`)
- Test: `test/client/village-longgoals.test.tsx`, `test/client/village-panels.test.tsx`

**Interfaces:**
- Consumes: the `VillageView` fields; `maxProjectUnits`, `stageShares`, `partSize`, `PROJECTS`, `ROMAN` (Task 7); `kilnCost`, `shareLeft`, `heatFor`, constants (Task 4); `allowsSubstitute`, `substituteForm`, `SUBSTITUTE_FACTOR` (Task 2); `masterworkBusy` (Task 5); `marketDayAt` (Task 9); `villageDispatch`
- Produces:
  - `VillageTab` gains `'project' | 'kiln'`. Tabs: `Großaufträge`, `Dorfprojekt`, `Gemeinschaftsofen` (only when `buildings` includes it), `Tauschbrett`, `Schenken`, `Gästebuch`, `Neuigkeiten`.
  - Map clicks: kiln → `kiln`, project site → `project`, built museum → `MuseumView`. Other buildings keep the toast.
  - `ProjectCard({ v, s, meId, onContribute })` (exported for tests):
    - Offer state: one card per offered project with name, description, `Erste Bauphase: …` (part labels) and the hint `'Wer zuerst etwas beiträgt, wählt das Projekt.'`.
    - Active state: `` `${name} ${ROMAN} · Bauphase ${stage+1}/${stages}: ${stageName}` ``, a progress bar per part, `` `Dein Anteil: ${pct} % – höchstens 70 %` ``, contributor faces, and buttons per part kind. Material: `` `${n} aus deinem Lager` `` and `'Im Dorfladen kaufen (3×)'`. Goods: one per fitting stack, plus `` `Ersatz: ${3n}× ${plural} aus Irdenware` `` when `allowsSubstitute`. Taler: `` `${fmtTaler(n)} Taler geben` ``. Masterwork: one per unlent own masterwork meeting `minPrestige`, labelled with its prestige.
    - When the cap is reached: `'Den Rest lässt du den anderen – kein Dorfprojekt geht allein.'`
    - With fewer than 2 active members: `'Zu zweit geht’s weiter: Eine Bauphase braucht zwei Leute, die etwas beitragen.'`
    - With nothing offered and nothing active: `'Dorfprojekte gibt es, sobald jemand im Dorf die Manufaktur erreicht hat.'`, or after all 15 levels `'Alle Dorfprojekte stehen – auf Stufe III!'`.
    - Below the card: a list of finished projects with level and `benefit(level)`, plus `` `Dorfstufe ${level}: Großaufträge und Dorfprojekte zahlen ${pct} % mehr.` ``
  - `GreatKilnPanel({ v, s, meId })`:
    - State line: `'Der Ofen ist leer.'`, or `` `${pieces}/${GREAT_KILN_CAPACITY} Stücke · brennt spätestens um ${HH:MM}` ``, or `` `Der Ofen brennt – fertig um ${HH:MM}.` ``.
    - Expected heat: `` `Hitze: ${pct} %` `` with the line `'Mehr Leute und mehr Holz machen das Feuer heißer.'`.
    - Load form: own designs, count `1…shareLeft`, wood per piece 2–6, cost via `kilnCost`, button `'In den Ofen räumen'`.
    - `'Meisterstück mitbrennen'` button when there is a commission and `!masterworkBusy`.
    - Last firing summary.
  - `MuseumView({ v })`: one shelf per member showing their `museum` pieces as `Pot`s with prestige ribbons. Title `` `Museum ${ROMAN[level-1]}` ``. Empty text `'Noch keine Meisterstücke – das Museum wartet!'`.
  - `JointOrderCard`: part label adds `` ` aus ${BODIES[body].name}` `` and `` ` mit ${EFFECTS[effect].name}` ``, plus the substitute button as above.
  - Market-day banner on the village panel while `marketDayAt(s, now)`: `` `Markttag! Bis ${HH:MM} verkaufen die Marktstände zu ${pct} %.` ``

- [ ] **Step 1: Write the failing tests**

```ts
it('two offers explain that the first contribution chooses', () => { /* render ProjectCard with offered → 2 cards, 'Wer zuerst etwas beiträgt' */ });
it('an active stage shows share, 70 % cap and the right buttons per part kind', () => {
  // goods part with body steinzeug → 'Ersatz: … aus Irdenware' button; taler part → 'Taler geben'; at 70 % → 'Den Rest lässt du den anderen'
});
it('the kiln panel shows capacity, heat and the share left', () => { /* mock kiln loading 20/60 → '20/60 Stücke', 'Hitze:' */ });
it('a joint body part offers the substitute button', () => { /* JointOrderCard */ });
it('the museum shows every member’s masterworks', () => { /* MuseumView with 2 members × 1 piece → 2 pots */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/client/village-longgoals.test.tsx test/client/village-panels.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement as specified above**

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS

- [ ] **Step 5: Screenshot self-review**

```bash
npm run shot -- "http://localhost:5173/#game&endgame&calm&vmock=project&panel=village&arg=project" village-project
npm run shot -- "http://localhost:5173/#game&endgame&calm&vmock=offers&panel=village&arg=project" village-offers
npm run shot -- "http://localhost:5173/#game&endgame&calm&vmock=kiln&panel=village&arg=kiln" village-kiln
npm run shot -- "http://localhost:5173/#game&endgame&calm&vmock=museum&panel=village&arg=museum" village-museum
```
(`vmock` presets: `project` = Rathaus I stage 2 active with contributions; `offers` = two offered; `kiln` = loading 32/60 with a last firing; `museum` = museum I with masterworks for 4 members.) Check that the buttons fit on the phone, the texts read naturally in German and there is no overflow. Fix until it passes.

- [ ] **Step 6: Commit**

```bash
git add src/client/panels/village/ src/client/dev/GamePage.tsx test/client/{village-longgoals,village-panels}.test.tsx docs/screens/village-{project,offers,kiln,museum}-*.png
git commit -m "feat(village): panels for the great kiln, projects and the museum"
```

---

### Task 13: End-to-end, README, final verification

**Files:**
- Modify: `test/e2e/village-smoke.mjs`, `README.md`

- [ ] **Step 1: Extend the e2e smoke** (after the joint-order part, before the screenshots)

- Both players: `POST /api/dev/grant { taler: 400000, ruf: 400 }`. Then A runs `upgradeTier` via `/api/action`.
- `GET /api/village` (A): `buildings` includes `gemeinschaftsofen`, otherwise fail `'kiln missing'`.
- A loads `{ type: 'loadKiln', designId: A.designs[0].id, count: 6, wood: 12 }`. B loads 6 with wood 36.
- `POST /api/dev/village-warp { minutes: 24 * 60 + 130 }`. Poll `/api/state` for both until each has 6 more cups than after loading (≤ 10 tries). Check that `village.lastFiring.pieces === 12` and that some news contains `'abgekühlt'`.
- `v.projects.offered.length ≥ 1`. A contributes the first material part of `offered[0]` via `source: 'store'` with `count = 1`. Expect `projects.active.projectId === offered[0]`.
- B contributes the stage's taler part with `count = 1000`.
- A tries the taler part with the full remainder. Expect status 400 and an error containing `'70 %'`.
- Screenshots: `docs/screens/village-lg-live.png` (map), `village-lg-project.png` (Dorfprojekt tab), `village-lg-kiln.png` (Gemeinschaftsofen tab).

- [ ] **Step 2: Run the e2e**

Run: `npm run dev` (with `DEV_FAST=1` in `.dev.vars`), then `node test/e2e/village-smoke.mjs http://localhost:5173`
Expected: ends with `VILLAGE SMOKE OK`, no page errors

- [ ] **Step 3: README**

In "Das Dorf", add bullets (German):
- Großaufträge gehen weiter (auch mit Steinzeug, Porzellan, Fliesen und Stücken aus dem Gemeinschaftsofen, mit Irdenware-Ersatz zum dreifachen Preis). Jeder geschaffte Auftrag und jede Bauphase hebt die Dorfstufe (+2 % Belohnung pro Stufe, höchstens +40 %).
- Gemeinschaftsofen ab der ersten Manufaktur im Dorf: einräumen, nach 24 Stunden oder wenn voll brennt er zwei Stunden; Ascheanflug, Flammenspur und Ascheglasur gibt es nur hier.
- Dorfprojekte (Dorfbrunnen, Glockenturm, Museum, Kaolingrube, Rathaus) mit je drei Stufen; niemand darf mehr als 70 % einer Bauphase geben.

Add `POST /api/dev/village-warp { minutes }` to the dev API list and `/#village-sites` to the dev pages.

- [ ] **Step 4: Full verification**

Run: `npx vitest run && npm run test:worker && npm run check`
Expected: all PASS (re-run the known timing flake alone if it fails)

- [ ] **Step 5: Commit**

```bash
git add test/e2e/village-smoke.mjs README.md docs/screens/village-lg-*.png
git commit -m "test(e2e): great kiln and grand projects in the village smoke; README"
```
