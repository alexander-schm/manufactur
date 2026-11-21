# Branches & Long Goals (solo endgame) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the solo game a weeks-long goal: workshop tiers (Manufaktur, Hofmanufaktur), clay bodies (stoneware, porcelain) with new effects, forms and customers, work bays, a collection book, masterworks, a longer milestone ladder and no more click-grinding for materials.

**Architecture:** Everything is data in `src/shared/content` (new tables `TIERS`, `BODIES`, `FRAMES`, `EXTRA_COLORS`, `PATRONS`) plus two new shared modules (`collection.ts`, `masterwork.ts`) and one small one (`shop.ts`). The catch-up loop in `advance.ts` gains bays, auto-restock, collection recording and masterwork batches, all with plain arrays. The client gets a body picker, a collection book, a masterwork panel, tier UI and new art; every art piece is screenshot-reviewed against the style reference.

**Tech Stack:** TypeScript, Preact + SVG, Vitest (+ Workers pool), Cloudflare Worker + D1 + Durable Object, Playwright for screenshots/e2e.

**Spec:** `docs/superpowers/specs/2026-11-21-branches-and-long-goals-design.md` (builds on `docs/superpowers/specs/2026-11-07-manufaktur-design.md` §4.5, §4.7, §7)

Two parts, each ending green and shippable: **Part 1 (Tasks 1–17) Manufaktur + Steinzeug**, **Part 2 (Tasks 18–22) Hofmanufaktur + Porzellan**.

## Global Constraints

- All in-game text is German and lives in content data (`src/shared/content/*`) or `src/client/strings.ts`; errors are German via `fail()` in `applyAction`.
- `src/shared` stays deterministic: no `Date.now()`, no `Math.random()`; randomness only through `state.rng` (`nextRandom`/`pick`/`randInt`).
- A rejected action leaves the state untouched (existing `expectRejected` pattern).
- Catch-up hot path (`advance`, `startWork`, `completeDue`, `market.ts`, `applyMilestones`) uses plain arrays/loops, no per-event allocations beyond what exists; the existing 30-day test bounds (median < 20 ms per 3000-event chunk, total < 1 s) must keep passing.
- Save migration: `SCHEMA_VERSION` 2 → 3 (Part 1 only). Existing states load without loss; Part 2 adds only optional fields, no bump.
- Interface names later projects use: `state.tier`, `Design.body`, `GlazeRecipe.body`, `BODIES`, `MasterworkRecord.prestige`, collection keys `form|body|effect`, `MakerMark.frame`.
- Anti-goals: earthenware numbers (value, durations, materials, difficulty) stay exactly as today; nothing decays or expires; no "make N pieces" milestones.
- Art: hand-inked style of `docs/art/art-style-reference.png` ("cute and nice" bar). Art gates: take screenshots with `npm run shot -- "<url>" <name>` (dev server running via `npm run dev`), self-review them against the reference, fix until they pass, commit PNGs in `docs/screens/`. Shot output must show `horizontalOverflow=0px` and no `ERRORS`.
- Tests: `npx vitest run` (shared + client), `npm run test:worker`, `npm run check` (tsc, includes `test/`). Known flake: "[Review Focus 1] 30 days of absence" in `test/shared/advance.test.ts` is timing-based and can fail under full-suite load; re-run it alone before treating it as a failure.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stay on branch `feat/endgame`.

## Review Focus

1. A v1/v2 save with batches in flight, a standing order, goods, and gifted foreign designs/offers without `body` loads, keeps producing, and values earthenware exactly as before (Task 4 test).
2. A 30-day absence at Manufaktur with bays, keep-in-stock, a running masterwork and the full milestone ladder stays inside the catch-up time bounds and never drives Taler negative (Task 10 test).
3. Keep-in-stock with too little Taler buys what it can, never goes negative, and coexists with the standing order's auto-buy (Task 7 test).
4. A stoneware order while the stall sells: the stall does not sell the stoneware pieces that order needs, and earthenware pieces of the same form cannot be delivered to it (Task 6 test).
5. A masterwork in a kiln next to a full-capacity normal batch, and on a one-bay wheel: normal work waits, then resumes; nothing deadlocks or spins (Task 9 test).

---

## File Structure

**Create (shared)**
- `src/shared/content/tiers.ts`: `TierDef`, `TIERS`, `TIER_ORDER`, tier helpers.
- `src/shared/content/bodies.ts`: `BodyDef`, `BODIES`, body helpers.
- `src/shared/content/frames.ts`: maker's-mark frames.
- `src/shared/content/colors.ts`: unlockable pattern/mark colours (collection prizes).
- `src/shared/content/patrons.ts`: masterwork patrons.
- `src/shared/shop.ts`: buyability check and auto-restock.
- `src/shared/collection.ts`: collection book entries, recording, percentages, row/column prizes.
- `src/shared/masterwork.ts`: commissions, criteria, prestige, start/finish.

**Create (client)**
- `src/client/panels/BodyPicker.tsx`, `TierSection.tsx`, `CollectionBook.tsx`, `collectionLogic.ts`, `MasterworkPanel.tsx`.
- `src/client/art/markFrame.tsx`, `src/client/art/workshop/TierSign.tsx`, `src/client/art/workshop/Plinth.tsx`, `src/client/art/Figure.tsx` + `src/client/art/Tile.tsx` (Part 2).
- `src/client/dev/mockEndgame.ts`.

**Create (tests)**
- `test/shared/{tiers,bays,bodies,shop,collection,masterwork,endgame-pacing}.test.ts`, `test/shared/endgameBot.ts`.
- `test/client/{shop,collection,masterwork,workshop}.test.tsx`.

**Modify:** `src/shared/{types,state,actions,advance,production,market,orders,design,discovery,progression}.ts`, `src/shared/content/{index,materials,effects,forms,customers,stations,unlocks}.ts`, `src/shared/village/{apply,decor}.ts`, `src/worker/{dev,index}.ts`, client panels/art/dev files named per task, `test/e2e/smoke.mjs`, `README.md`.

---

# Part 1 — Manufaktur & Steinzeug

### Task 1: Schema 3 foundation (types, tiers, bodies, migration)

**Files:**
- Create: `src/shared/content/tiers.ts`, `src/shared/content/bodies.ts`
- Modify: `src/shared/types.ts`, `src/shared/state.ts`, `src/shared/content/{index,materials,unlocks}.ts`, `src/shared/design.ts` (`glazeForDesign` literal), every design/glaze literal tsc flags (`src/client/dev/*`, tests)
- Test: `test/shared/state.test.ts`, `test/shared/content.test.ts`

**Interfaces:**
- Produces (types.ts):
  - `type Tier = 'werkstatt' | 'manufaktur' | 'hofmanufaktur'`; `type BodyId = 'irdenware' | 'steinzeug' | 'porzellan'`; `type Prestige = 'bronze' | 'silver' | 'gold'`
  - `Design.body: BodyId`; `GlazeRecipe.body: BodyId`; `Batch.masterwork?: boolean`; `Order.body?: BodyId`; `MakerMark.frame?: string`
  - `type MasterworkCriterion = { kind: 'body'; body: BodyId } | { kind: 'form'; form: string } | { kind: 'tall'; tall: boolean } | { kind: 'effect'; effect: string } | { kind: 'pattern'; pattern: PatternKind } | { kind: 'color'; colorFamily: string }`
  - `interface Commission { id: string; patronSeed: number; patronName: string; patronJob: string; criteria: MasterworkCriterion[]; costTaler: number; rewardTaler: number; rewardRuf: number }`
  - `interface MasterworkRecord { id: string; commissionId: string; patronName: string; design: Design; glazeColor: string; effect: string | null; quality: 1 | 2 | 3; met: number; total: number; prestige: Prestige; finishedAt: number; acked: boolean }`
  - `GameState` gains `tier: Tier; collection: string[]; collectionRewards: string[]; keepStock: Record<string, number>; commission: Commission | null; masterworks: MasterworkRecord[]`
- Produces (tiers.ts): `interface TierDef { id: Tier; name: string; price: number; ruf: number; maxStationLevel: number; text: string }`, `TIERS: TierDef[]` (Part 1: werkstatt, manufaktur), `TIER_ORDER: Tier[] = ['werkstatt','manufaktur','hofmanufaktur']`, `tierRank(t: Tier): number`, `tierAtLeast(s: { tier: Tier }, t: Tier): boolean`, `getTier(t: Tier): TierDef` (throws for tiers not in `TIERS`), `nextTier(s: { tier: Tier }): TierDef | null`, `tierForLevel(level: number): TierDef | undefined` (first tier whose `maxStationLevel >= level`).
- Produces (bodies.ts): `interface BodyDef { id: BodyId; name: string; material: string; tier: Tier; valueMul: number; difficultyAdd: number; glazeFireMul: number; mustFireHot: boolean; rufBonus: number; clearColor: string; starterGlaze: GlazeRecipe | null; description: string }`, `BODIES: Record<string, BodyDef>`, `getBody(id: string): BodyDef`, `bodyOf(d: { body?: BodyId }): BodyId` (missing → `'irdenware'`), `bodyAvailable(s: { tier: Tier }, id: BodyId): boolean`.

Values (spec §5.1/§5.2):

| | price | ruf | maxStationLevel | name |
|---|---|---|---|---|
| werkstatt | 0 | 0 | 5 | Werkstatt |
| manufaktur | 50000 | 300 | 7 | Manufaktur |

| body | name | material | tier | valueMul | difficultyAdd | glazeFireMul | mustFireHot | rufBonus | clearColor | starterGlaze |
|---|---|---|---|---|---|---|---|---|---|---|
| irdenware | Irdenware | ton | werkstatt | 1 | 0 | 1 | false | 0 | `#e9c9a6` | null |
| steinzeug | Steinzeug | steinzeugton | manufaktur | 1.8 | 0.2 | 1.5 | true | 2 | `#d3c7b4` | `{ id: 'klar-steinzeug', name: 'Klare Steinzeugglasur', base: 'transparent', colorant: null, colorantPct: 0, firing: { temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam' }, color: '#d3c7b4', effect: null, body: 'steinzeug' }` |

New materials: `steinzeugton` (Steinzeugton, clay, price 3, unlock `steinzeug`, "Grauer, feiner Ton, der große Hitze verträgt."), `salz` (Salz, colorant, price 4, colorFamily braun, unlock `steinzeug`, "Grobes Salz. Ins heiße Feuer geworfen, bildet es eine ganz eigene Glasur."). New unlock `steinzeug` (kind `feature`, "Steinzeug", "Grauer Ton, heiß gebrannt, steinhart – und wertvoller."). `UnlockDef.kind` widens to `'form' | 'feature' | 'pattern' | 'room' | 'frame' | 'color' | 'customer' | 'tier'`.

- [ ] **Step 1: Write the failing tests**

```ts
// test/shared/state.test.ts (add)
it('starts as a Werkstatt with empty endgame fields', () => {
  const s = newGame('p', 5, T0);
  expect(s.tier).toBe('werkstatt');
  expect(s.designs[0].body).toBe('irdenware');
  expect(s.glazes[0].body).toBe('irdenware');
  expect([s.collection, s.collectionRewards, s.masterworks, s.commission, s.keepStock]).toEqual([[], [], [], null, {}]);
});
describe('migrateState v2 → v3', () => {
  it('fills tier, bodies and the new fields without touching anything else', () => {
    const v2: any = JSON.parse(JSON.stringify(newGame('p', 5, T0)));
    v2.schemaVersion = 2;
    for (const k of ['tier', 'collection', 'collectionRewards', 'keepStock', 'commission', 'masterworks']) delete v2[k];
    for (const d of v2.designs) delete d.body;
    for (const g of v2.glazes) delete g.body;
    const s = migrateState(v2);
    expect(s.schemaVersion).toBe(3);
    expect(s).toEqual(newGame('p', 5, T0));
  });
  it('chains v1 → v3', () => {
    const v1: any = JSON.parse(JSON.stringify(newGame('p', 5, T0)));
    v1.schemaVersion = 1; for (const k of ['village', 'decor', 'decorPlaced', 'tier', 'collection', 'collectionRewards', 'keepStock', 'commission', 'masterworks']) delete v1[k];
    const s = migrateState(v1);
    expect([s.schemaVersion, s.tier, s.village, s.decor]).toEqual([3, 'werkstatt', null, []]);
  });
});
// test/shared/content.test.ts (add)
it('every material unlock exists, and every body material is a material', () => {
  for (const m of Object.values(MATERIALS)) if (m.unlock) expect(UNLOCKS[m.unlock], m.id).toBeDefined();
  for (const b of Object.values(BODIES)) expect(MATERIALS[b.material], b.id).toBeDefined();
});
it('tier helpers', () => {
  expect(tierAtLeast({ tier: 'manufaktur' }, 'werkstatt')).toBe(true);
  expect(tierAtLeast({ tier: 'werkstatt' }, 'manufaktur')).toBe(false);
  expect(nextTier({ tier: 'werkstatt' })!.id).toBe('manufaktur');
  expect(tierForLevel(6)!.id).toBe('manufaktur');
  expect(bodyOf({})).toBe('irdenware');
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run test/shared/state.test.ts test/shared/content.test.ts`
Expected: FAIL (`tier` undefined / module not found).

- [ ] **Step 3: Implement**

Types, the two tables, exports from `content/index.ts` (`BODIES, TIERS, TIER_ORDER` and helpers), `SCHEMA_VERSION = 3`, new fields in `newGame` (`STARTER_GLAZE.body = 'irdenware'`, first design `body: 'irdenware'`). `migrateState` becomes sequential blocks: the existing `=== 1` block, then `if (s.schemaVersion === 2) { … s.schemaVersion = 3; }` which sets `tier = 'werkstatt'`, `body ??= 'irdenware'` on every design (own and foreign) and glaze, and the empty new fields. `glazeForDesign`'s origin literal gets `body: bodyOf(d)`. Run `npm run check` and add `body: 'irdenware'` to every design/glaze literal it flags (dev pages, tests).

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run && npm run check`
Expected: all PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "feat(shared): schema 3 with tiers, clay bodies and endgame state fields"
```

---

### Task 2: Buying a tier, station levels 6–7, tier milestone

**Files:**
- Modify: `src/shared/actions.ts`, `src/shared/content/stations.ts`, `src/shared/progression.ts`, `src/shared/content/unlocks.ts`, `test/shared/helpers.ts`
- Test: `test/shared/tiers.test.ts`, `test/shared/content.test.ts`

**Interfaces:**
- Consumes: Task 1 tier/body helpers.
- Produces: action `{ type: 'upgradeTier' }`; `Milestone` gains `tier?: Tier` and `decor?: string[]` (decor used from Task 10); milestone `tierManufaktur`; test helper `manufakturGame(seed = 1): GameState` in `test/shared/helpers.ts` = `plainGame(seed)` with `tier: 'manufaktur'`, unlocks `['studio','farbkoerper','reduktion','patterns2','formdetails','schale','teller','vase','krug','upgrades','steinzeug','teekanne','meisterstuecke']` added, all stations level 5, `ruf 400`, `taler 100000`, `materials.steinzeugton = 100`, the steinzeug starter glaze pushed, `milestonesDone`/`milestonesAcked` set to every milestone id whose `done()` currently holds (so tests start quiet).

Station arrays grow to 7 levels: `ppm` factors `[1, 1.4, 1.96, 2.74, 3.84, 4.6, 5.5]`; `upgradeCost` appends (5→6, 6→7) prepBench `[8000, 30000]`, wheel `[9000, 32000]`, dryingRack `[7000, 26000]`, kiln `[10000, 36000]`, glazeTable `[8500, 31000]`, shelf `[6000, 24000]`, marketStall `[8000, 30000]`; `rufRequired` appends `[300, 450]` everywhere; `capacity` appends kiln `[96, 120]`, shelf `[560, 760]`, marketStall `[7, 9]`.

Tier milestone: `{ id: 'tierManufaktur', tier: 'manufaktur', text: 'Aus der Werkstatt wird eine Manufaktur!', unlocks: ['steinzeug', 'teekanne', 'meisterstuecke'], done: (s) => tierAtLeast(s, 'manufaktur') }`. New unlocks: `teekanne` (form, "Teekannen", "Mit Tülle und Deckel – die Königsdisziplin an der Scheibe."), `meisterstuecke` (feature, "Meisterstücke", "Gönner aus der Stadt geben besondere Einzelstücke in Auftrag.").

- [ ] **Step 1: Write the failing tests**

```ts
// test/shared/tiers.test.ts
it('upgradeTier buys the Manufaktur: pays, unlocks, gets the stoneware starter glaze', () => {
  const s = plainGame(); s.ruf = 300; s.taler = 50000;
  const r = ok(s, { type: 'upgradeTier' });
  expect(r.state.tier).toBe('manufaktur');
  expect(r.state.taler).toBe(0);
  expect(r.state.unlocks).toEqual(expect.arrayContaining(['steinzeug', 'teekanne', 'meisterstuecke']));
  expect(r.state.milestonesDone).toContain('tierManufaktur');
  expect(r.state.glazes.some((g) => g.id === 'klar-steinzeug' && g.body === 'steinzeug')).toBe(true);
});
it('upgradeTier needs Ruf and Taler, and stops at the top tier', () => {
  const s = plainGame(); s.ruf = 299; s.taler = 1e6;
  expect(rejected(s, { type: 'upgradeTier' })).toMatch(/300 Ruf/);
  s.ruf = 300; s.taler = 49999;
  expect(rejected(s, { type: 'upgradeTier' })).toMatch(/Taler/);
  expect(rejected(manufakturGame(), { type: 'upgradeTier' })).toMatch(/Höher hinaus/); // Part 1 only
});
it('station levels 6–7 need the Manufaktur', () => {
  const s = plainGame(); s.unlocks.push('upgrades'); s.ruf = 1000; s.taler = 1e6;
  const wheel = s.stations.find((x) => x.kind === 'wheel')!; wheel.level = 5;
  expect(rejected(s, { type: 'upgradeStation', stationId: wheel.id })).toMatch(/Manufaktur/);
  s.tier = 'manufaktur';
  let t = ok(s, { type: 'upgradeStation', stationId: wheel.id }).state;
  expect(t.stations.find((x) => x.id === wheel.id)!.level).toBe(6);
  expect(t.taler).toBe(1e6 - 9000);
  t = ok(t, { type: 'upgradeStation', stationId: wheel.id }).state;
  expect(rejected(t, { type: 'upgradeStation', stationId: wheel.id })).toMatch(/höchster Stufe/);
});
// test/shared/content.test.ts (add)
it('station level arrays line up', () => {
  for (const d of Object.values(STATIONS)) {
    const L = d.piecesPerMinute.length;
    expect(d.upgradeCost.length, d.kind).toBe(L - 1);
    expect(d.rufRequired.length, d.kind).toBe(L - 1);
    if (d.capacity) expect(d.capacity.length, d.kind).toBe(L);
  }
});
```
(`ok`/`rejected` are local helpers like `actions.test.ts`'s `ok`/`expectRejected`; `rejected` asserts unchanged state and returns the error.)

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run test/shared/tiers.test.ts test/shared/content.test.ts`
Expected: FAIL ("Unbekannte Aktion").

- [ ] **Step 3: Implement**

`upgradeTier` in `run()`: `nextTier(s) ?? fail('Höher hinaus geht es nicht')`; Ruf check `Für die ${next.name} brauchst du ${next.ruf} Ruf`; Taler check `Für die ${next.name} brauchst du ${next.price} Taler`; pay, set `s.tier`, push each `BODIES` starter glaze whose `tier === next.id` if absent. Unlocks come from the tier milestone via `checkMilestones` (it runs right after `run()`), so the celebration card appears through the existing `milestonesAcked` flow. `upgradeStation`: top = `def.piecesPerMinute.length` → `'Schon auf höchster Stufe'`; `st.level >= getTier(s.tier).maxStationLevel` → `` `Stufe ${st.level + 1} gibt es erst ab der ${tierForLevel(st.level + 1)!.name}` ``. Add `'upgradeTier'` to `ACTION_TYPES`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "feat(shared): buy the Manufaktur tier; station levels 6–7"
```

---

### Task 3: Work bays

**Files:**
- Modify: `src/shared/content/stations.ts`, `src/shared/production.ts`, `src/shared/advance.ts`, `src/shared/actions.ts` (`handTouch`)
- Test: `test/shared/bays.test.ts`

**Interfaces:**
- Produces: `StationDef.bays?: number[]` (by level); `baysOf(st: Station): number` in `production.ts` (`def.bays?.[level-1] ?? 1`); `kilnLoad(s: GameState, b: Batch): number` in `production.ts` (returns `b.count` now; Task 9 adds the masterwork case); `standingPipeline(s: GameState): number` in `advance.ts` = `STANDING_PIPELINE × max baysOf(wheel stations)`.
- Bays: prepBench, wheel, dryingRack, glazeTable `[1, 1, 1, 1, 1, 2, 2]`. Kiln/shelf/stall have none.

- [ ] **Step 1: Write the failing tests**

```ts
// test/shared/bays.test.ts
function twoWaitingAtWheel(level: number) {
  const s = manufakturGame();
  const wheel = s.stations.find((x) => x.kind === 'wheel')!; wheel.level = level;
  for (const id of ['b1', 'b2']) s.batches.push({ id, designId: s.designs[0].id, count: 6, stage: 'form', stationId: null, startedAt: null, durationMs: 0, quality: 60 });
  return { s, wheel };
}
it('level 5 runs one batch at a time, level 6 runs two side by side at full speed', () => {
  const a = twoWaitingAtWheel(5); startWork(a.s, T0);
  expect(a.s.batches.filter((b) => b.stationId === a.wheel.id).length).toBe(1);
  const b = twoWaitingAtWheel(6); startWork(b.s, T0);
  const running = b.s.batches.filter((x) => x.stationId === b.wheel.id);
  expect(running.length).toBe(2);
  expect(running[0].durationMs).toBe(running[1].durationMs);
  expect(running[0].durationMs).toBe(stageDurationMs(b.s, running[0], b.wheel, T0)); // no bay penalty
});
it('the standing pipeline grows with wheel bays', () => {
  const s = manufakturGame();
  expect(standingPipeline(s)).toBe(4);
  s.stations.find((x) => x.kind === 'wheel')!.level = 6;
  expect(standingPipeline(s)).toBe(8);
});
it('handTouch speeds up every running batch on the station', () => {
  const { s, wheel } = twoWaitingAtWheel(6); startWork(s, T0);
  const before = s.batches.map((b) => b.durationMs);
  const r = applyAction(s, { type: 'handTouch', stationId: wheel.id }, T0 + 1);
  expect(r.ok && r.state.batches.every((b, i) => b.durationMs < before[i])).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/bays.test.ts`
Expected: FAIL (`standingPipeline` not exported / second batch not started).

- [ ] **Step 3: Implement**

`canStartOn`: non-kiln → `here.length < baysOf(st)`; kiln → sum of `kilnLoad(s, x)` over running plus `kilnLoad(s, b)` ≤ `kilnCapacity(s)`. `startWork` uses `standingPipeline(s)` instead of `STANDING_PIPELINE`. `handTouch` applies the speed-up to every running, non-blocked batch on the station (error unchanged when none).

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): work bays at station level 6"
```

---

### Task 4: Clay bodies in production, value and designs

**Files:**
- Modify: `src/shared/production.ts`, `src/shared/market.ts`, `src/shared/design.ts`, `src/shared/actions.ts` (`saveDesign`), `src/shared/village/apply.ts` (`importStack`)
- Test: `test/shared/bodies.test.ts`

**Interfaces:**
- Consumes: `getBody`, `bodyOf`, `bodyAvailable`, `getTier` (Task 1).
- Produces (behaviour other tasks rely on):
  - `designDifficultyOf(d)` = old clamped value `+ getBody(bodyOf(d)).difficultyAdd`.
  - `batchMaterials(state, design, count)`: the clay key is `getBody(bodyOf(design)).material` (amount unchanged).
  - `stageDurationMs`: `glazeFire` stage × `glazeFireMul` of the batch's design body.
  - `pieceValue`: × `valueMul` of the design's body (foreign designs via `bodyOf`).
  - `validateDesign`: missing `body` is treated as `'irdenware'`; unknown → `'Unbekannte Tonsorte'`; unavailable → `` `${body.name} gibt es erst ab der ${getTier(body.tier).name}` ``; glaze body mismatch → `` `Diese Glasur ist für ${glazeBody.name} – für ${body.name} brauchst du eine eigene` ``.
  - `saveDesign`'s `clean` copies `body: bodyOf(d)`.
  - `importStack` sets `body ??= 'irdenware'` on the incoming design copy (offers stored in the village DO before the update have none).

- [ ] **Step 1: Write the failing tests**

```ts
// test/shared/bodies.test.ts
const stoneCup = (s: GameState): Design => ({ ...s.designs[0], id: 'sc', body: 'steinzeug', glazeId: 'klar-steinzeug' });
it('stoneware is worth 1.8×, needs Steinzeugton, is a bit harder and fires longer', () => {
  const s = manufakturGame(); s.designs.push(stoneCup(s));
  expect(pieceValue(s, { designId: 'sc', quality: 2, effect: null })).toBeCloseTo(6 * 1.8);
  expect(batchMaterials(s, stoneCup(s), 6)).toEqual({ steinzeugton: 6, glasurbasis: 2 });
  expect(designDifficultyOf(stoneCup(s)) - designDifficultyOf(s.designs[0])).toBeCloseTo(0.2);
  const kiln = s.stations.find((x) => x.kind === 'kiln')!;
  const fire = (designId: string) => stageDurationMs(s, { id: 'x', designId, count: 6, stage: 'glazeFire', stationId: null, startedAt: null, durationMs: 0, quality: 60 }, kiln, T0);
  expect(fire('sc') / fire(s.designs[0].id)).toBeCloseTo(1.5, 2);
});
it('[Review Focus 1] earthenware numbers are unchanged', () => {
  const s = plainGame();
  expect(pieceValue(s, { designId: s.designs[0].id, quality: 2, effect: null })).toBe(6);
  expect(batchMaterials(s, s.designs[0], 6)).toEqual({ ton: 6, glasurbasis: 2 });
});
it('[Review Focus 1] a migrated v2 save with a running batch and a body-less foreign design keeps working', () => {
  const v2: any = JSON.parse(JSON.stringify(advance(withStanding(), T0 + 100_000))); // batch in flight
  v2.schemaVersion = 2; delete v2.tier; for (const d of v2.designs) delete d.body; for (const g of v2.glazes) delete g.body;
  v2.designs.push({ ...v2.designs[0], id: 'f:x', origin: { playerName: 'Ben', makerMark: v2.makerMark, glazeColor: '#3f6fb5' } });
  v2.goods.push({ designId: 'f:x', quality: 2, effect: null, count: 3 });
  const s = advance(migrateState(v2), T0 + 6 * H);
  expect(s.stats.made).toBeGreaterThan(v2.stats.made);
  expect(pieceValue(s, { designId: 'f:x', quality: 2, effect: null })).toBe(6);
});
it('designs: glaze must match the body, stoneware needs the Manufaktur', () => {
  const w = plainGame(); w.unlocks.push('studio');
  expect(validateDesign({ ...w.designs[0], body: 'steinzeug' }, w)).toMatch(/Manufaktur/);
  const m = manufakturGame();
  expect(validateDesign({ ...m.designs[0], body: 'steinzeug' }, m)).toMatch(/Glasur ist für Irdenware/);
  expect(validateDesign(stoneCup(m), m)).toBeNull();
  const r = applyAction(m, { type: 'saveDesign', design: { ...stoneCup(m), id: 'neu' } }, T0 + 1);
  expect(r.ok && r.state.designs.at(-1)!.body).toBe('steinzeug');
});
it('importStack fills a missing body', () => { /* call importStack with a design lacking body; expect imported design body 'irdenware' */ });
```
(`withStanding` and `H` as in `advance.test.ts`; move `withStanding` into `helpers.ts` and import it in both files.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/bodies.test.ts`
Expected: FAIL (value 6 for stoneware, `ton` key).

- [ ] **Step 3: Implement** the behaviour listed under Interfaces. For the glaze-fire multiplier, look up the batch design once in `stageDurationMs` (it already does for form/glaze).

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): clay body affects value, difficulty, materials and glaze firing"
```

---

### Task 5: Body-aware glaze discovery and stoneware effects

**Files:**
- Modify: `src/shared/content/effects.ts`, `src/shared/discovery.ts`, `src/shared/actions.ts` (`experiment`)
- Test: `test/shared/discovery.test.ts`

**Interfaces:**
- Produces: `RecipeInput = Pick<GlazeRecipe, 'base'|'colorant'|'colorantPct'|'firing'> & { body?: BodyId }` (missing body = irdenware everywhere); `EffectDef.body?: BodyId`; `EXPERIMENT_COST.body = 1` (units of the body's material, only for non-earthenware); `glazeColor(r)` uses `getBody(r.body).clearColor` for a transparent glaze without colourant (keeps `#e3bf98` for hot transparent earthenware); `matchEffect(r)` ignores effects whose `body` differs and ranks by `conditions.length + (e.body ? 1 : 0)`; `hintFor` skips effects whose body is not `bodyAvailable` and, when only the body is off, names it as the missing condition `auf ${body.name}`; `sameRecipe` compares bodies; `runExperiment` stores `body` on the glaze.
- `validateRecipe` adds (in this order, after base/colourant/pct/firing shape checks): unknown body → `'Unbekannte Tonsorte'`; not available → `` `${body.name} gibt es erst ab der ${tierName}` ``; `mustFireHot && temp !== 'hoch'` → `` `${body.name} muss heiß gebrannt werden` ``.
- `colorantColor` gains `salz` → `mix('#d8c3a0', '#a88760', t)` (Task 10 adds `mangan`).

Stoneware effects (all `body: 'steinzeug'`; the body condition comes from the field, not from `conditions`):

| id | name | valueMul | conditions (label) | description | hint |
|---|---|---|---|---|---|
| oelfleck | Ölfleck | 2.6 | viel Eisenoxid (7–10 %); hohe Temperatur; langsames Abkühlen | Silbrige Tropfen schwimmen auf tiefschwarzer Glasur. | Greta raunt: „Auf Steinzeug, mit ganz viel Eisen, heiß – und dann lass dem Ofen Zeit beim Abkühlen.“ |
| hasenfell | Hasenfell | 2.4 | mittel Eisenoxid (4–6 %); Reduktion | Feine braune Streifen, wie das Fell eines Hasen. | Greta lächelt: „Nicht zu wenig Eisen, nicht zu viel – und nimm dem Feuer die Luft. Auf Steinzeug, versteht sich.“ |
| shino | Shino | 2.3 | matte Basis; kein Farbkörper; langsames Abkühlen | Milchig-weiß mit warmen, rötlichen Flecken. | Greta erzählt: „Matt und ganz ohne Farbe, langsam abkühlen – das Steinzeug malt dann selbst.“ |
| salzglasur | Salzglasur | 2.5 | Salz als Zusatz; transparente Basis | Eine Haut wie Orangenschale, glänzend und genarbt. | Greta flüstert: „Wirf Salz ins heiße Feuer, wenn Steinzeug drin steht – klare Glasur drunter.“ |

- [ ] **Step 1: Write the failing tests**

```ts
const stone = (r: Partial<R>): R => ({ base: 'transparent', colorant: null, colorantPct: 0, firing: f('hoch', 'oxidierend', 'langsam'), body: 'steinzeug', ...r });
it('stoneware effects only appear on stoneware and beat the generic ones', () => {
  expect(matchEffect(stone({ colorant: 'eisenoxid', colorantPct: 8 }))).toBe('oelfleck');
  expect(matchEffect({ ...stone({ colorant: 'eisenoxid', colorantPct: 8 }), body: 'irdenware' })).toBe('tenmoku');
  expect(matchEffect(stone({ base: 'matt' }))).toBe('shino');
  expect(matchEffect(stone({ base: 'matt', colorant: 'kobalt', colorantPct: 2 }))).toBe('kristall');
  expect(matchEffect(stone({ colorant: 'salz', colorantPct: 3 }))).toBe('salzglasur');
  expect(matchEffect(stone({ colorant: 'eisenoxid', colorantPct: 5, firing: f('hoch', 'reduzierend', 'langsam') }))).toBe('hasenfell');
  expect(matchEffect(BODIES.steinzeug.starterGlaze!)).toBeNull();
  expect(glazeColor(BODIES.steinzeug.starterGlaze!)).toBe(BODIES.steinzeug.starterGlaze!.color);
});
it('a Werkstatt never gets hints for stoneware effects', () => {
  const s = game();
  for (const r of [stone({ colorant: 'eisenoxid', colorantPct: 8, body: 'irdenware' }), stone({ base: 'matt', body: 'irdenware' })])
    expect(hintFor(r, s) ?? '').not.toMatch(/Steinzeug|Ölfleck|Shino/);
});
it('stoneware experiments: need the tier, must fire hot, cost 1 Steinzeugton, are separate glazes', () => {
  const w = game();
  expect(rej(w, stone({}))).toMatch(/Manufaktur/);
  const m = manufakturGame(); m.materials.glasurbasis = 20;
  expect(rej(m, stone({ firing: f('mittel', 'oxidierend', 'langsam') }))).toMatch(/heiß gebrannt/);
  const r = applyAction(m, { type: 'experiment', recipe: stone({ base: 'matt' }) }, T0 + 10);
  expect(r.ok && r.state.materials.steinzeugton).toBe(99);
  const r2 = r.ok && applyAction(r.state, { type: 'experiment', recipe: { ...stone({ base: 'matt' }), body: 'irdenware' } }, T0 + 20);
  expect(r2 && r2.ok && r2.state.glazes.filter((g) => g.base === 'matt' && g.colorant === null).map((g) => g.body).sort()).toEqual(['irdenware', 'steinzeug']);
});
```
(`rej(s, recipe)` returns the error of `applyAction(s, { type: 'experiment', recipe }, …)`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/discovery.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS (existing discovery tests unchanged: recipes without body are earthenware).

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): glazes per clay body; four stoneware effects"
```

---

### Task 6: Teekanne, Manufaktur customers, body orders

**Files:**
- Modify: `src/shared/content/{forms,customers}.ts`, `src/shared/orders.ts`, `src/shared/market.ts`, `src/shared/actions.ts` (`deliverOrder`)
- Test: `test/shared/orders.test.ts`, `test/shared/advance.test.ts` (stall reserve block)

**Interfaces:**
- Produces: `FormDef.tier?: Tier`, `FormDef.orderCountMul?: number`; `FORMS.teekanne = { name 'Teekanne', plural 'Teekannen', clayPerPiece 3, baseValue 40, baseDifficulty 1.8, unlock 'teekanne', tier 'manufaktur', flat false, handleAllowed true, profileDefaults { height 0.5, belly 0.75, neck 0.35, foot 0.45, rim 0.3 } }`; `CustomerDef` gains `body?: BodyId` and `unlock?: string`; `BODY_ORDER_PREMIUM = 1.25`, `TIER_ORDER_SHARE: Record<Tier, number> = { werkstatt: 0, manufaktur: 0.5, hofmanufaktur: 0.6 }` in `orders.ts`.
- Manufaktur customers (body steinzeug): Meisterin Ume (Teemeisterin) `[{ form: 'teekanne' }, { form: 'becher', colorFamily: 'braun', simple: true }]`; Herr Bierhals (Braumeister) `[{ form: 'krug', tall: true }, { form: 'krug', colorFamily: 'braun' }]`; Frau Dr. Salbei (Kräuterhändlerin) `[{ form: 'vase', colorFamily: 'gruen' }, { form: 'schale', pattern: 'leaves' }]`.

`generateOrder` algorithm (keeps the Werkstatt rng sequence byte-identical):
1. `plain` = customers with no `body` whose `unlock` is absent or unlocked. `fancy` = customers with a `body` that `bodyAvailable`, each listed twice when `getBody(body).tier === state.tier`.
2. Only if `fancy.length > 0`: draw `nextRandom`; use `fancy` when `< TIER_ORDER_SHARE[state.tier]`, else `plain`. Otherwise pick from `plain` with no extra draw.
3. As today for taste/form/count/quality; `count = Math.round(count × (form.orderCountMul ?? 1))`.
4. `order.body = cust.body` (omitted when none); `rewardTaler = round(baseValue × count × 1.3 × valueMul × (body ? BODY_ORDER_PREMIUM : 1))`; `rewardRuf += body ? getBody(body).rufBonus : 0`.

`deliverOrder`: `order.body && bodyOf(design) !== order.body` → `` `Das muss ${getBody(order.body).name} sein` ``. Orders without body accept any body.

Stall reserve: `sellableByForm` becomes `sellableByGroup` keyed `${form}|${bodyOf(design)}`; each order reserves from `${o.form}|${o.body ?? 'irdenware'}`.

- [ ] **Step 1: Write the failing tests**

```ts
it('a Werkstatt never gets body orders; a Manufaktur gets them about half the time', () => {
  let w = plainGame();
  for (let i = 0; i < 50; i++) { const [o, r] = generateOrder(w); expect(o.body).toBeUndefined(); w = { ...w, rng: r }; }
  let m = manufakturGame(); let n = 0;
  for (let i = 0; i < 200; i++) { const [o, r] = generateOrder(m); if (o.body === 'steinzeug') { n++; expect(o.rewardTaler).toBeGreaterThanOrEqual(Math.round(getForm(o.form).baseValue * o.count * 1.3 * 1.8 * 1.25) - 1); } m = { ...m, rng: r }; }
  expect(n / 200).toBeGreaterThan(0.3); expect(n / 200).toBeLessThan(0.7);
});
it('a stoneware order takes only stoneware', () => { /* order {form:'becher', body:'steinzeug'}; earthenware becher stack → rejected /Steinzeug sein/; stoneware stack → ok */ });
// advance.test.ts, market stall reserve
it('[Review Focus 4] the stall keeps stoneware for a stoneware order but may sell earthenware of the same form', () => {
  const s = manufakturGame();
  s.designs.push({ ...s.designs[0], id: 'sc', body: 'steinzeug', glazeId: 'klar-steinzeug' });
  s.stallDesignIds = [s.designs[0].id, 'sc'];
  s.orders = [{ ...s.orders[0], form: 'becher', body: 'steinzeug', count: 5 }];
  s.goods = [{ designId: 'sc', quality: 2, effect: null, count: 5 }, { designId: s.designs[0].id, quality: 2, effect: null, count: 5 }];
  s.standing = null;
  const after = advance(s, T0 + 30 * MIN);
  expect(after.goods.find((g) => g.designId === 'sc')?.count).toBe(5);
  expect(after.goods.find((g) => g.designId === s.designs[0].id)?.count ?? 0).toBeLessThan(5);
});
```
(Set `s.lastOrderAt = T0 + 10 * H` in the reserve test so no new order arrives during the 30 minutes.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/orders.test.ts test/shared/advance.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS (existing order tests unchanged).

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): Teekanne, Manufaktur customers and stoneware orders"
```

---

### Task 7: Bulk buying and keep-in-stock

**Files:**
- Create: `src/shared/shop.ts`
- Modify: `src/shared/actions.ts`, `src/shared/advance.ts`
- Test: `test/shared/shop.test.ts`

**Interfaces:**
- Produces: `buyError(s: GameState, material: string): string | null` (unknown → `'Unbekanntes Material'`; locked or not unlocked → `` `${m.name} gibt es hier noch nicht zu kaufen` ``), `restock(s: GameState): void` (for each `keepStock` entry: missing = target − floor(have); skip if `buyError` or ≤ 0; buy `min(missing, floor(taler / shopPrice))` at `shopPrice`, rounding Taler like `buyMaterial`); `MAX_BUY = 100_000`; action `{ type: 'setKeepStock'; material: string; target: number }` (target integer 0..`MAX_BUY`, 0 deletes the entry, error `'Ungültige Menge'`).
- `buyMaterial` uses `buyError` and accepts amounts 1..`MAX_BUY`. `startWork` calls `restock(s)` first, before the standing order.

- [ ] **Step 1: Write the failing tests**

```ts
it('buyMaterial takes up to 100 000 at once', () => { /* taler 1e6: amount 100000 ok; 100001 rejected */ });
it('setKeepStock validates and 0 switches it off', () => { /* kaolin rejected /noch nicht zu kaufen/; -1 rejected; ton 100 → keepStock {ton:100}; ton 0 → {} */ });
it('keeps the stock topped up during catch-up', () => {
  const s = plainGame(); s.keepStock = { ton: 100 }; s.taler = 1000;
  const a = advance(s, T0 + MIN);
  expect(a.materials.ton).toBe(100); expect(a.taler).toBe(930);
});
it('[Review Focus 3] with little Taler it buys what it can and never goes negative', () => {
  const s = withStanding(); s.keepStock = { ton: 500 }; s.taler = 10;
  const a = advance(s, T0 + MIN);
  expect(a.materials.ton).toBeLessThanOrEqual(40); expect(a.taler).toBeGreaterThanOrEqual(0);
  const b = advance(s, T0 + 24 * H);
  expect(b.taler).toBeGreaterThanOrEqual(0); expect(b.stats.made).toBeGreaterThan(0);
});
it('one long catch-up equals many short ones with keep-in-stock', () => {
  const base = withStanding(); base.stallDesignIds = [base.designs[0].id]; base.keepStock = { ton: 60, glasurbasis: 20 };
  const once = advance(base, T0 + 6 * H);
  let stepped = base; for (let t = T0 + 10 * MIN; t <= T0 + 6 * H; t += 10 * MIN) stepped = advance(stepped, t);
  expect(Math.abs(once.taler - stepped.taler) / stepped.taler).toBeLessThan(0.01);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/shop.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces; add `'setKeepStock'` to `ACTION_TYPES`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): bulk buying and keep-in-stock with offline restock"
```

---

### Task 8: Collection book logic

**Files:**
- Create: `src/shared/collection.ts`, `src/shared/content/colors.ts`
- Modify: `src/shared/advance.ts` (`finishBatch`), `src/shared/state.ts` (migration seeding), `src/shared/content/{index,unlocks}.ts`
- Test: `test/shared/collection.test.ts`

**Interfaces:**
- Produces:
  - `EXTRA_COLORS: { id: string; name: string; color: string; unlock: string }[]` (unlock = `farbe-${id}`), in prize order: gold `#d4a531` Gold, mint `#8fd1b5` Minze, pflaume `#7a3b6e` Pflaume, ocker `#c98a2e` Ocker, tuerkis `#2e9c9a` Türkis, rost `#a4512a` Rost, flieder `#b39ddb` Flieder, tanne `#2f5d3a` Tanne, koralle `#f08a6c` Koralle, nacht `#1f2b4d` Nachtblau, sand `#e2cfa4` Sand, kirsche `#b0243a` Kirsche. `UNLOCKS` gets one `kind: 'color'` entry per colour ("Neue Farbe: Gold", "Für Muster und Meisterzeichen.").
  - `interface CollectionEntry { key: string; form: string; body: BodyId; effect: string | null; tier: Tier }`
  - `collectionKey(form: string, body: BodyId, effect: string | null): string` → `` `${form}|${body}|${effect ?? '-'}` ``
  - `collectionEntries(): CollectionEntry[]`: every `FORMS` × `BODIES` × (`null` + every effect with no body or that body); `tier` = highest of body tier, `form.tier ?? 'werkstatt'`. Built once and cached, with a `Set` of keys.
  - `recordCollection(s: GameState, form: string, body: BodyId, effect: string | null): void`: ignores keys not in the book and keys already present; otherwise pushes the key, then for its row group `r|${body}|${form}` and column group `c|${body}|${effect ?? '-'}`: if newly complete and not in `s.collectionRewards`, push the group id and grant a prize.
  - Prize: the first `EXTRA_COLORS` unlock not in `s.unlocks` is pushed; when all are owned, `s.taler += COLLECTION_FALLBACK_TALER` (200).
  - `collectionPercent(s: GameState, body?: BodyId): number`: `Math.floor(100 × found / total)`; without body it is O(1) (`s.collection.length / entries.length`), since only valid keys are ever stored.
  - `seedCollection(s: GameState): void`: records each goods stack of an own (non-`origin`) design.
- `finishBatch` calls `recordCollection(s, design.form, bodyOf(design), effect)` after `addGoods`. The v2→v3 migration block calls `seedCollection(s)` after creating the empty fields (prizes are granted inside).

- [ ] **Step 1: Write the failing tests**

```ts
it('the book has form × body × (no effect + matching effects) entries', () => {
  const e = collectionEntries();
  expect(e.length).toBe(6 * (6 + 10)); // Part 1: 6 forms; earthenware 5+1, stoneware 9+1
  expect(new Set(e.map((x) => x.key)).size).toBe(e.length);
  expect(e.some((x) => x.key === 'becher|irdenware|oelfleck')).toBe(false);
  expect(e.find((x) => x.key === 'teekanne|irdenware|-')!.tier).toBe('manufaktur');
});
it('a finished batch records its combination once', () => { /* advance withStanding 1 h → collection equals ['becher|irdenware|-'] */ });
it('completing a row grants the next colour, then Taler when all colours are owned', () => {
  const s = manufakturGame();
  const row = collectionEntries().filter((x) => x.body === 'irdenware' && x.form === 'becher');
  for (const x of row.slice(1)) recordCollection(s, x.form, x.body, x.effect);
  expect(s.unlocks).not.toContain('farbe-gold');
  recordCollection(s, row[0].form, row[0].body, row[0].effect);
  expect(s.unlocks).toContain('farbe-gold');
  expect(s.collectionRewards).toContain('r|irdenware|becher');
  s.unlocks.push(...EXTRA_COLORS.map((c) => c.unlock));
  const taler = s.taler;
  for (const x of collectionEntries().filter((x) => x.body === 'irdenware' && x.form === 'schale')) recordCollection(s, x.form, x.body, x.effect);
  expect(s.taler).toBe(taler + COLLECTION_FALLBACK_TALER);
});
it('migration seeds the book from own goods only', () => { /* v2 with goods: own becher craquele + foreign 'f:x' vase → collection ['becher|irdenware|craquele'] */ });
it('percent', () => { /* 0 for a new game; after recording 24 entries → floor(2400/96) = 25 */ });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/collection.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): collection book with row and column prizes"
```

---

### Task 9: Masterworks logic

**Files:**
- Create: `src/shared/masterwork.ts`, `src/shared/content/patrons.ts`
- Modify: `src/shared/production.ts`, `src/shared/advance.ts`, `src/shared/actions.ts`, `src/shared/design.ts`, `src/client/panels/logic.ts`, `src/shared/content/index.ts`
- Test: `test/shared/masterwork.test.ts`

**Interfaces:**
- Consumes: `recordCollection` (Task 8), `kilnLoad`/`baysOf` (Task 3), `batchQuality`, `batchMaterials`, `qualityTier`, `glazeForDesign`, `colorFamily`, `isTall`, `shopPrice`.
- Produces (in `production.ts`, to avoid an import cycle): `MASTERWORK_STAGE_MS: Record<Stage, number>` = prepare 1 h, form 4 h, dry 3 h, bisque 3 h, glaze 3 h, glazeFire 4 h (18 h total); `MASTERWORK_KILN_SHARE = 0.5`; `kilnLoad` returns `Math.ceil(kilnCapacity(s) × MASTERWORK_KILN_SHARE)` for a masterwork batch; `stageDurationMs` returns `MASTERWORK_STAGE_MS[batch.stage]` for a masterwork batch (no workers, boosts, touch or body factors).
- Produces (`masterwork.ts`):
  - constants `MASTERWORK_QUALITY_BONUS = 10`, `MASTERWORK_MATERIAL_PIECES = 12`, `COMMISSION_SWAP_COST = 250`, `PRESTIGE_MUL: Record<Prestige, number> = { bronze: 0.5, silver: 0.8, gold: 1 }`, `PRESTIGE_RANK = { bronze: 1, silver: 2, gold: 3 }`, `PRESTIGE_NAME = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold' }`
  - `masterworkInProgress(s): Batch | undefined`
  - `generateCommission(s: GameState): Commission` (advances `s.rng`, uses `newId(s, 'c')`)
  - `criteriaMet(s: GameState, design: Design, c: Commission): boolean[]`
  - `prestigeFor(met: number, total: number, quality: 1 | 2 | 3): Prestige`: gold = all met and quality 3; silver = (all met and quality 2) or (one missed and quality 3); else bronze
  - `predictMasterwork(s: GameState, design: Design): { met: boolean[]; quality: 1 | 2 | 3; prestige: Prestige }` (quality = `qualityTier(min(100, batchQuality(s, design, prepBench/wheel/glazeTable workers) + MASTERWORK_QUALITY_BONUS))`, the same formula `startMasterwork` uses)
  - `startMasterwork(s: GameState, design: Design): string | null` (German error or null)
  - `finishMasterwork(s: GameState, b: Batch, t: number): void`
  - `describeCriterion(c: MasterworkCriterion): string`: body `aus Steinzeug`, form `als Teekanne` (`als ${FormDef.name}`), tall `schön hoch`/`eher niedrig`, effect `mit ${EFFECTS[e].name}`, pattern `PATTERN_TEXT[p]` (`mit Blättern`), color `in ${COLOR_FAMILY_NAMES[c]}`
  - in `design.ts` (moved here so shared code can name and gate patterns): `PATTERN_TEXT: Record<PatternKind, string>` (none `ohne Muster`, stripes `mit Streifen`, dots `mit Punkten`, waves `mit Wellen`, leaves `mit Blättern`; the client's `PATTERN_TEXT` in `panels/logic.ts` imports it) and `PATTERN_UNLOCK: Record<PatternKind, string | null>` (none/stripes/dots null, waves/leaves `patterns2`), used by `validateDesign` (`'Unbekanntes Muster'` / `'Dieses Muster ist noch nicht freigeschaltet'`) and by commission generation ("unlocked patterns")
- `PATRONS: { name: string; job: string }[]`: Gräfin Mohnblüte (Kunstsammlerin), Abt Benedikt (Abt vom Kloster am See), Kommerzienrat Silbermann (Kaufmann aus der Stadt), Madame Fleurie (Hutmacherin), Professor Ammonit (Museumsdirektor), Hofrat von Kiesel (Hofrat).
- Actions: `{ type: 'startMasterwork'; designId: string }`, `{ type: 'swapCommission' }`, `{ type: 'ackMasterwork'; id: string }`.

Commission generation (always reachable, deterministic; `done = s.masterworks.length`):
1. body = pick among `bodyAvailable` bodies; glaze = pick among own glazes of that body (prefer glazes with an effect when `done >= 3` and any exist); form = pick among forms in `s.unlocks`; pattern = pick among unlocked patterns except `none`; tall = random bool if the form is not flat.
2. Candidates: body (only if not irdenware), form, tall (non-flat only), effect (if glaze has one), pattern, color (`colorFamily(glaze.color)`).
3. `n = min(candidates, done >= 2 ? 4 : 3)`; if `done >= 3` and effect is a candidate it is included first; fill by random picks without replacement; sort into the order body, form, tall, effect, pattern, color.
4. `costTaler = 3000 + 1500 × done`; `rewardTaler = round((10000 + 4000 × done) × max valueMul over body criteria (1 if none))`; `rewardRuf = 30 + 5 × done`; patron from `PATRONS` with `patronSeed` from `nextRandom`.

`startMasterwork` checks in order: tier → `'Meisterstücke gibt es ab der Manufaktur'`; no commission → `'Gerade wartet kein Gönner'`; in progress → `'Es entsteht schon ein Meisterstück'`; `design.origin` → `'Geschenkte Stücke kannst du nicht nachmachen'`; total = `costTaler` + shop price of missing `batchMaterials(s, design, MASTERWORK_MATERIAL_PIECES)` > Taler → `` `Dafür brauchst du ${Math.ceil(total)} Taler` ``. Then pays, consumes materials, pushes `{ count: 1, stage: 'prepare', masterwork: true, quality, … }`.

`finishMasterwork`: computes `met`, `prestige`, pays `round(reward × PRESTIGE_MUL)` Taler and Ruf, pushes a `MasterworkRecord` (design deep-copied, `glazeColor` from `glazeForDesign`, effect = the glaze's effect: a masterwork always shows its glaze's effect, no chance roll), `recordCollection`, `stats.made += 1` (and `away.made`), removes the batch, `s.commission = generateCommission(s)`.

Advance/actions integration: `finishBatch(s, b, t)` sends masterwork batches to `finishMasterwork` and never blocks them on the shelf; `startWork` tries the waiting masterwork batch first within its stage; the standing pipeline count and its "something waits in prepare" check ignore masterwork batches; `handTouch` skips masterwork batches and, if only a masterwork runs there, fails with `'Ein Meisterstück lässt sich nicht hetzen'`; `upgradeTier` sets `s.commission = generateCommission(s)` when reaching the Manufaktur with none; `swapCommission`: tier check, in-progress → `'Während ein Meisterstück entsteht, bleibt der Auftrag'`, Taler check, pay 250, new commission; `ackMasterwork` sets `acked = true` on a matching record.

- [ ] **Step 1: Write the failing tests**

```ts
it('prestige rules', () => {
  expect(prestigeFor(4, 4, 3)).toBe('gold'); expect(prestigeFor(4, 4, 2)).toBe('silver');
  expect(prestigeFor(3, 4, 3)).toBe('silver'); expect(prestigeFor(3, 4, 2)).toBe('bronze'); expect(prestigeFor(0, 3, 1)).toBe('bronze');
});
it('every generated commission is reachable with the player\'s own glazes and forms', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const s = manufakturGame(seed); s.glazes.push(/* an oelfleck stoneware glaze and a kobalt earthenware glaze */);
    const c = generateCommission(s);
    expect(c.criteria.length).toBe(3);
    expect(criteriaMet(s, solve(s, c), c).every(Boolean)).toBe(true); // solve: test helper building a design from the criteria
  }
});
it('starting costs the fee and materials; one at a time; not in a Werkstatt', () => { /* fee 3000 + steinzeugton; batch count 1 masterwork; second start → /schon ein Meisterstück/; plainGame → /ab der Manufaktur/ */ });
it('takes exactly 18 h however many workers and boosts', () => {
  const s = manufakturGame(); s.commission = generateCommission(s); s.boostUntil = T0 + 10 * H; s.standing = null; s.batches = [];
  const r = applyAction(s, { type: 'startMasterwork', designId: s.designs[0].id }, T0);
  const a = advance(r.ok ? r.state : s, T0 + 18 * H - 1);
  expect(a.masterworks.length).toBe(0);
  expect(advance(a, T0 + 18 * H).masterworks.length).toBe(1);
});
it('finishing pays by prestige, records it, fills the book and brings a harder commission after two', () => { /* run 3 masterworks; masterworks[i].prestige set; taler/ruf increased; collection has its key; third commission has 4 criteria */ });
const waiting = (id: string, stage: Stage, count: number, masterwork?: boolean): Batch => ({ id, designId: 'd1', count, stage, stationId: null, startedAt: null, durationMs: 0, quality: 70, ...(masterwork ? { masterwork } : {}) });
it('[Review Focus 5] one-bay wheel: the masterwork goes first, the normal batch waits 4 h, then runs', () => {
  const s = manufakturGame(); s.commission = generateCommission(s); s.standing = null;
  s.batches = [waiting('n', 'form', 6), waiting('m', 'form', 1, true)];
  startWork(s, T0);
  expect(s.batches.find((b) => b.id === 'm')!.startedAt).toBe(T0);
  expect(s.batches.find((b) => b.id === 'n')!.startedAt).toBeNull();
  const a = advance(s, T0 + 4 * H + 1);
  expect(a.batches.find((b) => b.id === 'n')!.startedAt).toBe(T0 + 4 * H);
});
it('[Review Focus 5] kiln: a full-capacity batch waits for the masterwork\'s share, nothing spins', () => {
  const s = manufakturGame(); s.commission = generateCommission(s); s.standing = null;
  s.batches = [waiting('n', 'bisque', kilnCapacity(s)), waiting('m', 'bisque', 1, true)];
  const t = performance.now();
  const a = advance(s, T0 + 30 * H);
  expect(performance.now() - t).toBeLessThan(200);
  expect(a.masterworks.length).toBe(1);
  expect(a.goods.reduce((n, g) => n + g.count, 0)).toBe(kilnCapacity(s));
});
it('swap costs 250 and is locked while a masterwork is in progress; handTouch cannot rush it', () => {
  /* manufakturGame + commission c0: swapCommission → taler −250, commission.id !== c0.id;
     after startMasterwork: swapCommission rejected /bleibt der Auftrag/;
     with only the masterwork running at the prep bench: handTouch rejected /nicht hetzen/; its durationMs unchanged */
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/masterwork.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** per Interfaces; add the three actions to `ACTION_TYPES`; update the Task 2 test that `upgradeTier` now also creates a commission (`expect(r.state.commission).not.toBeNull()`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): masterwork commissions, production and prestige"
```

---

### Task 10: Milestone ladder (Manufaktur range) and cosmetics data

**Files:**
- Create: `src/shared/content/frames.ts`
- Modify: `src/shared/progression.ts`, `src/shared/types.ts` (`PatternKind`), `src/shared/design.ts`, `src/shared/discovery.ts` (`mangan` colour), `src/shared/actions.ts` (`setMakerMark`), `src/shared/village/{decor,apply}.ts`, `src/shared/content/{materials,customers,unlocks}.ts`
- Test: `test/shared/progression.test.ts`, `test/shared/advance.test.ts`

**Interfaces:**
- Produces:
  - `PatternKind` adds `'ranken' | 'karo'`; `PATTERN_UNLOCK` (Task 9) adds ranken `muster-ranken`, karo `muster-karo`; `PATTERN_TEXT` adds `mit Ranken`, `mit Karomuster`.
  - `FRAMES: Record<string, { id: string; name: string; unlock: string }>`: punkte "Punktekranz", doppel "Doppelring", kranz "Lorbeerkranz", sonne "Sonnenstrahlen", gold "Goldring"; unlock = `rahmen-${id}`. `setMakerMark` keeps `frame` only when given: unknown → `'Unbekannter Rahmen'`, not unlocked → `'Diesen Rahmen hast du noch nicht'`.
  - `grantDecor(s: GameState, id: string): boolean` moved into `village/decor.ts` (the body of today's loop in `apply.ts` lines 76–79); `apply.ts` uses it.
  - `DECOR` adds `steinzeugtopf` (Steinzeug-Vorratstopf, floor), `glasurproben` (Glasurproben-Brett, wall), `papierlampions` (Papierlampions, ceiling), `meisterbrief` (Meisterbrief, wall).
  - `MATERIALS.mangan` (Mangan, colorant, price 10, colorFamily lila, unlock `mangan`, "Violettbraunes Pulver – je mehr, desto dunkler."); `colorantColor` `mangan` → `mix('#b48ab0', '#4a2a3a', t)`.
  - Customer Frau von Scherbenfeld (Sammlerin, `unlock: 'kunde-sammlerin'`, tastes `[{ form: 'vase', tall: true }, { colorFamily: 'lila' }]`).
  - `applyMilestones`: checks `milestonesDone.includes(m.id)` **before** `m.done(s)` (same in `needsMilestoneWork`); grants `m.decor` via `grantDecor` with event `{ kind: 'unlock', id, text: `Neue Dekoration: ${DECOR[id].name}` }`.
- Ladder (append after `ruf72`, keep `tierManufaktur` from Task 2 in this list position; change `ruf60` text to `'Die Werkstatt wächst (60 Ruf)!'` so "Manufaktur" means the tier only):

| id | text | reward | done |
|---|---|---|---|
| ruf250 | Weit über das Tal hinaus bekannt (250 Ruf)! | rahmen-punkte | ruf ≥ 250 |
| tierManufaktur | (Task 2) | (Task 2) | (Task 2) |
| firstStoneware | Dein erstes Stück aus Steinzeug! | decor steinzeugtopf | a collection key with `|steinzeug|` |
| ruf400 | Händler fragen nach deinem Namen (400 Ruf)! | muster-ranken | ruf ≥ 400 |
| firstBodyEffect | Ein Effekt, den nur ein besonderer Ton kann! | mangan | a discovered effect with `body` |
| ruf600 | Sammler reisen extra an (600 Ruf)! | kunde-sammlerin | ruf ≥ 600 |
| allStonewareEffects | Alle Steinzeug-Effekte entdeckt! | decor glasurproben | every `body: 'steinzeug'` effect discovered |
| sammlung25 / 50 / 75 / 100 | Ein Viertel der Sammlung! / Die halbe Sammlung! / Drei Viertel der Sammlung! / Die Sammlung ist vollständig! | rahmen-doppel / decor papierlampions / muster-karo / rahmen-kranz | `collectionPercent(s) ≥` 25/50/75/100 |
| firstMasterwork | Dein erstes Meisterstück! | decor meisterbrief | masterworks.length ≥ 1 |
| masterworkSilver | Ein Meisterstück in Silber! | rahmen-sonne | a record with rank ≥ silver |
| masterworkGold | Ein Meisterstück in Gold! | rahmen-gold | a gold record |

New `UNLOCKS`: `rahmen-*` (kind frame, "Rahmen: <name>", "Ein neuer Rahmen für dein Meisterzeichen."), `muster-ranken` / `muster-karo` (kind pattern, "Ranken" / "Karo"), `mangan` (feature, "Mangan", "Ein neuer Farbkörper: violett bis tiefbraun."), `kunde-sammlerin` (customer, "Frau von Scherbenfeld", "Eine Sammlerin aus der Stadt schaut jetzt öfter vorbei.").

- [ ] **Step 1: Write the failing tests**

```ts
it('every milestone unlock and decor exists', () => {
  for (const m of MILESTONES) { for (const u of m.unlocks) expect(UNLOCKS[u], u).toBeDefined(); for (const d of m.decor ?? []) expect(DECOR[d], d).toBeDefined(); }
  for (const f of Object.values(FRAMES)) expect(UNLOCKS[f.unlock]).toBeDefined();
});
it('the ladder fires on its conditions', () => { /* plainGame with ruf 600 → ruf250, ruf400, ruf600 done and 'kunde-sammlerin' unlocked; manufakturGame with 24 collection keys → sammlung25 done, 'rahmen-doppel' unlocked; manufakturGame with one masterwork record → 'meisterbrief' in s.decor and s.decorPlaced */ });
it('frames and new patterns are gated', () => { /* setMakerMark frame 'kranz' rejected until rahmen-kranz; validateDesign pattern 'karo' rejected until muster-karo */ });
// advance.test.ts
it('[Review Focus 2] 30 days at the Manufaktur stay fast and solvent', () => {
  const s = manufakturGame(); /* wheel/prep/glaze level 7, two standing-capable designs, keepStock {steinzeugton: 200, glasurbasis: 100}, stall on, a masterwork started */
  // same chunked loop and bounds as the existing 30-day test (median < 20 ms, total < 1 s), plus:
  // expect(final.taler).toBeGreaterThanOrEqual(0); expect(final.masterworks.length).toBeGreaterThanOrEqual(1)
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/progression.test.ts test/shared/advance.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests** (re-run the timing tests alone if they fail under load)

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): long milestone ladder with frames, patterns, decor and mangan"
```

---

### Task 11: Art — body looks, Teekanne, new patterns, frames, silhouettes (review gate 1)

**Files:**
- Create: `src/client/art/markFrame.tsx`
- Modify: `src/client/art/Pot.tsx`, `src/client/art/potShape.ts`, `src/client/art/village/House.tsx`, `src/client/dev/PotsPage.tsx`
- Test: `test/client/pot.test.ts`

**Interfaces:**
- Produces: `Pot` props: `design` pick adds optional `body?: BodyId`; new prop `silhouette?: boolean` (ink outline only, dashed, no glaze/effect/pattern/mark); root `<svg>` gets `data-body={body}` and `data-silhouette` when set. `PotShape` adds `lid?: { cx: number; cy: number; rx: number; ry: number; knob: number }`; for `teekanne` `spout` is an S-curve leaving the lower belly on the left and the handle sits right. `MarkFrame({ frame, x, y, r, color })` in `markFrame.tsx` draws the ring for every `FRAMES` id with `data-frame={id}`; `Pot`'s `Mark` and `House.tsx` use it.
- Looks (spec §5.10): earthenware foot = today's `var(--clayRaw)`; stoneware foot `#9c8f80` plus seeded dark speckles (≈10 dots, opacity ≈ 0.35) over the glaze; patterns `ranken` (wavy stem with curls and small leaves) and `karo` (two rows of small alternating squares) in both the upright `Pattern` and the `Plate` renderer.

- [ ] **Step 1: Write the failing tests**

```ts
it('Teekanne has a spout and a lid; every form × body × pattern renders without NaN', () => {
  expect(potShape('teekanne', FORMS.teekanne.profileDefaults, 'plain', 'round').spout).toBeTruthy();
  expect(potShape('teekanne', FORMS.teekanne.profileDefaults, 'plain', 'round').lid).toBeTruthy();
  for (const form of Object.keys(FORMS)) for (const body of Object.keys(BODIES)) for (const pattern of Object.keys(PATTERN_UNLOCK)) {
    const design = { form, profile: FORMS[form].profileDefaults, handle: 'none' as const, rim: 'plain' as const, pattern: pattern as PatternKind, patternColor: '#ffffff', body: body as BodyId };
    const html = render(<Pot design={design} glazeColor="#3f6fb5" />);
    expect(html).not.toMatch(/NaN|undefined/); expect(html).toContain(`data-body="${body}"`);
  }
});
it('silhouettes have no glaze and frames render', () => {
  expect(render(<Pot design={cup} glazeColor="#3f6fb5" silhouette />)).toMatch(/data-silhouette[\s\S]*stroke-dasharray/);
  expect(render(<Pot design={cup} glazeColor="#3f6fb5" mark={{ shape: 'heart', letter: 'A', color: '#b44c36', frame: 'kranz' }} size={120} />)).toContain('data-frame="kranz"');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/pot.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces. Extend `PotsPage` with sections "Tonsorten" (each form in each body), "Neue Muster", "Rahmen" (every frame on a 150 px pot), "Silhouetten".

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Screenshot and self-review**

Start `npm run dev` in the background, then run: `npm run shot -- "http://localhost:5173/#pots" endgame-pots --full`
Expected: `docs/screens/endgame-pots-desktop.png` and `-phone.png`, `horizontalOverflow=0px`, no ERRORS. Open both PNGs and `docs/art/art-style-reference.png`; check: wobbly ink outlines on every new piece, warm washes, stoneware reads as speckled grey-brown at 76 px, Teekanne spout/lid/handle do not collide at extreme profiles, patterns stay inside the body, frames don't cover the letter, silhouettes read as "unknown" not "broken". Fix and re-shoot until every point holds.

- [ ] **Step 6: Commit**

```bash
git add -A src test docs/screens/endgame-pots-*.png && git commit -m "feat(art): stoneware look, Teekanne, Ranken/Karo patterns, mark frames, silhouettes"
```

---

### Task 12: Client — body picker, studio, experiments, recipe book, orders

**Files:**
- Create: `src/client/panels/BodyPicker.tsx`
- Modify: `src/client/panels/{DesignStudio,studioLogic,ExperimentPanel,RecipeBook,OrdersPanel,logic}.tsx/ts`
- Test: `test/client/studio.test.tsx`, `test/client/panels.test.tsx`

**Interfaces:**
- Produces: `BodyPicker({ s, value, onPick }: { s: GameState; value: BodyId; onPick: (b: BodyId) => void })`: one illustrated lump per `BODIES` entry (inline SVG, colours from the Task 11 look), locked ones disabled with caption `` `ab ${getTier(body.tier).name}` ``; `switchBody(s: GameState, draft: Design, body: BodyId): Design` (keeps the glaze if it matches, else the first own glaze of that body); `patternColorsFor(s: GameState): string[]` (`PATTERN_COLORS` + unlocked `EXTRA_COLORS`); `ExperimentForm` gains `body: BodyId` and `experimentActionFor` passes it in `recipe.body`; `describeTaste(taste, form, count, body?)` inserts `` ` aus ${getBody(body).name}` `` after the count phrase; `bestStackForOrder`/`bestDesignForOrder` skip mismatching bodies when `o.body` is set.
- UI: Designer shows "Tonsorte" (`BodyPicker`) above "Glasur", glaze swatches filtered to the draft's body; pattern chooser lists Ranken/Karo with their unlocks; mark tab gets a frame chooser (ohne + unlocked `FRAMES`) and colour swatches from `patternColorsFor`. ExperimentPanel shows `BodyPicker`; a `mustFireHot` body forces `temp: 'hoch'` and locks the other temperatures; cost text and `canAfford` include 1 unit of the body material. RecipeBook groups glazes under a heading per body and lists only undiscovered effects whose body is available, plus `` `+${n} weitere Effekte ab der ${tier}` `` for the rest (no names). Order card shows a badge with the body name when `o.body`.

- [ ] **Step 1: Write the failing tests**

```ts
it('switching the body picks a matching glaze', () => {
  const s = manufakturGame();
  expect(switchBody(s, s.designs[0], 'steinzeug')).toMatchObject({ body: 'steinzeug', glazeId: 'klar-steinzeug' });
});
it('experiment action carries the body', () => {
  expect(experimentActionFor({ base: 'matt', colorant: null, colorantPct: 0, temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam', body: 'steinzeug' }).recipe.body).toBe('steinzeug');
});
it('extra colours appear once unlocked', () => { const s = plainGame(); s.unlocks.push('farbe-gold'); expect(patternColorsFor(s)).toContain('#d4a531'); });
it('orders: body in the wish, and only stoneware is offered for delivery', () => {
  expect(describeTaste({}, 'teekanne', 4, 'steinzeug')).toBe('Ich hätte gern 4 Teekannen aus Steinzeug!');
  /* stoneware becher order + only earthenware becher goods → bestStackForOrder null; Liefern disabled; card shows "Steinzeug" */
});
```
(Update the existing `experimentActionFor` `toEqual` test to include `body: 'irdenware'`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(client): clay body picker in studio and experiments; body orders"
```

---

### Task 13: Client — shop bulk buying, station bays and levels, tier section

**Files:**
- Create: `src/client/panels/TierSection.tsx`
- Modify: `src/client/panels/{ShopPanel,StationPanel}.tsx`
- Test: `test/client/shop.test.tsx`, `test/client/workshop.test.tsx`

**Interfaces:**
- Produces: `fillUpAmount(have: number, target = 1000): number` (`max(0, target − floor(have))`) exported from `ShopPanel.tsx`; `KEEP_STOCK_STEPS = [0, 100, 500, 1000, 5000]`; `TierSection({ s })`: current tier, next tier's price, Ruf and what it brings (unlock titles from the tier milestone), button `` `Zur ${next.name} aufsteigen · ${price} Taler` `` disabled (with "ab N Ruf" hint) until affordable; dispatches `upgradeTier`.
- UI: shop rows get +10/+100/+1000, "auf 1000 auffüllen" (hidden when 0) and a "Vorrat halten" chip row (aus/100/500/1000/5000) dispatching `setKeepStock`; replace the closing tip with one about "Vorrat halten". StationPanel: running list labels "Platz 1/2" when `baysOf(st) > 1`, shows "Arbeitsplätze: N"; `UpgradeBox` uses the top level and the tier rule (`` `Stufe ${n} gibt es ab der ${tier}` `` when gated, "ganz ausgebaut" at the top); `upgradeEffect` mentions "+1 Arbeitsplatz" when the next level adds a bay and computes the speed gain from the ppm ratio; Production section adds an "Extra-Charge" design picker (`queueBatch` for any own design). WorkshopPanel renders `TierSection` at the top.

- [ ] **Step 1: Write the failing tests**

```ts
it('shop: big buttons, fill-up and keep-in-stock', () => {
  const s = plainGame(); s.taler = 5000;
  const html = render(<ShopPanel s={s} />);
  expect(html).toContain('+1000'); expect(html).toContain('auf 1000 auffüllen'); expect(html).toContain('Vorrat halten');
  expect(fillUpAmount(30.5)).toBe(970); expect(fillUpAmount(1200)).toBe(0);
});
it('tier section: gated by Ruf, then enabled', () => {
  const s = plainGame(); s.taler = 60000; s.ruf = 100;
  expect(render(<TierSection s={s} />)).toMatch(/<button[^>]*disabled[^>]*>[^<]*Zur Manufaktur aufsteigen/);
  s.ruf = 300;
  expect(render(<TierSection s={s} />)).not.toMatch(/<button[^>]*disabled[^>]*>[^<]*Zur Manufaktur/);
});
it('level 5 in a Werkstatt says the Manufaktur is needed', () => { /* StationPanel for wheel level 5 contains 'ab der Manufaktur' */ });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/shop.test.tsx test/client/workshop.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(client): bulk shop, keep-in-stock, bays and tier upgrade UI"
```

---

### Task 14: Art — tier sign, bays in the scene, kiln 6–7, plinths, new decor, tier celebration (review gate 2)

**Files:**
- Create: `src/client/art/workshop/TierSign.tsx`, `src/client/art/workshop/Plinth.tsx`, `src/client/dev/mockEndgame.ts`
- Modify: `src/client/art/workshop/{Room,WorkshopScene,Decor}.tsx`, `src/client/art/workshop/stations/Stations.tsx`, `src/client/panels/Celebration.tsx`, `src/client/dev/{ScenePage,GamePage}.tsx`, `src/client/screens/GameScreen.tsx`
- Test: `test/client/scene.test.tsx`

**Interfaces:**
- Produces: `TierSign({ tier, x, y })` with `data-tier-sign={tier}`; `Room` gets a `tier: Tier` prop and draws the sign on the back wall (free of window, pinboard, clock and decor spots); `Plinths({ records, onClick? })` draws the newest 3 masterworks, each on its own stone plinth with a ribbon in the prestige colour and a plaque with the design name (max 12 chars), `data-plinth` per plinth, placed on a free floor/back-wall spot of room 1; `WorkshopScene` gets `onMasterwork?: () => void` (plinth click; read-only scenes ignore it); `ScenePot` passes `design.body`; Wheel, PrepBench, GlazeTable draw every running batch side by side, each with its own `Progress`; masterwork batches get a small gold star ribbon `data-masterwork`; Kiln draws copper bands from level 6 and a brass door frame plus a second gauge at 7 (data attribute `data-kiln-level`); `DECOR` draw functions for steinzeugtopf, glasurproben, papierlampions, meisterbrief at fixed spots that don't overlap existing ones; `Celebration` shows `TierSign` and kicker "Neuer Rang!" for milestones with `tier`, and lists `m.decor` as "Neue Dekoration: …".
- `mockEndgame(now: number, tier: Tier = 'manufaktur'): GameState` in `src/client/dev/mockEndgame.ts`: built on `mockWorkshop`, tier set, ruf 420, taler 80000, prep/wheel/glaze/dry level 6, kiln 7, stoneware starter glaze + an `oelfleck` stoneware glaze, a stoneware Teekanne and vase design, two batches running on the wheel, a masterwork running at the glaze table, 3 finished masterwork records (bronze, silver, gold), a commission, ~20 collection keys, the four new decor items owned and placed, `keepStock { ton: 500 }`. `ScenePage` uses it when the hash contains `endgame`; `GamePage` too (`#game&endgame&panel=…`).

- [ ] **Step 1: Write the failing tests**

```ts
it('endgame scene: sign, two pots on the wheel, plinths, masterwork marker, decor', () => {
  const s = mockEndgame(T0);
  const html = render(<WorkshopScene state={advance(s, T0)} now={T0} onStation={() => {}} onWorker={() => {}} />);
  expect(html).toContain('data-tier-sign="manufaktur"');
  const wheel = html.split('data-station="wheel"')[1].split('data-station=')[0];
  expect((wheel.match(/class="progress"/g) ?? []).length).toBe(2);
  expect((html.match(/data-plinth/g) ?? []).length).toBe(3);
  expect(html).toContain('data-masterwork');
  for (const d of ['steinzeugtopf', 'glasurproben', 'papierlampions', 'meisterbrief']) expect(html).toContain(`data-decor="${d}"`);
  expect(html).not.toMatch(/NaN|undefined/);
});
it('a Werkstatt shows the Werkstatt sign and no plinths', () => { /* newGame → data-tier-sign="werkstatt", no data-plinth */ });
```
(`decorPlaced` is capped at 4 by `MAX_DECOR_PLACED`; mockEndgame places exactly these four.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/scene.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces. `GameScreen` passes `onMasterwork={() => open('masterwork')}` (the panel id is added in Task 16; until then route it to `'workshop'`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Screenshot and self-review**

Run: `npm run shot -- "http://localhost:5173/#scene&endgame" endgame-scene` and `npm run shot -- "http://localhost:5173/#game&endgame" endgame-game`
Then, to see the tier card, temporarily drop `tierManufaktur` from `milestonesAcked` in `mockEndgame` behind a hash flag `celebrate` and run `npm run shot -- "http://localhost:5173/#game&endgame&celebrate" endgame-tier-card`.
Expected: PNGs with `horizontalOverflow=0px`, no ERRORS. Check against the reference: sign legible and charming, not covering window/pinboard/string lights; two pots on the wheel read as two bays; kiln 6/7 looks upgraded but still the same kiln; plinths cute, not crowding stations or workers; decor at sensible spots; celebration card on phone fits without scrolling sideways. Fix and re-shoot until it holds.

- [ ] **Step 6: Commit**

```bash
git add -A src test docs/screens/endgame-scene-*.png docs/screens/endgame-game-*.png docs/screens/endgame-tier-card-*.png && git commit -m "feat(art): tier sign, work bays in the scene, kiln levels, masterwork plinths, new decor"
```

---

### Task 15: Collection book panel (review gate 3)

**Files:**
- Create: `src/client/panels/CollectionBook.tsx`, `src/client/panels/collectionLogic.ts`
- Modify: `src/client/panels/{RecipeBook,PanelHost}.tsx`
- Test: `test/client/collection.test.tsx`

**Interfaces:**
- Consumes: `collectionEntries`, `collectionPercent`, `EXTRA_COLORS`, `Pot` `silhouette`.
- Produces: `interface CollectionCell { key: string; found: boolean; title: string; look: { design: Pick<Design, 'form'|'profile'|'handle'|'rim'|'pattern'|'patternColor'|'body'>; glazeColor: string; effect: string | null } }`; `collectionGrid(s: GameState, body: BodyId): { forms: string[]; effects: (string | null)[]; effectLabels: string[]; cells: CollectionCell[][] }` (rows = forms, columns = `null` + effects of that page). Found look: the newest own design of that form+body (else the form's `profileDefaults`), coloured by an own glaze of that body with that effect (else the body's clear colour). Unfound: `title` is only `` `Braucht: ${tierName}` `` when the entry's tier is above the player's, else `'Noch nicht gefunden'`; column label is the effect name only if discovered, else `'?'`; `null` column label `'ohne'`. `CollectionBook({ s })`: tabs per body (locked bodies show "ab <tier>"), page percent, overall percent, grid with `Pot` (found) or silhouette + "?" (unfound), a ribbon on completed rows/columns (`collectionRewards`), and a line "Jede volle Reihe und Spalte schenkt dir eine neue Farbe."
- RecipeBook gets `Tabs` "Glasuren" / "Sammlung"; `PanelHost` opens the Sammlung tab for `arg === 'sammlung'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('found cells draw the piece, unfound ones only say which tier', () => {
  const s = plainGame(); s.collection = ['becher|irdenware|-'];
  const g = collectionGrid(s, 'irdenware');
  expect(g.cells[0][0]).toMatchObject({ found: true });
  expect(g.effectLabels).toContain('?'); // undiscovered effect names stay hidden
  const tea = g.cells[g.forms.indexOf('teekanne')][0];
  expect(tea).toMatchObject({ found: false, title: 'Braucht: Manufaktur' });
  const html = render(<CollectionBook s={s} />);
  expect(html).toContain('data-silhouette'); expect(html).not.toContain('Ölfleck');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/collection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces (grid scrolls horizontally inside the page on phones; the page itself must not overflow).

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Screenshot and self-review**

Run: `npm run shot -- "http://localhost:5173/#game&endgame&panel=recipes&arg=sammlung" endgame-collection`
Expected: `horizontalOverflow=0px`, no ERRORS. Check: reads like a notebook page in the paper-UI kit, found pots and "?" silhouettes clearly distinct, headers legible on phone, no spoilers visible. Fix and re-shoot until it holds.

- [ ] **Step 6: Commit**

```bash
git add -A src test docs/screens/endgame-collection-*.png && git commit -m "feat(client): collection book"
```

---

### Task 16: Masterwork panel, commission card, finish card, visits (review gate 4)

**Files:**
- Create: `src/client/panels/MasterworkPanel.tsx`
- Modify: `src/client/panels/{PanelHost,StationPanel}.tsx`, `src/client/screens/GameScreen.tsx`, `src/client/strings.ts`, `src/client/panels/village/VisitView.tsx`
- Test: `test/client/masterwork.test.tsx`

**Interfaces:**
- Consumes: `predictMasterwork`, `describeCriterion`, `masterworkInProgress`, `PRESTIGE_NAME`, `COMMISSION_SWAP_COST`, `MASTERWORK_STAGE_MS`.
- Produces: `PanelId` adds `'masterwork'` (locked behind unlock `meisterstuecke`, `lockHint`: "Ab der Manufaktur kommen Gönner zu dir."), `T.tabs.masterwork = 'Meisterstück'`; `MasterworkPanel({ s })`: commission card (patron `Character` from `patronSeed`, name, job, criteria list via `describeCriterion`, cost, reward), a design list where each own design shows ✓/✗ per criterion and the predicted prestige (`predictMasterwork`), "Meisterstück beginnen · N Taler" (disabled while one is in progress), "Anderen Auftrag (250 Taler)" link, an in-progress block (stage label + progress, "noch …"), and the finished records (pot, medal, patron); `MasterworkDone({ record, onClose })` card (prestige name, reward, pot) shown by `GameScreen` for the first record with `!acked` (after away summary and milestone cards) and dispatching `ackMasterwork`; WorkshopPanel gets a "Meisterstück" card opening the panel; `GameScreen` routes `onMasterwork` to `'masterwork'`; `VisitView` lists "Meisterstücke von <Name>" (pot + medal) when the friend has any.

- [ ] **Step 1: Write the failing tests**

```ts
it('shows criteria, per-design fit and blocks a second start', () => {
  const s = mockEndgame(T0); s.batches = s.batches.filter((b) => !b.masterwork);
  const html = render(<MasterworkPanel s={s} />);
  for (const c of s.commission!.criteria) expect(html).toContain(describeCriterion(c));
  expect(html).toContain('Meisterstück beginnen');
  const busy = mockEndgame(T0);
  expect(render(<MasterworkPanel s={busy} />)).toMatch(/<button[^>]*disabled[^>]*>[^<]*Meisterstück beginnen/);
});
it('finish card names the prestige', () => {
  const s = mockEndgame(T0);
  expect(render(<MasterworkDone record={s.masterworks.find((m) => m.prestige === 'gold')!} onClose={() => {}} />)).toContain('Gold');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/masterwork.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Screenshot and self-review**

Run: `npm run shot -- "http://localhost:5173/#game&endgame&panel=masterwork" endgame-masterwork`
Expected: `horizontalOverflow=0px`, no ERRORS. Check: the commission card feels like a letter from a patron (paper, tape), criteria readable at phone width, ✓/✗ fit understandable at a glance, medals distinct. Fix and re-shoot until it holds.

- [ ] **Step 6: Commit**

```bash
git add -A src test docs/screens/endgame-masterwork-*.png && git commit -m "feat(client): masterwork panel, commission card and finish card"
```

---

### Task 17: Part 1 ship — dev grant, e2e, pacing check, full verification

**Files:**
- Create: `test/shared/endgameBot.ts`, `test/shared/endgame-pacing.test.ts`
- Modify: `src/worker/dev.ts`, `src/worker/index.ts`, `test/worker/dev.test.ts`, `test/e2e/smoke.mjs`, `README.md`

**Interfaces:**
- Produces: `POST /api/dev/grant { taler?: number; ruf?: number }` (only with `DEV_FAST === '1'`, else 404 like warp; each value a finite number 0..10 000 000, else 400 `'taler/ruf 0…10000000'`; adds to the stored state the way `handleWarp` edits it). `endgameBot(state: GameState, days: number): { state: GameState; tierDay: Record<string, number> }`: three check-ins per day (08:00, 13:00, 20:00 game time): deliver every deliverable order (best stack), sell all when the shelf is ≥ 90 % full, set the standing order to the own design with the highest `pieceValue` at quality 2, buy the next tier when affordable (record the day), upgrade the cheapest affordable station.

- [ ] **Step 1: Write the failing tests**

```ts
// test/worker/dev.test.ts
it('grant is not available unless DEV_FAST=1', async () => { const f = await found(); expect((await call('POST', '/api/dev/grant', { taler: 1 }, f.cookie!)).status).toBe(404); });
// test/shared/endgame-pacing.test.ts
it('a mid-game player (all level 5, ~220 Ruf) reaches the Manufaktur in a few days', { timeout: 120_000 }, () => {
  const s = plainGame(); /* all unlocks up to ruf72, every station level 5, ruf 220, taler 5000, 4 workers, vase/krug/schale designs incl. an effect glaze */
  const r = endgameBot(s, 10);
  expect(r.tierDay.manufaktur).toBeGreaterThanOrEqual(1);
  expect(r.tierDay.manufaktur).toBeLessThanOrEqual(6);
});
```
If the pacing test lands outside 1–6 days, tune `TIERS.manufaktur.price`/`ruf` (spec §7) and the station 6–7 costs, not the test.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/endgame-pacing.test.ts && npm run test:worker`
Expected: FAIL (bot/endpoint missing).

- [ ] **Step 3: Implement** the endpoint (route `POST /api/dev/grant` next to warp), the bot, and extend `smoke.mjs` after the order delivery: grant `{ taler: 60000, ruf: 320 }` → `upgradeTier` (expect `tier === 'manufaktur'`, `commission` not null, a `klar-steinzeug` glaze) → `setKeepStock { material: 'steinzeugton', target: 100 }` → warp 1 min → expect `materials.steinzeugton >= 100` → `saveDesign` a stoneware Becher → `startMasterwork` with it → warp 24 h → expect `masterworks.length === 1` → screenshot `docs/screens/smoke-endgame.png`. Add `/api/dev/grant` to the README's dev section.

- [ ] **Step 4: Full verification**

Run: `npx vitest run && npm run test:worker && npm run check`
Expected: all PASS (re-run the known-flaky 30-day test alone if it trips).
Run (dev server with `DEV_FAST=1`): `node test/e2e/smoke.mjs http://localhost:5173`
Expected: ends with `SMOKE OK`. Also run `node test/e2e/village-smoke.mjs http://localhost:5173` → passes (gifted goods with bodies travel).

- [ ] **Step 5: Commit**

```bash
git add -A src test README.md docs/screens/smoke-endgame.png && git commit -m "test: endgame e2e, dev grant endpoint and Manufaktur pacing check"
```

**Part 1 is shippable here.**

---

# Part 2 — Hofmanufaktur & Porzellan

### Task 18: Hofmanufaktur tier, porcelain body, kaolin, level 8 and the third bay

**Files:**
- Modify: `src/shared/content/{tiers,bodies,materials,stations,unlocks}.ts`, `src/shared/production.ts` (`batchQuality`), `src/shared/progression.ts`, `test/shared/content.test.ts`
- Test: `test/shared/tiers.test.ts`, `test/shared/bodies.test.ts`, `test/shared/bays.test.ts`

**Interfaces:**
- Produces: `TIERS` appends `{ id: 'hofmanufaktur', name: 'Hofmanufaktur', price: 500000, ruf: 1000, maxStationLevel: 8 }`; `BODIES.porzellan = { name 'Porzellan', material 'kaolin', tier 'hofmanufaktur', valueMul 3.2, difficultyAdd 0.5, glazeFireMul 2, mustFireHot true, rufBonus 4, clearColor '#f3f1ec', skillMul 1.5, starterGlaze { id 'klar-porzellan', name 'Klare Porzellanglasur', transparent, no colourant, hoch/oxidierend/langsam, color '#f3f1ec', body 'porzellan' } }`; `BodyDef.skillMul?: number` (default 1): in `batchQuality` every worker contribution (trait `qualityAdd` and the xp term) is multiplied by it; `MATERIALS.kaolin` loses `locked`, gains `unlock: 'porzellan'` and description "Weiße Porzellanerde aus dem Gebirge – endlich lieferbar!"; station arrays grow to 8: ppm factor 6.6, `upgradeCost` 7→8 prepBench 120000, wheel 128000, dryingRack 104000, kiln 144000, glazeTable 124000, shelf 96000, marketStall 120000; `rufRequired` 1000; capacity kiln 150, shelf 1000, stall 12; bays level 8 = 3. Milestone `{ id: 'tierHofmanufaktur', tier: 'hofmanufaktur', text: 'Ernannt zur Hofmanufaktur!', unlocks: ['porzellan', 'figur', 'fliese'], done: tierAtLeast hof }`; unlocks `porzellan` (feature, "Porzellan", "Kaolin ist endlich zu haben: weiß, fein und kostbar."), `figur` (form, "Figuren", "Kleine Tiere aus Porzellan – Katze, Eule oder Igel."), `fliese` (form, "Fliesen", "Flache Kacheln, billig pro Stück, aber in großen Mengen gefragt.").

- [ ] **Step 1: Write the failing tests**

```ts
it('Hofmanufaktur: 500 000 Taler and 1000 Ruf, porcelain glaze, kaolin buyable', () => { /* manufakturGame ruf 1000 taler 500000 → upgradeTier ok; glazes has klar-porzellan; buyMaterial kaolin 10 ok; at ruf 999 rejected /1000 Ruf/ */ });
it('level 8 needs the Hofmanufaktur and gives a third bay', () => { /* manufaktur wheel 7 → reject /Hofmanufaktur/; hof → level 8; baysOf → 3; standingPipeline → 12 */ });
it('porcelain is worth 3.2×, fires twice as long, and skilled workers count 1.5×', () => {
  /* pieceValue ×3.2; glazeFire ratio 2; (q(with perfektionist) − q(without)) for porcelain === 1.5 × same delta for earthenware */
});
```
Update Task 2's "stops at the top tier" assertion to use a Hofmanufaktur state, the `level 7 → höchster Stufe` assertion to expect `/Hofmanufaktur/`, and the content test `kaolin is declared but locked` to `kaolin unlocks with porcelain` (`MATERIALS.kaolin.unlock === 'porzellan'`).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): Hofmanufaktur tier, porcelain, kaolin, station level 8 with a third bay"
```

---

### Task 19: Porcelain effects

**Files:**
- Modify: `src/shared/content/effects.ts`
- Test: `test/shared/discovery.test.ts`, `test/shared/collection.test.ts`

**Interfaces:**
- Produces (all `body: 'porzellan'`):

| id | name | valueMul | conditions | description | hint |
|---|---|---|---|---|---|
| blancdechine | Blanc de Chine | 3.0 | deckende Basis; kein Farbkörper | Ein warmes, cremiges Weiß wie Elfenbein. | Greta schwärmt: „Deckend und ganz ohne Farbe, auf Porzellan – mehr braucht es nicht.“ |
| blauweiss | Blau-Weiß | 3.2 | transparente Basis; wenig Kobalt (1–2 %) | Feine kobaltblaue Malerei unter klarer Glasur. | Greta zeigt auf eine alte Tasse: „Klare Glasur und nur ein Hauch Kobalt – auf Porzellan.“ |
| ochsenblut | Ochsenblut | 3.6 | Kupferoxid (3–5 %); Reduktion; langsames Abkühlen | Ein tiefes, sattes Rot, das von innen zu glühen scheint. | Greta wird ernst: „Mehr Kupfer als fürs Kupferrot, wenig Luft und viel Geduld beim Abkühlen. Nur auf Porzellan.“ |
| eierschale | Eierschale | 3.0 | matte Basis; schnelles Abkühlen | So dünn und matt, dass das Licht hindurchschimmert. | Greta flüstert: „Matt, heiß und schnell abkühlen – das Porzellan wird fast durchsichtig.“ |

- [ ] **Step 1: Write the failing tests**

```ts
const porc = (r: Partial<R>): R => ({ base: 'transparent', colorant: null, colorantPct: 0, firing: f('hoch', 'oxidierend', 'langsam'), body: 'porzellan', ...r });
it('porcelain effects', () => {
  expect(matchEffect(porc({ base: 'opak' }))).toBe('blancdechine');
  expect(matchEffect(porc({ colorant: 'kobalt', colorantPct: 2 }))).toBe('blauweiss');
  expect(matchEffect(porc({ colorant: 'kupferoxid', colorantPct: 3, firing: f('hoch', 'reduzierend', 'langsam') }))).toBe('ochsenblut');
  expect(matchEffect({ ...porc({ colorant: 'kupferoxid', colorantPct: 3, firing: f('hoch', 'reduzierend', 'langsam') }), body: 'irdenware' })).toBe('kupferrot');
  expect(matchEffect(porc({ base: 'matt', firing: f('hoch', 'oxidierend', 'schnell') }))).toBe('eierschale');
  expect(matchEffect(BODIES.porzellan.starterGlaze!)).toBeNull();
  expect(glazeColor(BODIES.porzellan.starterGlaze!)).toBe(BODIES.porzellan.starterGlaze!.color);
});
// collection.test.ts: update the size assertion to 6 forms here, i.e. 6 * (6 + 10 + 10); Task 20 raises it to 8 forms
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/discovery.test.ts test/shared/collection.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the four entries.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): four porcelain effects"
```

---

### Task 20: Figur and Fliese forms, noble customers

**Files:**
- Modify: `src/shared/types.ts`, `src/shared/content/{forms,customers,unlocks}.ts`, `src/shared/design.ts`, `src/shared/actions.ts` (`saveDesign`)
- Test: `test/shared/design.test.ts`, `test/shared/orders.test.ts`, `test/shared/collection.test.ts`

**Interfaces:**
- Produces: `Design.variant?: string`; `FormDef.variants?: { id: string; name: string }[]`; `FORMS.figur = { name 'Figur', plural 'Figuren', clayPerPiece 1, baseValue 30, baseDifficulty 1.7, unlock 'figur', tier 'hofmanufaktur', flat false, handleAllowed false, variants [katze Katze, eule Eule, igel Igel], profileDefaults { height 0.5, belly 0.6, neck 0.5, foot 0.5, rim 0.5 } }`; `FORMS.fliese = { name 'Fliese', plural 'Fliesen', clayPerPiece 0.5, baseValue 4, baseDifficulty 0.8, unlock 'fliese', tier 'hofmanufaktur', flat true, handleAllowed false, orderCountMul 4, profileDefaults { height 0.05, belly 0.5, neck 0.5, foot 0.5, rim 0.5 } }`; `validateDesign`: form with variants needs a listed `variant` (`'Welches Tier soll es werden?'`); `saveDesign`'s `clean` keeps `variant` only for such forms. Noble customers (body porzellan): Hofkonditor Zuckerbäck (Hofkonditor) `[{ form: 'teller', colorFamily: 'weiss' }, { form: 'teller', pattern: 'waves' }]`; Herzogin Amalie von Taubenstein (Herzogin) `[{ form: 'figur' }, { form: 'vase', tall: true, colorFamily: 'blau' }]`; Hofbaumeister Kachelmann (Hofbaumeister) `[{ form: 'fliese', colorFamily: 'blau' }, { form: 'fliese', pattern: 'leaves' }]`. Also customer Hofgärtnerin Rosalind (Hofgärtnerin, `unlock: 'kunde-hofgaertnerin'`, `[{ form: 'vase', pattern: 'leaves' }, { form: 'schale', colorFamily: 'gruen' }]`) with unlock entry (customer, "Hofgärtnerin Rosalind", "Die Hofgärtnerin bestellt jetzt bei dir.") for Task 22.

- [ ] **Step 1: Write the failing tests**

```ts
it('figurines need an animal; tiles are flat and come in large orders', () => {
  /* hof state: figur without variant → /Welches Tier/; with 'eule' → null; saved figur keeps variant; becher with variant → saved without variant */
  /* generateOrder for fliese (taste form fliese) → count is 4× the cup range */
});
it('noble customers order porcelain at the Hofmanufaktur', () => { /* 300 orders at hof: some body 'porzellan', also some 'steinzeug' and some plain */ });
// collection.test.ts: 8 * (6 + 10 + 10) entries
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): Figur and Fliese forms, noble customers"
```

---

### Task 21: Art — porcelain look, figurines, tiles, kiln 8, Hofmanufaktur sign, crown, Schuppen, Part 2 decor (review gate)

**Files:**
- Create: `src/client/art/Figure.tsx`, `src/client/art/Tile.tsx`
- Modify: `src/client/art/{Pot,potShape,markFrame}.tsx/ts`, `src/client/art/workshop/{TierSign,Decor,Room}.tsx`, `src/client/art/workshop/stations/Stations.tsx`, `src/client/panels/{BodyPicker,DesignStudio,collectionLogic}.tsx/ts`, `src/shared/types.ts` (`'schuppen'`), `src/shared/design.ts` (`PATTERN_UNLOCK.schuppen = 'muster-schuppen'`), `src/shared/content/{frames,unlocks}.ts`, `src/shared/village/decor.ts`, `src/client/dev/{PotsPage,mockEndgame}.ts/tsx`
- Test: `test/client/pot.test.ts`, `test/client/scene.test.tsx`, `test/client/studio.test.tsx`

**Interfaces:**
- Produces: `Pot` dispatches `form === 'figur'` to `Figure` (animal from `design.variant`, default `katze`; body/profile scale the silhouette; glaze, effect, pattern band and mark as for pots; `data-variant`) and `form === 'fliese'` to `Tile` (flat square seen slightly from above like `Plate`, pattern on the face); both support `silhouette` and the body looks; `fit` viewBoxes for both. Porcelain look: foot `#fbf8f2`, a soft white halo behind the body (`data-glow`). Pattern `schuppen` (overlapping scales) in all four renderers. Frame `krone` (crown above the ring; unlock `rahmen-krone`). `TierSign` hofmanufaktur variant (crest with a small crown). Kiln level 8: gilded crest on the dome. Decor `porzellanvoegel` (window, Porzellanvögel) and `kronleuchter` (ceiling, Kronleuchter). Studio: a "Tier" chooser (variants) when the form has variants, default first variant on form switch. `mockEndgame(now, 'hofmanufaktur')` adds porcelain glazes, a porcelain Figur and Fliese design, kiln 8.

- [ ] **Step 1: Write the failing tests**

```ts
it('figurines and tiles render for every body, pattern and variant', () => { /* all FORMS.figur.variants × bodies × patterns: no NaN, data-variant present; fliese likewise; silhouette works */ });
it('porcelain glows; crown frame renders', () => { /* data-glow for body porzellan; data-frame="krone" */ });
it('Hofmanufaktur scene', () => { /* mockEndgame(T0,'hofmanufaktur'): data-tier-sign="hofmanufaktur", data-kiln-level="8" */ });
it('switching to the Figur form picks an animal', () => { /* Designer form switch helper sets variant 'katze' */ });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Screenshot and self-review**

Run: `npm run shot -- "http://localhost:5173/#pots" hof-pots --full`, `npm run shot -- "http://localhost:5173/#scene&endgame&hof" hof-scene` (make `ScenePage`/`GamePage` pass `'hofmanufaktur'` when the hash contains `hof`), `npm run shot -- "http://localhost:5173/#game&endgame&hof&panel=studio" hof-studio`.
Expected: `horizontalOverflow=0px`, no ERRORS. Check: cat/owl/hedgehog each instantly recognisable and cute at 76 px; tiles read as tiles, not plates; porcelain bright white with a gentle glow (not a blur blob); kiln 8 and the court sign feel grand but in style. Fix and re-shoot until it holds.

- [ ] **Step 6: Commit**

```bash
git add -A src test docs/screens/hof-*.png && git commit -m "feat(art): porcelain, figurines, tiles, court sign, kiln 8, crown frame, Schuppen"
```

---

### Task 22: Rest of the ladder, Part 2 ship

**Files:**
- Modify: `src/shared/progression.ts`, `test/shared/endgame-pacing.test.ts`, `test/e2e/smoke.mjs`
- Test: `test/shared/progression.test.ts`

**Interfaces:**
- Produces (append to `MILESTONES`, keep `tierHofmanufaktur` from Task 18 between ruf1000 and firstPorcelain):

| id | text | reward | done |
|---|---|---|---|
| ruf1000 | Am Hof spricht man von dir (1000 Ruf)! | muster-schuppen | ruf ≥ 1000 |
| firstPorcelain | Dein erstes Stück Porzellan! | decor porzellanvoegel | a collection key with `|porzellan|` |
| allPorcelainEffects | Alle Porzellan-Effekte entdeckt! | decor kronleuchter | every `body: 'porzellan'` effect discovered |
| ruf1500 | Eine Legende unter Töpfern (1500 Ruf)! | kunde-hofgaertnerin | ruf ≥ 1500 |
| ruf2500 | Dein Name steht in den Geschichtsbüchern (2500 Ruf)! | rahmen-krone | ruf ≥ 2500 |

- [ ] **Step 1: Write the failing tests**

```ts
it('the court ladder fires', () => { /* hof state with ruf 2500, a porcelain collection key, all porcelain effects → all five done, decor granted, rahmen-krone unlocked */ });
// endgame-pacing.test.ts
it('from the Manufaktur, the Hofmanufaktur takes a few weeks', { timeout: 300_000 }, () => {
  /* manufaktur state: stations level 7, ruf 320, taler 2000, stoneware vase with oelfleck glaze, earthenware designs */
  const r = endgameBot(s, 45);
  expect(r.tierDay.hofmanufaktur).toBeGreaterThanOrEqual(10);
  expect(r.tierDay.hofmanufaktur).toBeLessThanOrEqual(40);
});
```
If the Hofmanufaktur lands outside 10–40 days, tune `TIERS.hofmanufaktur.price`/`ruf` and the level-8 costs, not the test (spec §7); re-check that the Manufaktur pacing test still passes.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/progression.test.ts test/shared/endgame-pacing.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the milestones; extend `smoke.mjs` after the masterwork check: grant `{ taler: 600000, ruf: 1000 }` → `upgradeTier` → expect `tier === 'hofmanufaktur'` → `buyMaterial kaolin 10` → `saveDesign` a porcelain Figur (`variant: 'eule'`) with `klar-porzellan` → ok.

- [ ] **Step 4: Full verification**

Run: `npx vitest run && npm run test:worker && npm run check`
Expected: all PASS (known flake: re-run the 30-day test alone).
Run: `node test/e2e/smoke.mjs http://localhost:5173` and `node test/e2e/village-smoke.mjs http://localhost:5173`
Expected: both pass, `SMOKE OK`.

- [ ] **Step 5: Commit**

```bash
git add -A src test && git commit -m "feat(shared): court milestone ladder; Hofmanufaktur e2e and pacing"
```

**Part 2 is shippable here.**
