# Manufaktur — Plan 1: Foundation & Solo Manufaktur

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed, playable solo pottery Manufaktur in the chosen hand-drawn style. It covers:

- village founding and joining (accounts only)
- the full production chain with offline progress
- workers with traits and distinct characters
- design studio, orders, market and glaze discovery
- first-session onboarding

**Architecture:**

- **Shared simulation:** a pure, deterministic TypeScript module (`src/shared`). The Worker uses it authoritatively, and the client uses it for live prediction.
- **Persistence:** each player's state is one versioned JSON document in D1. The server catches the state up to now, applies an action and saves it, with optimistic concurrency.
- **Client:** Preact renders everything as SVG in the "B2 ink + colour wash" style. Pots and people are generated from data.

**Tech Stack:**

- TypeScript 5
- Cloudflare Workers with Static Assets, and D1
- Wrangler 4
- Vite 6 with `@cloudflare/vite-plugin`
- Preact 10 with `@preact/signals`
- Vitest 3, plus `@cloudflare/vitest-pool-workers` for Worker tests
- Playwright, used only for screenshot checks

**Spec:** `docs/superpowers/specs/2026-11-07-manufaktur-design.md`

Art reference: `docs/art/art-style-reference.html` (lower card, "B2"), `docs/art/art-style-reference.png`, `docs/art/gen_scene.py`.

**Plan series:**
- Plan 1 is this one.
- Plan 2 is the village: map, specialties, trading, gifts, visits, joint orders, buildings, and a village Durable Object.
- Plan 3 is the stoneware and porcelain branches plus release polish.

Plans 2 and 3 are written after this one ships. Workshop decor customisation (spec §1, §5.4 cosmetic rewards) is deferred to Plan 2, where its rewards come from. The interfaces below are designed so they extend without rework.

## Global Constraints

- **All player-visible text is German.** Texts live in content/data or UI string modules, never scattered as literals in logic.
- **Every game rule lives in `src/shared`**, with no DOM and no Worker APIs. The server is authoritative; the client only predicts.
- **The simulation is deterministic:** the same state, the same `now` and the same action always give the same result. Randomness comes only from the seeded RNG in `state.rng`, never from `Math.random()` or `Date.now()` inside `src/shared`.
- **No grind.** No action may give a reward for repeated clicking. Hand-crafted touches (§4.1 of the spec) are rate-limited by cooldowns in state.
- **Never punish absence:**
  - nothing decays
  - orders have no deadline unless they're flagged `bonusDeadline`
  - offline production runs for at least 24 h
  - workers never leave
- **Welcome-back:** an absence of 24 h or more gives ×2 production speed for 30 minutes after return, plus a "Während du weg warst…" summary.
- **Pacing:**
  - The first full cup batch (6 cups) moves from clay to sold in about 3 minutes, using level-1 stations and one worker.
  - In the first hour, a new unlock arrives every 2–6 minutes.
- **Art:** B2 tokens (Task 10), ink outlines with turbulence wobble, hatched shadows, and a handwritten font ("Patrick Hand" from Google Fonts). Every person is generated as a distinct character. There are no generic or faceless figures.
- **Screenshot review gates:** Tasks 11, 12 and 13 end with a screenshot that the owner must approve before the next art task starts. The fourth gate, the village map, is in Plan 2.
- **Layout:** the game must work from 375 px wide (phone) up to desktop, with no horizontal page scroll. The workshop scene pans inside its frame.
- **Accounts:** a player gives a display name (unique, case-insensitive, 2–20 characters) and a password (at least 6 characters). Passwords are hashed with PBKDF2-SHA256 at 100 000 iterations and a 16-byte salt. Sessions use an HttpOnly, Secure, SameSite=Lax cookie that lasts 90 days.

## Review Focus

These are the gaps most likely to cause trouble, each with the test that guards it:

1. **Very long absence (weeks).** The catch-up must be bounded and fast, and capacity must cap stock without losing anything already finished. Test: `advance` over 30 days must take under 100 ms, and goods must never exceed shelf capacity. Owner: Task 4.
2. **The clock going backwards or skewing** (`now < lastTick`, or a client clock that's off). Expected behaviour: no negative progress and no crash, with the server clock as truth. Test in Task 4. The client offset is handled in Task 14.
3. **Two tabs or devices acting at once.** A stale `version` must get a 409, and the client must refetch and retry, never overwriting. Test in Task 9.
4. **Invalid or stale actions** (not enough Taler, unknown ids, a worker already assigned, a malformed body). These must be rejected with a German message and no state change. Tests in Task 5 and Task 9.
5. **Phone width (375 px).** The workshop must pan, panels must open as bottom sheets, and nothing may overflow horizontally. This is checked with a screenshot at 375×812 in Task 13 and Task 15.

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, wrangler.jsonc, vitest.config.ts, vitest.workers.config.ts
index.html
migrations/0001_init.sql
scripts/screenshot.mjs                    Playwright: screenshot a URL at given sizes → docs/screens/
src/shared/
  rng.ts                                  seeded RNG (mulberry32), state stored as number
  types.ts                                all game-state types
  content/
    index.ts                              re-exports + lookup helpers (getForm, getStation…)
    materials.ts forms.ts glazes.ts effects.ts stations.ts traits.ts names.ts customers.ts unlocks.ts
  state.ts                                newGame(), migrateState(), SCHEMA_VERSION
  production.ts                           stage timing, worker/trait speed & quality math
  advance.ts                              advance(state, now): event-driven catch-up
  market.ts                               passive stall sales
  design.ts                               design validation, difficulty, appeal(design, taste)
  orders.ts                               order generation & fulfilment
  discovery.ts                            glaze experiments → colour/effect, recipe book
  progression.ts                          milestones/unlocks, welcome-back, away summary
  character.ts                            makeCharacter(seed): CharacterLook + German name/personality
  actions.ts                              Action union, applyAction(state, action, now)
src/worker/
  index.ts                                fetch router (/api/*), static assets fallthrough
  auth.ts                                 hashing, sessions, found/join/login/logout
  game.ts                                 load/advance/apply/save with version check
  http.ts                                 json(), error(), cookie helpers
src/client/
  main.tsx                                mount, routing between AuthScreen and GameScreen
  api.ts                                  typed fetch wrappers
  store.ts                                signals: serverState, clockOffset, predicted view; dispatch()
  strings.ts                              German UI strings
  art/
    tokens.css                            B2 palette as CSS variables + paper/grain background + font
    ArtDefs.tsx                           <svg><defs> wobble filter, hatch pattern, grain
    ink.ts                                inkStyle(width?) helper, jitter helpers
    pot.ts                                potShape(form, profile) → SVG path data (pure)
    Pot.tsx                               <Pot design effect? size/>
    character/parts.tsx                   heads, hair, eyes, noses, brows, mouths, accessories, outfits
    character/Character.tsx               <Character look pose="idle|work|wave|sleep"/>
    workshop/Room.tsx                     walls, floor, window, decor (from gen_scene.py)
    workshop/stations/*.tsx               Wheel, DryingRack, Kiln, GlazeTable, Shelf, MarketStall, PrepBench
    workshop/WorkshopScene.tsx            lays out stations by slot, workers, batches, pans on mobile
  ui/
    Paper.tsx Button.tsx Sheet.tsx Tabs.tsx Toast.tsx Counter.tsx
  screens/
    AuthScreen.tsx GameScreen.tsx
  panels/
    StationPanel.tsx WorkersPanel.tsx OrdersPanel.tsx MarketPanel.tsx ShopPanel.tsx
    DesignStudio.tsx RecipeBook.tsx ExperimentPanel.tsx AwaySummary.tsx Onboarding.tsx
test/shared/*.test.ts  test/worker/*.test.ts  test/client/*.test.ts
```

---

### Task 1: Project scaffold, deployable hello page

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc`, `vitest.config.ts`, `vitest.workers.config.ts`, `index.html`, `src/client/main.tsx`, `src/worker/index.ts`, `src/worker/http.ts`, `migrations/0001_init.sql` (empty placeholder comment), `test/worker/health.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/health` → `{ ok: true }`
  - `json(data: unknown, status = 200, headers?: HeadersInit): Response`
  - `error(status: number, message: string): Response`, with body `{ error: message }`
  - The `Env` interface `{ DB: D1Database; ASSETS: Fetcher }`, exported from `src/worker/index.ts`

- [ ] **Step 1:** Set up `package.json`.
  - Scripts:
    - `dev` = `vite`
    - `build` = `vite build`
    - `deploy` = `npm run build && wrangler deploy`
    - `test` = `vitest run`
    - `test:worker` = `vitest run -c vitest.workers.config.ts`
    - `check` = `tsc --noEmit`
    - `shot` = `node scripts/screenshot.mjs`
  - Dependencies: preact, @preact/signals
  - Dev dependencies:
    - typescript, vite, @preact/preset-vite
    - @cloudflare/vite-plugin, wrangler
    - vitest, @cloudflare/vitest-pool-workers, @cloudflare/workers-types
    - playwright
- [ ] **Step 2:** Set up `wrangler.jsonc`:
  - name `manufaktur`
  - `main` = `src/worker/index.ts`
  - `assets: { not_found_handling: "single-page-application", run_worker_first: ["/api/*"] }`
  - a D1 binding `DB`, database `manufaktur`, `migrations_dir: "migrations"`
  - `compatibility_date` set to today
- [ ] **Step 3:** Write the failing test `test/worker/health.test.ts`. It calls `SELF.fetch("http://x/api/health")` and expects status 200 with body `{ ok: true }`.
- [ ] **Step 4:** Run `npm run test:worker`. Expected: FAIL.
- [ ] **Step 5:** Implement the router in `src/worker/index.ts`.
  - It is a `switch` on `method + pathname` for `/api/*`, returning 404 JSON for unknown API paths.
  - `main.tsx` renders `<h1>Manufaktur</h1>`.
- [ ] **Step 6:** Run `npm run test:worker && npm run check && npm run build`. Expected: PASS, with no type errors and a build into `dist/`.
- [ ] **Step 7:** Commit with the message `chore: scaffold workers + vite + preact project`.

### Task 2: RNG, core types, content data

**Files:**
- Create: `src/shared/rng.ts`, `src/shared/types.ts`, `src/shared/content/*.ts`
- Test: `test/shared/rng.test.ts`, `test/shared/content.test.ts`

**Interfaces:**
- Produces from `rng.ts`:
  - `nextRandom(seed: number): [value: number /*0..1*/, nextSeed: number]`, using mulberry32
  - `pick<T>(seed, arr: readonly T[]): [T, number]`
  - `randInt(seed, min, maxIncl): [number, number]`
- Produces from `types.ts` (exact names):

```ts
export type Stage = 'prepare' | 'form' | 'dry' | 'bisque' | 'glaze' | 'glazeFire';
export const STAGES: Stage[]; // in that order
export type StationKind = 'prepBench' | 'wheel' | 'dryingRack' | 'kiln' | 'glazeTable' | 'shelf' | 'marketStall';
export interface ProfileParams { height: number; belly: number; neck: number; foot: number; rim: number } // each 0..1
export type PatternKind = 'none' | 'stripes' | 'dots' | 'waves' | 'leaves';
export interface Design { id: string; name: string; form: string; profile: ProfileParams; handle: 'none' | 'round' | 'ear' | 'loop'; rim: 'plain' | 'rolled' | 'flared'; glazeId: string; pattern: PatternKind; patternColor: string /* css colour */ }
export interface GlazeRecipe { id: string; name: string; base: 'transparent' | 'matt' | 'opak'; colorant: string | null; colorantPct: number /*0..10*/; firing: FiringSettings; color: string; effect: string | null }
export interface FiringSettings { temp: 'niedrig' | 'mittel' | 'hoch'; atmosphere: 'oxidierend' | 'reduzierend'; cooling: 'schnell' | 'langsam' }
export interface Batch { id: string; designId: string; count: number; stage: Stage; stationId: string | null; startedAt: number | null; durationMs: number; quality: number }
export interface Station { id: string; kind: StationKind; level: number; slot: number }
export interface Worker { id: string; seed: number; name: string; traits: string[]; xp: number; stationId: string | null }
export interface GoodsStack { designId: string; quality: 1 | 2 | 3; effect: string | null; count: number }
export interface Taste { form?: string; colorFamily?: string; pattern?: PatternKind; tall?: boolean; simple?: boolean }
export interface Order { id: string; customerSeed: number; customerName: string; taste: Taste; form: string; count: number; minQuality: 1 | 2 | 3; rewardTaler: number; rewardRuf: number; bonusDeadline: number | null }
export interface StandingOrder { designId: string; batchSize: number } // auto-requeue when the prepare stage is free
export interface AwayLog { since: number; made: number; sold: number; talerEarned: number; discoveries: string[] }
export interface GameState {
  schemaVersion: number; version: number; playerId: string; createdAt: number; lastTick: number; rng: number;
  taler: number; ruf: number; materials: Record<string, number>;
  stations: Station[]; workers: Worker[]; hirePool: Worker[]; batches: Batch[];
  designs: Design[]; glazes: GlazeRecipe[]; goods: GoodsStack[]; standing: StandingOrder | null;
  orders: Order[]; stallDesignIds: string[]; unlocks: string[]; milestonesDone: string[];
  boostUntil: number; lastSeen: number; away: AwayLog | null; cooldowns: Record<string, number>;
  avatarSeed: number; makerMark: { shape: 'circle' | 'heart' | 'star' | 'leaf'; letter: string; color: string };
  nextId: number;
}
```

- Produces from `content/*`: typed `const` records, plus lookup functions in `content/index.ts`:
  - `getForm(id)`, `getStationDef(kind)`, `getMaterial(id)`, `getTrait(id)`, `getEffect(id)`, `getUnlock(id)`
  - Each one throws on an unknown id.
- **Content minimum** (German display names):
  - **Materials:** `ton` (Ton), `glasurbasis` (Glasurbasis), `eisenoxid`, `kupferoxid`, `kobalt`, `holz` (Brennholz). Each has a shop price and a colour family. Kaolin is declared but `locked`, for Plan 3.
  - **Forms:** `becher` (cup), `schale` (bowl), `teller` (plate), `vase`, `krug` (jug). Each has `clayPerPiece`, `baseValue`, `baseDifficulty`, `unlock` and `profileDefaults`.
  - **Stations:** `prepBench`, `wheel`, `dryingRack`, `kiln`, `glazeTable`, `shelf`, `marketStall`. Each has a stage, `piecesPerMinute[level]`, an upgrade cost per level (levels 1–5), `capacity[level]` for shelf and kiln, and a slot count.
  - **Traits** (at least 10), each with `{ id, name, description, speedMul, qualityAdd, offlineSpeedMul?, neighbourSpeedMul?, effectChanceAdd? }`. The list: Perfektionistin/Perfektionist, Nachteule, Plaudertasche, Flink aber tollpatschig, Glasurflüsterer, Geduldig, Frühaufsteher, Ordnungsliebend, Träumer, Kraftpaket.
  - **Effects:**
    - `craquele`: transparent, `cooling: schnell`
    - `seladon`: eisenoxid 1–3 %, reduzierend, hoch
    - `tenmoku`: eisenoxid 7–10 %, hoch
    - `kupferrot`: kupferoxid 1–3 %, reduzierend
    - `kristall`: `cooling: langsam`, matt, hoch
    - Each condition is a predicate on `GlazeRecipe` and firing. Each effect also has `hint` text in German.
  - **Names:** at least 40 German first names, covering old-fashioned and modern ones and all genders, plus at least 20 personality lines.
  - **Customers:** at least 12 customer archetypes with a German name, an occupation and a taste template.
  - **Unlocks:** see Task 7.
- [ ] **Step 1:** Write tests.
  - `rng`: the same seed gives the same sequence; values fall in [0, 1); `pick` covers every element within 1000 draws.
  - `content`: every form's `unlock` exists in unlocks, every effect has a hint, there are ≥10 traits, and every station kind in `StationKind` has a def.
- [ ] **Step 2:** Run `npx vitest run test/shared`. Expected: FAIL.
- [ ] **Step 3:** Implement the RNG, the types and the content records.
- [ ] **Step 4:** Run `npx vitest run test/shared && npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat(shared): rng, game types, initial content`.

### Task 3: New game, migration, production math

**Files:**
- Create: `src/shared/state.ts`, `src/shared/production.ts`
- Test: `test/shared/state.test.ts`, `test/shared/production.test.ts`

**Interfaces:**
- Produces:
  - `SCHEMA_VERSION = 1`
  - `newGame(playerId: string, seed: number, now: number): GameState`
  - `migrateState(raw: unknown): GameState` (throws if `schemaVersion` is newer than the code)
  - `newId(state, prefix): string`, which increments `state.nextId`
  - `stageDurationMs(state, batch: Batch, station: Station, now: number): number`
  - `batchQuality(state, design: Design, workers: Worker[]): number` (0–100)
  - `qualityTier(q: number): 1 | 2 | 3`, with tier boundaries at <40 → 1, <75 → 2, else 3
  - `stationForStage(stage: Stage): StationKind`
- `newGame` starting state:
  - 100 Taler, 0 Ruf, 30 ton, 10 glasurbasis
  - stations prepBench, wheel, dryingRack, kiln, glazeTable, shelf, marketStall, all at level 1
  - one worker generated from the seed, assigned to the wheel
  - one starter design "Erster Becher" (becher, defaults, glaze `klar` transparent)
  - one starter glaze `klar`
  - a hire pool of 3
  - 2 starter orders
  - `unlocks: ['becher']`
  - `rng` = seed
- Speed rule:
  - Speed per station is `piecesPerMinute[level] × (1 + 0.5 × (assigned workers − 1))`, floored at the unmanned speed `0.25 × piecesPerMinute[level]`.
  - It is multiplied by each assigned worker's trait `speedMul`, by ×2 while `now < boostUntil`, and by `offlineSpeedMul` for workers whose trait has one, during periods where `now > lastSeen + 5 min`.
  - Duration = `count / speed` minutes.
  - Dry and fire stages ignore workers.
- [ ] **Step 1:** Write tests.
  - `newGame` is deterministic for the same seed.
  - A becher batch of 6 at level 1 with one plain worker takes a total of 150–210 s through all six stages. Assert the sum of `stageDurationMs` is in that range: this is the 3-minute pacing goal.
  - The perfectionist trait raises quality and lowers speed.
  - Boost doubles speed.
  - `migrateState` round-trips `JSON.parse(JSON.stringify(newGame(...)))` and rejects `schemaVersion: 999`.
- [ ] **Step 2:** Run `npx vitest run test/shared/state.test.ts test/shared/production.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Tune station `piecesPerMinute` level-1 values until the pacing test passes.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat(shared): new game state and production math`.

### Task 4: `advance` — event-driven catch-up, market stall, offline cap

**Files:**
- Create: `src/shared/advance.ts`, `src/shared/market.ts`
- Test: `test/shared/advance.test.ts`

**Interfaces:**
- Consumes: Task 3's functions.
- Produces:
  - `advance(state: GameState, now: number): GameState`, which is pure and returns a new object
  - `stallSalesBetween(state, from, to): { sold: GoodsStack[]; taler: number }`
- Algorithm (the rules the tests don't fully fix):
  - If `now <= state.lastTick`, return the state unchanged.
  - Loop:
    1. Start every startable batch, in FIFO order per stage. A station processes one batch at a time; kiln stages use the kiln's `capacity[level]` in pieces.
    2. If a standing order exists, the prepare stage is free and materials suffice, enqueue a new batch.
    3. Find the earliest completion time ≤ `now` and complete that batch. Its next stage becomes waiting. After `glazeFire`, add it to goods with a quality tier and roll an effect from `rng` if the glaze has one: chance 0.6 + trait `effectChanceAdd`.
    4. Repeat. Stop when there are no completions ≤ `now`, or after 20 000 iterations as a safety valve.
  - A finished batch whose goods would exceed shelf `capacity[level]` waits at `glazeFire` (blocked, not lost) until there is space.
  - Market stall sales: between events, the stall sells goods whose `designId` is in `stallDesignIds` at `stallRate(level)` pieces per minute for `baseValue × qualityMul × 0.8` Taler each. That frees shelf space.
  - Away log: if `now - lastSeen > 10 min`, accumulate `away` counters.
  - Set `lastTick = now`.
  - Level-1 shelf capacity plus stall rate must allow at least 24 h of standing-order production without blocking. This follows from the spec's "at least 12–24 h".
- [ ] **Step 1:** Write the failing tests.
  - Starter state with a standing order of 6 becher: after `advance(+200 s)`, the goods count is 6.
  - `advance` is deterministic: two runs give deep-equal results.
  - Calling `advance(now)` twice equals calling it once. Calling `advance(t1)` then `advance(t2)` equals `advance(t2)` (catch-up is split-invariant), checked within ±1 piece over 1 h.
  - **Review Focus 1:** a standing order plus a stall over 30 days finishes in under 100 ms (`performance.now()`). Goods never exceed shelf capacity, and Taler increases.
  - **Review Focus 2:** `advance(state, state.lastTick - 5000)` returns the state deep-equal and unchanged.
  - With a stall level 1 and a standing order, 24 h of offline time shows no blocked time in the first 24 h. Assert that `away.made ≥ (24 h × expected rate) × 0.95`.
- [ ] **Step 2:** Run `npx vitest run test/shared/advance.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `advance` and the market stall.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat(shared): deterministic offline catch-up simulation`.

### Task 5: Designs, orders and actions

**Files:**
- Create: `src/shared/design.ts`, `src/shared/orders.ts`, `src/shared/actions.ts`
- Test: `test/shared/design.test.ts`, `test/shared/orders.test.ts`, `test/shared/actions.test.ts`

**Interfaces:**
- Produces from `design.ts`:
  - `validateDesign(d: Design, state): string | null`, returning a German error or null
  - `designDifficulty(d): number` (0.5–2)
  - `appeal(d: Design, glaze: GlazeRecipe, taste: Taste): number` (0..1)
  - `colorFamily(cssColor: string): 'rot' | 'blau' | 'gruen' | 'gelb' | 'braun' | 'weiss' | 'schwarz' | 'lila'`
- Produces from `orders.ts`:
  - `generateOrder(state): [Order, number /*rng*/]`
  - `orderReward(order, stack: GoodsStack, design, glaze): { taler: number; ruf: number }`
  - Reward = base × count × (1 + appeal) × tier multiplier (1 / 1.4 / 2).
  - Keep 3–5 open orders, refilling one per 4 minutes of game time in `advance` (wire this in).
- Produces from `actions.ts`:

```ts
export type Action =
  | { type: 'buyMaterial'; material: string; amount: number }
  | { type: 'queueBatch'; designId: string; count: number }
  | { type: 'setStanding'; designId: string | null; batchSize?: number }
  | { type: 'hire'; workerId: string }
  | { type: 'assign'; workerId: string; stationId: string | null }
  | { type: 'upgradeStation'; stationId: string }
  | { type: 'saveDesign'; design: Design }            // create or update by id
  | { type: 'deliverOrder'; orderId: string; designId: string; quality: 1 | 2 | 3; effect: string | null }
  | { type: 'setStall'; designIds: string[] }
  | { type: 'sellNow'; designId: string; quality: 1 | 2 | 3; effect: string | null; count: number }
  | { type: 'experiment'; recipe: Omit<GlazeRecipe, 'id' | 'color' | 'effect' | 'name'> }   // Task 6
  | { type: 'handTouch'; stationId: string }          // §4.1 hand-crafted touch, cooldown 10 min
  | { type: 'setAvatar'; seed: number } | { type: 'setMakerMark'; mark: GameState['makerMark'] }
  | { type: 'ackAway' } | { type: 'ackMilestone'; id: string };
export type ActionResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
export type GameEvent = { kind: 'discovery' | 'unlock' | 'milestone' | 'orderDone' | 'levelUp'; id: string; text: string };
export function applyAction(state: GameState, action: Action, now: number): ActionResult;
```

- `applyAction` always calls `advance(state, now)` first. On success it increments `state.version`. On failure the input state is untouched.
- `handTouch` gives +15 % speed on that station for its current batch and sets `cooldowns[stationId] = now + 10 min`.
- `hire` costs `30 × (workers.length)` Taler, and the hire pool refills from rng.
- Ruf gates `upgradeStation` (spec §4.6).
- [ ] **Step 1:** Write the failing tests.
  - `appeal` is ≥0.8 when the design matches every taste key, and ≤0.3 when it matches none.
  - Delivering an order removes the goods, adds the reward and removes the order.
  - **Review Focus 4:** each of these returns `{ ok: false }` with a non-empty German error and leaves the state unchanged (deep-equal, and `version` unchanged):
    - buying with too little Taler
    - assigning an unknown worker
    - queueing an unknown design
    - delivering goods you don't have
    - `handTouch` during cooldown
    - `saveDesign` with an out-of-range profile
  - `handTouch` twice within 10 min: the second one fails.
- [ ] **Step 2:** Run `npx vitest run test/shared`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/shared`. Expected: all PASS.
- [ ] **Step 5:** Commit with the message `feat(shared): designs, orders, actions`.

### Task 6: Glaze discovery & recipe book

**Files:**
- Create: `src/shared/discovery.ts`
- Modify: `src/shared/actions.ts` (the `experiment` case)
- Test: `test/shared/discovery.test.ts`

**Interfaces:**
- Produces:
  - `glazeColor(recipe): string` (CSS colour). Examples:
    - kupferoxid oxidierend → green
    - kupferoxid reduzierend → red
    - kobalt → blue
    - eisenoxid low → amber/celadon-green under reduction
    - eisenoxid high → dark brown/black
    - none → base-dependent cream or white
  - `matchEffect(recipe): string | null`, using the content effect predicates
  - `hintFor(recipe, state): string | null`, a German hint naming the closest undiscovered effect with one wrong parameter
- `experiment` action:
  - Costs materials: glasurbasis 2, colorant 1 if one is set.
  - It is instant, as a test tile.
  - It adds a `GlazeRecipe` to `state.glazes` if the combination is new.
  - If the recipe matches an undiscovered effect, it emits a `discovery` event.
  - It records the glaze in the recipe book: every glaze in `state.glazes` is a page.
- [ ] **Step 1:** Write tests.
  - kupferoxid 2 % + reduzierend + hoch → `kupferrot`, and the colour is red family.
  - transparent + schnell → `craquele`.
  - The same recipe twice → no duplicate glaze.
  - A recipe one parameter away from `seladon` gets a hint mentioning "Reduktion" or the parameter that's off.
- [ ] **Step 2:** Run `npx vitest run test/shared/discovery.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat(shared): glaze experiments and discoveries`.

### Task 7: Progression, unlocks, welcome-back, characters

**Files:**
- Create: `src/shared/progression.ts`, `src/shared/character.ts`, `src/shared/content/unlocks.ts` (fill in)
- Modify: `src/shared/actions.ts` and `src/shared/advance.ts`, to call `checkMilestones` and `touchSeen`
- Test: `test/shared/progression.test.ts`, `test/shared/character.test.ts`

**Interfaces:**
- Produces:
  - `checkMilestones(state): { state: GameState; events: GameEvent[] }`
  - `touchSeen(state, now): GameState`. It sets `lastSeen = now`. If the previous `lastSeen` is ≥24 h ago, it also sets `boostUntil = now + 30 min` and keeps `away` for the summary.
  - `makeCharacter(seed: number): CharacterLook`
  - `characterName(seed): string`
  - `personality(seed, traits): string` (German)
- `applyAction` calls `touchSeen` and `checkMilestones` in that order, after the action. The Worker's `GET /api/state` calls `touchSeen` only.

```ts
export interface CharacterLook {
  body: 'round' | 'tall' | 'small' | 'broad'; skin: string; hairStyle: 'bun' | 'short' | 'curly' | 'bald' | 'braids' | 'mohawk' | 'long' | 'cap';
  hairColor: string; eyes: 'dot' | 'happy' | 'sleepy' | 'wide' | 'glasses'; brows: 'thin' | 'bushy' | 'none'; nose: 'button' | 'long' | 'round';
  mouth: 'smile' | 'grin' | 'gap' | 'o'; facial: 'none' | 'moustache' | 'beard' | 'freckles' | 'mole';
  quirk: 'headscarf' | 'bigHat' | 'flower' | 'earring' | 'pencilEar' | 'bandana' | 'scarf' | 'none'; outfit: string; apron: string; heightMul: number;
}
```

- **Unlock chain** (milestone → unlock). The first 8 must be reachable within about 40 minutes of normal play, per the pacing test:
  1. sell the first piece → orders board
  2. deliver the first order → design studio
  3. save your own design → `schale`
  4. 20 pieces made → hiring
  5. first experiment → recipe book
  6. reach 10 Ruf → station upgrades
  7. 2 workers → `teller`
  8. first effect discovered → `vase`
  9. 30 Ruf → `krug` + patterns `waves`/`leaves`
  10. 60 Ruf → second room (extra station slots)
- [ ] **Step 1:** Write tests.
  - A scripted "playthrough" plays the first session with a simple bot (standing order + deliver orders + one experiment + save a design + hire) over 40 simulated minutes. It reaches ≥6 unlocks, with no gap between consecutive unlocks longer than 8 minutes.
  - `touchSeen` after 25 h sets the boost. After 2 h it doesn't.
  - Worker growth: workers gain 1 XP per finished piece at their station. At 150 XP a worker gains one extra trait from rng (at most 3 traits) and emits a `levelUp` event. Test that a worker reaches a second trait after 150 pieces.
  - `makeCharacter`: 200 seeds give ≥150 distinct looks (JSON), every look has a non-`none` value in at least one of `facial` or `quirk`, and the same seed gives the same look.
- [ ] **Step 2:** Run `npx vitest run test/shared`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement. Tune unlock thresholds against the playthrough test.
- [ ] **Step 4:** Run `npx vitest run test/shared`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat(shared): progression, welcome-back, character generator`.

### Task 8: Database & accounts

**Files:**
- Create: `migrations/0001_init.sql`, `src/worker/auth.ts`
- Modify: `src/worker/index.ts`
- Test: `test/worker/auth.test.ts`

**Interfaces:**
- Schema:
  - `villages(id TEXT PK, name TEXT, invite_code TEXT UNIQUE, created_at INT)`
  - `players(id TEXT PK, village_id TEXT, name TEXT, name_key TEXT UNIQUE /*lower-case*/, pw_hash TEXT, pw_salt TEXT, created_at INT)`
  - `sessions(token TEXT PK, player_id TEXT, expires_at INT)`
  - `workshops(player_id TEXT PK, version INT, state TEXT /*JSON*/, updated_at INT)`
- Endpoints (all JSON):
  - `POST /api/found {villageName, name, password}` → 201 `{ inviteCode }`, and sets the cookie
  - `POST /api/join {inviteCode, name, password}` → 201
  - `POST /api/login {name, password}` → 200
  - `POST /api/logout` → 204
  - `GET /api/me` → `{ playerId, name, villageName, inviteCode }`, or 401
- Produces: `requirePlayer(req, env): Promise<{ playerId: string; villageId: string } | Response>`
- Invite code: 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`.
- Founding or joining creates a workshop row with `newGame(playerId, seed from crypto, Date.now())`.
- Errors are German: "Name schon vergeben", "Einladungscode unbekannt", "Name oder Passwort falsch", "Passwort zu kurz (mind. 6 Zeichen)".
- [ ] **Step 1:** Write the failing tests:
  - found → me works with the cookie
  - join with a wrong code → 404 "Einladungscode unbekannt"
  - a duplicate name in any case → 409
  - a wrong password → 401
  - logout then me → 401
  - a 1-character name → 400
- [ ] **Step 2:** Run `npm run test:worker`. Expected: FAIL.
- [ ] **Step 3:** Implement with WebCrypto PBKDF2 and the migration. Tests apply migrations via `applyD1Migrations` in the setup file.
- [ ] **Step 4:** Run `npm run test:worker`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat(worker): villages, accounts, sessions`.

### Task 9: Game API

**Files:**
- Create: `src/worker/game.ts`
- Modify: `src/worker/index.ts`
- Test: `test/worker/game.test.ts`

**Interfaces:**
- `GET /api/state` → `{ state: GameState, serverNow: number }`.
  - It loads the state, then runs `migrateState` → `advance(now)` → `touchSeen(now)`, and saves if anything changed.
- `POST /api/action { action: Action, version: number }`:
  - If `version !== stored.version`, it returns 409 `{ error: "Veraltet", state, serverNow }`.
  - If the action is invalid, it returns 400 `{ error }`.
  - Otherwise it returns 200 `{ state, events, serverNow }`.
- The save uses `UPDATE … WHERE player_id=? AND version=?` and checks `meta.changes === 1`, else 409. This guards against races between two requests.
- The request body is validated: `action.type` must be a known type, otherwise 400. Bodies larger than 32 KB get 413.
- [ ] **Step 1:** Write the failing tests:
  - the state is returned after founding
  - `buyMaterial` raises `version` by 1
  - **Review Focus 3:** two actions sent with the same version: the first is 200, the second is 409 and includes the fresh state
  - **Review Focus 4:** `{action:{type:"hack"}}` → 400, malformed JSON → 400, and an unauthenticated request → 401
- [ ] **Step 2:** Run `npm run test:worker`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run test:worker`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat(worker): authoritative game state API`.

### Task 10: Art foundation (tokens, defs, UI paper kit) + screenshot tool

**Files:**
- Create: `src/client/art/tokens.css`, `src/client/art/ArtDefs.tsx`, `src/client/art/ink.ts`, `src/client/ui/{Paper,Button,Sheet,Tabs,Toast,Counter}.tsx`, `scripts/screenshot.mjs`, and a temporary dev route `/#kit` that shows all UI pieces
- Test: `test/client/ink.test.ts`

**Interfaces:**
- `tokens.css`:
  - It copies the `.b-wash` variable set from `docs/art/art-style-reference.html` verbatim onto `:root`.
  - It adds `--font-hand: 'Patrick Hand', cursive` and the paper background, cream `#fdf6e8` with a grain overlay.
- `<ArtDefs/>` renders the filters once in the app root:
  - `#wobble`: turbulence `baseFrequency=0.045`, `scale=2.4`, from the reference
  - `#hatch`: the pattern
  - `#grain`
- `inkStyle(width = 2.2): JSX.CSSProperties`, using stroke `var(--line)`, round joins and round caps.
- UI kit:
  - `<Paper tilt?>`: a card with a wobbly ink border, a slight rotation and a tape corner.
  - `<Button variant="primary|quiet">`: an ink-outlined pill. On hover it gets a "wiggle" (CSS keyframe), and pressing it squashes it.
  - `<Sheet>`: a side panel on desktop (≥900 px) and a bottom sheet on mobile.
  - `<Counter icon value>`: for Taler and Ruf, with a hand-drawn coin and star icon in SVG.
- `scripts/screenshot.mjs <url> <outPrefix>` saves `docs/screens/<outPrefix>-desktop.png` (1280×800) and `-phone.png` (375×812).
- [ ] **Step 1:** Write the test: `inkStyle()` returns stroke `var(--line)` and the given width.
- [ ] **Step 2:** Run `npx vitest run test/client`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** Run `npm run dev` and `npm run shot -- http://localhost:5173/#kit kit`. Expected: two PNGs exist.
- [ ] **Step 4:** Commit with the message `feat(client): B2 art tokens, defs and paper UI kit`.

### Task 11: Pot renderer — REVIEW GATE

**Files:**
- Create: `src/client/art/pot.ts`, `src/client/art/Pot.tsx`, and a dev route `/#pots`
- Test: `test/client/pot.test.ts`

**Interfaces:**
- `potShape(form: string, p: ProfileParams): { body: string; rim: { cx; cy; rx; ry }; handle?: string; spout?: string; bandY: number; bandHalfWidth: number }`
  - Coordinates are in a 100×100 box, base at y=96, centred at x=50.
  - The body is a symmetric closed path built from a Catmull-Rom curve through profile points (foot, belly, neck, rim), mirrored. `p.height` scales the height, and plates and bowls flatten.
- `<Pot design glaze effect? size quality?/>` renders:
  - the body filled with `glaze.color`, with a darker lower dip edge
  - the pattern on the band
  - rim highlight, a white gloss stroke, and the maker's mark only in zoomed views
  - effect overlays:
    - `craquele`: a fine crack net
    - `seladon`: a translucent pale-green sheen
    - `tenmoku`: rust-coloured edges
    - `kupferrot`: red with variation
    - `kristall`: star-flake specks
- [ ] **Step 1:** Write tests: for every form × 5 random profiles, the path contains no `NaN`, all x values fall in [2, 98], it's symmetric (mirrored points equal within 0.01), and a taller `height` gives a smaller min-y.
- [ ] **Step 2:** Run `npx vitest run test/client/pot.test.ts`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** `/#pots` shows a grid of every form × 3 profiles × 5 glazes × all effects. Take a screenshot with `npm run shot -- http://localhost:5173/#pots pots`.
- [ ] **Step 4:** **REVIEW GATE:** show `docs/screens/pots-desktop.png` to the owner. Iterate until they approve, and record the approval in the commit message.
- [ ] **Step 5:** Commit with the message `feat(client): procedural pot renderer (approved)`.

### Task 12: Character renderer — REVIEW GATE

**Files:**
- Create: `src/client/art/character/parts.tsx`, `src/client/art/character/Character.tsx`, and a dev route `/#people`
- Test: `test/client/character.test.ts`

**Interfaces:**
- Consumes: `CharacterLook` and `makeCharacter` (Task 7).
- `<Character look pose="idle|work|wave|sleep" scale?/>`:
  - It renders in a 120×200 box, with feet at y=196.
  - It's composed from part components keyed by the look fields, all inked with `inkStyle` and the wobble filter.
  - Gentle CSS animation: breathing (scaleY 1→1.02, 3 s), blinking (eyes every 4–7 s, with the offset derived from the seed), and a work bob.
- Style: big heads (about 40 % of height), rosy cheeks, dot or arc eyes like the reference potter, and expressive quirks.
- [ ] **Step 1:** Write the test: rendering 50 seeds to a string via `preact-render-to-string` (dev dependency) gives distinct markup, and no part key is missing (no "undefined" in the markup).
- [ ] **Step 2:** Run `npx vitest run test/client/character.test.ts`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** `/#people` shows a crowd of 24 seeds in all poses, with name and personality labels. Run `npm run shot -- http://localhost:5173/#people people`.
- [ ] **Step 4:** **REVIEW GATE:** show `docs/screens/people-desktop.png` to the owner. The hard requirement is "cute, distinctive traits". Iterate until approved.
- [ ] **Step 5:** Commit with the message `feat(client): procedural characters (approved)`.

### Task 13: Workshop scene — REVIEW GATE

**Files:**
- Create: `src/client/art/workshop/Room.tsx`, `src/client/art/workshop/stations/{PrepBench,Wheel,DryingRack,Kiln,GlazeTable,Shelf,MarketStall}.tsx`, `src/client/art/workshop/WorkshopScene.tsx`, and a dev route `/#scene` with a mocked state
- Test: `test/client/scene.test.ts`

**Interfaces:**
- `<WorkshopScene state={GameState} now={number} onStation={(id) => void} onWorker={(id) => void}/>`.
  - The scene viewBox is 1200×700. Stations sit in fixed slots: slot positions are a `SLOTS: {x, y}[]` table in `WorkshopScene.tsx`, with 7 slots in room 1 and 5 more for the second-room unlock.
  - `Room` ports the decor of `docs/art/gen_scene.py`: beam, string lights, window, curtains, plants, pinboard, clock, rug, broom, cat. The pinboard shows thumbnails of the player's latest 4 designs using `<Pot>`.
- Each station shows its live state:
  - Wheel: the current pot rising and spinning.
  - Drying rack: grey greenware.
  - Kiln: glowing and flickering while firing, with smoke puffs.
  - Glaze table: buckets in the player's glaze colours.
  - Shelf: the actual goods drawn as `<Pot>`, up to the visible capacity, then "+N".
  - Market stall: an awning, with coins popping on sales.
- Each assigned worker stands at their station in the `work` pose. Idle workers sit with the cat.
- On mobile, the scene is horizontally pannable (pointer drag plus scroll-snap per room half). There is never page-level horizontal scroll.
- Each station shows a progress ring for the current batch, computed from `startedAt` and `durationMs` against `now`.
- [ ] **Step 1:** Write the test: rendering with a mocked state that has goods, firing and an assigned worker gives the expected `data-station` attributes for all 7 kinds, and the shelf contains N `data-pot` elements for N goods (capped at the visible max).
- [ ] **Step 2:** Run `npx vitest run test/client/scene.test.ts`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** Run `npm run shot -- http://localhost:5173/#scene scene`. Check the 375 px phone shot for no overflow (Review Focus 5).
- [ ] **Step 4:** **REVIEW GATE:** show the desktop and phone scene screenshots to the owner. The bar is the B2 reference: at least as rich and cute. Iterate until approved.
- [ ] **Step 5:** Commit with the message `feat(client): live workshop scene (approved)`.

### Task 14: App shell — auth screens, store, prediction

**Files:**
- Create: `src/client/api.ts`, `src/client/store.ts`, `src/client/strings.ts`, `src/client/screens/AuthScreen.tsx`, `src/client/screens/GameScreen.tsx`
- Modify: `src/client/main.tsx`
- Test: `test/client/store.test.ts`

**Interfaces:**
- `api.ts`: `found()`, `join()`, `login()`, `logout()`, `me()`, `getState()`, `postAction(action, version)`. Each returns typed results and throws `ApiError {status, message, body}`.
- `store.ts`:
  - signals `me`, `serverState`, `clockOffset` (where `serverNow - Date.now()` is measured on each response), `now` (updated every 250 ms), and `view = computed(() => advance(serverState, now + clockOffset))`
  - `dispatch(action): Promise<GameEvent[]>`:
    - It applies the action optimistically with `applyAction` on `view` and shows the result immediately.
    - It posts to the server. On 200 it replaces `serverState`. On 409 it adopts the returned state, re-applies the action once, and posts again. On 400 it rolls back and shows a toast with the German error.
- `AuthScreen`: a hand-drawn welcome page, the cozy workshop silhouette, and three paper cards: "Manufaktur gründen" (found a village), "Mit Einladungscode beitreten" (join) and "Anmelden" (log in). After founding, it shows the invite code large, with a copy button.
- `GameScreen`:
  - a top bar with Taler, Ruf and the village name
  - the `WorkshopScene`
  - a bottom toolbar with paper-tab buttons: Aufträge, Werkstatt, Leute, Entwürfe, Rezeptbuch, Laden (orders, workshop, people, designs, recipe book, shop)
  - events shown as toasts
- [ ] **Step 1:** Write tests with mocked fetch:
  - **Review Focus 2:** a `clockOffset` of +5 min doesn't make `view` run ahead of the server. `view` uses the server-relative time.
  - **Review Focus 3:** a 409 leads to one retry with the new version, and the final state equals the server's.
  - A 400 rolls back the optimistic state and sets a toast message.
- [ ] **Step 2:** Run `npx vitest run test/client/store.test.ts`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** Run `npm run dev`, then found a village, reload (the session persists), log out and log back in. Expected: it works end to end against the local D1 (`wrangler d1 migrations apply manufaktur --local`).
- [ ] **Step 4:** Commit with the message `feat(client): auth screens, store with server-reconciled prediction`.

### Task 15: Gameplay panels

**Files:**
- Create: `src/client/panels/{StationPanel,WorkersPanel,OrdersPanel,MarketPanel,ShopPanel}.tsx`
- Modify: `src/client/screens/GameScreen.tsx`
- Test: `test/client/panels.test.ts`

**Interfaces:** All panels are `Sheet`s that read `view` and call `dispatch`.

- **StationPanel** (opens when a station is clicked):
  - the queue for that stage, with progress
  - the assigned workers, with their portraits
  - an upgrade button showing cost and effect ("+40 % schneller", 40 % faster)
  - the hand-touch button with a cooldown ring
  - for the wheel: the standing-order picker (design + batch size), the casual default
- **WorkersPanel:**
  - workers as portrait cards: name, personality line, trait badges with tooltips, and XP
  - drag a card onto a station, or use an assignment dropdown on mobile
  - the hire pool with costs
  - an "Automatisch verteilen" (assign automatically) button that assigns by best trait fit and sends the action sequence
- **OrdersPanel:**
  - order cards, each with the customer `<Character>` portrait, name and occupation, a taste in a speech bubble ("Ich mag Blau und hohe Formen!", I like blue and tall shapes), the form, count, minimum quality and reward
  - a "Liefern" (deliver) button, enabled when matching goods exist, that picks the best matching stack
  - a highlight on which of your designs fit best
- **MarketPanel:** shelf goods as pots, which designs the stall sells (toggles) and "Jetzt verkaufen" (sell now).
- **ShopPanel:** buy materials with +10 / +50 buttons and price shown, and the station upgrades overview.
- Locked panels show a hand-drawn padlock and the milestone that unlocks them (from `unlocks.ts`).
- [ ] **Step 1:** Write tests:
  - OrdersPanel with a mocked view: "Liefern" is disabled when there are no matching goods, and enabled and dispatching `deliverOrder` with the best stack when there are.
  - WorkersPanel auto-assign dispatches `assign` actions only for unassigned workers.
- [ ] **Step 2:** Run `npx vitest run test/client/panels.test.ts`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** Take desktop and phone screenshots of each panel open (`npm run shot` with hash deep links `#panel=orders` and so on). Check the phone shots for overflow (Review Focus 5).
- [ ] **Step 4:** Commit with the message `feat(client): production, workers, orders, market, shop panels`.

### Task 16: Design studio, experiments, recipe book

**Files:**
- Create: `src/client/panels/DesignStudio.tsx`, `src/client/panels/ExperimentPanel.tsx`, `src/client/panels/RecipeBook.tsx`
- Test: `test/client/studio.test.ts`

**Interfaces:**
- **DesignStudio:**
  - a large `<Pot>` live preview, turning gently
  - a form picker showing unlocked forms
  - five profile sliders labelled Höhe, Bauch, Hals, Fuß, Rand (height, belly, neck, foot, rim), and presets
  - handle and rim pickers
  - a glaze picker (discovered glazes as swatch drops)
  - pattern and pattern colour
  - a name field
  - a live "Beliebt bei…" (popular with…) list: the top 3 open-order customers by `appeal`
  - a difficulty indicator
  - Save sends `saveDesign`.
  - It also includes maker's-mark and avatar editors: avatar seed shuffle plus "keep this one".
- **ExperimentPanel:** a test-tile bench where you pick a base, a colourant, a % slider (0–10), temperature, atmosphere and cooling, then press "Brennen!" (fire!). A short kiln animation (1.5 s) reveals the tile: either a discovery celebration, a new colour, or the hint text.
- **RecipeBook:** a two-page notebook spread showing discovered glazes as painted swatches with recipe notes in handwriting. Undiscovered effects appear as "?" pages with their hint once one is known.
- [ ] **Step 1:** Write tests:
  - Moving a slider updates the preview path (`data-path` changes).
  - Save dispatches `saveDesign` with profile values in [0, 1].
  - The Experiment panel dispatches `experiment` with the chosen recipe.
- [ ] **Step 2:** Run `npx vitest run test/client/studio.test.ts`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** Take screenshots of the studio and the recipe book at both sizes, and check them.
- [ ] **Step 4:** Commit with the message `feat(client): design studio, glaze experiments, recipe book`.

### Task 17: Onboarding, away summary, milestones UI

**Files:**
- Create: `src/client/panels/Onboarding.tsx`, `src/client/panels/AwaySummary.tsx`
- Modify: `src/client/screens/GameScreen.tsx`
- Test: `test/client/onboarding.test.ts`

**Interfaces:**
- **Onboarding:** a mentor character, "Meisterin Greta", from a fixed seed with a distinct look: big hat and round glasses. She gives short speech-bubble steps that point at stations with a hand-drawn arrow:
  1. "Hol dir Ton" (get some clay)
  2. "Dreh deinen ersten Becher" (throw your first cup)
  3. "Ab in den Ofen" (into the kiln)
  4. "Glasieren" (glaze)
  5. "Verkaufen" (sell)
  6. "Dein erster Auftrag" (your first order)
  7. "Gestalte deinen eigenen Becher" (design your own cup)
  8. "Probier eine Glasur" (try a glaze)
  - Each step completes automatically when the matching state condition holds (derived from `milestonesDone` and state), and it can be skipped.
- Milestone and unlock events show a paper "Freigeschaltet!" (unlocked!) card with confetti made of clay crumbs, then send `ackMilestone`.
- **AwaySummary:** if `view.away` is set on load, it shows a paper card titled "Während du weg warst…" (while you were away…) listing pieces made, sold, Taler earned and discoveries, plus "Willkommen zurück — doppeltes Tempo für 30 Minuten!" (welcome back — double speed for 30 minutes!) when the boost is active. Closing it sends `ackAway`.
- [ ] **Step 1:** Write tests:
  - Onboarding moves from step 1 to step 2 when `materials.ton` increases after a buy.
  - AwaySummary renders the counters from `away` and dispatches `ackAway` on close.
- [ ] **Step 2:** Run `npx vitest run test/client/onboarding.test.ts`. Expected: FAIL, then implement until it passes.
- [ ] **Step 3:** Commit with the message `feat(client): onboarding mentor, away summary, unlock celebrations`.

### Task 18: Deploy and end-to-end smoke

**Files:**
- Create: `test/e2e/smoke.mjs` (Playwright script, not part of `npm test`), `README.md` (dev, test and deploy instructions, in German or English per the owner's choice; default German)

**Interfaces:**
- `node test/e2e/smoke.mjs <baseUrl>` does the following:
  1. Founds a village with a random name and reads the invite code.
  2. In a second browser context, joins with that code.
  3. As the first player: buys clay and sets a standing order.
  4. Waits 200 s, or uses a `?fast=1` dev-only time multiplier that is honoured **only** when `env.DEV_FAST === "1"`.
  5. Checks the shelf has goods.
  6. Delivers an order and checks the Taler increased.
  7. Takes screenshots.
- Deploy steps:
  - `wrangler d1 create manufaktur`, then put the id in `wrangler.jsonc`
  - `wrangler d1 migrations apply manufaktur --remote`
  - `npm run deploy`
- [ ] **Step 1:** Run `npm test && npm run test:worker && npm run check`. Expected: all PASS.
- [ ] **Step 2:** Run `node test/e2e/smoke.mjs http://localhost:5173` against dev with `DEV_FAST=1` in `.dev.vars`. Expected: the script ends with "SMOKE OK".
- [ ] **Step 3:** Deploy. This needs the owner's Cloudflare login (`! npx wrangler login`). Ask before the first deploy. Then run `node test/e2e/smoke.mjs https://<deployed-url>` without fast mode, up to the founding and join checks only. Expected: "SMOKE OK (no-fast)".
- [ ] **Step 4:** Commit with the message `chore: e2e smoke, README, first deploy`. Ask the owner before pushing to GitHub.
