# Manufaktur — Plan 2: The Village (Dorf)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Friends and family in one village play together, asynchronously. The plan delivers:

- regional specialties
- a trading board, gifts and requests
- visits with a helping hand and a guestbook
- joint orders (Großaufträge) that only two or more players can finish
- village buildings with passive benefits
- workshop decor rewards
- a hand-drawn village map

All of it must be absence-safe.

**Architecture:**

- **Village state** is one JSON document per village, owned by a Durable Object `VillageDO` (one instance per village id, via `idFromName`). The DO serialises every village operation.
- **Workshops stay in D1.** A village operation touches the village document and at most the two workshops involved:
  - The actor's workshop is written first with the existing conditional `version` update.
  - The village document is persisted only after that succeeds.
  - Deliveries to the other player are pure additions, applied with a read-modify-write retry loop. They are commutative, so a retry can't lose anything.
- **Game rules stay pure** in `src/shared/village/`. The DO and the client both call them.
- **Village effects on a workshop** reach it through a `village` snapshot field inside `GameState`. The snapshot holds the specialty, the village buildings and help boosts. The DO writes it, so solo simulation needs no network.

**Tech Stack:** As in Plan 1, plus Cloudflare Durable Objects (SQLite-backed class, `new_sqlite_classes` migration).

**Spec:** `docs/superpowers/specs/2026-11-07-manufaktur-design.md`: §5.1–5.4 and §5.6, §7 (art gate: village map), §9 (first-release scope). The communal great kiln (§5.5) stays deferred.

**Builds on:** Plan 1 code on `main`. Relevant interfaces:

- `GameState`, `GoodsStack`, `Design` (`src/shared/types.ts`)
- `applyAction` / `Action` / `ACTION_TYPES` (`src/shared/actions.ts`)
- `advance(state, now, maxEvents)`, `migrateState` with `SCHEMA_VERSION = 1`, `newId`
- `pieceValue`, `addGoods`, `stallSalesBetween` (`src/shared/market.ts`)
- `requirePlayer`, `readBody` (`src/worker/auth.ts`)
- `CATCHUP_EVENTS` and `load` / `save` (`src/worker/game.ts`)
- client `store.ts` (`dispatch`, `loadState`, `view`), `api.ts`, `PanelHost`, `WorkshopScene`, `Room`

## Global Constraints

- Everything from Plan 1's Global Constraints still holds:
  - German text
  - deterministic shared rules
  - no grind
  - never punish absence
  - the B2 art style
  - 375 px phone layout
  - server-authoritative state
- **Absence-safe:**
  - Nothing in the village waits on a specific person.
  - Joint orders have no deadline.
  - Every specialty material can also be bought from the **village store** at 3× base price.
  - Rewards always include a base share for **every** member, absent ones included.
  - Trades never expire against anyone. An offer stays until it's taken or the poster cancels it.
- **"Only together":** a joint order completes only when **≥ 2 distinct players** have contributed. A village with one member gets no joint orders, and their solo game is unaffected.
- **No value from nothing:** every trade, gift and contribution moves value that existed. Escrow is held in the village document; delivery uses retries.
  - Test: the sum of all Taler, materials and goods across both workshops plus escrow is unchanged by any trade or gift.
- **Server-side caps:**
  - board: ≤ 30 open offers and ≤ 20 open requests per village
  - news log: ≤ 100 entries
  - guestbook: ≤ 50 entries per player
  - helps: ≤ 3 per helper per player per day
- **Village actions are validated like solo actions:** own-property lookups, integer bounds, German errors, no state change on rejection.
- **Art:** the village map is **REVIEW GATE 4**. It gets a screenshot and owner approval; while the owner is away it's self-reviewed and the screenshot is listed for the owner.

## Review Focus

1. **Two players acting on the same offer at once.** Only one gets the goods; the other gets a German "already taken" message, and nothing is duplicated. Owner: Task 6 test.
2. **The recipient's workshop changes while a delivery is applied** (their own action races the DO). The delivery is applied exactly once and the recipient's action isn't lost. Owner: Task 6 test.
3. **Gifted pieces arriving in a workshop that doesn't know the design.** They must render with the sender's design and maker's mark and stay sellable and deliverable. They must not appear in the recipient's design pickers or count against `MAX_DESIGNS`. Owner: Task 3.
4. **A member who never logs in again.** Joint orders still complete (store fallback plus another contributor), and the absent member still receives the base reward. Owner: Task 4 test.
5. **Visiting a player from another village, or a non-existent id.** Must return 404, and no workshop data may leak. Owner: Task 6 test.

---

## File Structure

```
migrations/0003_village.sql                     players.joined_at index (DO holds village data)
wrangler.jsonc                                  + durable_objects binding VILLAGE, migrations tag v1 new_sqlite_classes ["VillageDO"]
src/shared/village/
  types.ts        VillageState, Member, Offer, Request, JointOrder, JointPart, NewsItem, GuestbookEntry, VillageAction
  specialties.ts  SPECIALTIES, assignSpecialty(), shopPrice(state, material)
  trade.ts        validate/apply postOffer, cancelOffer, acceptOffer, gift, postRequest, removeRequest (pure, on {village, workshops})
  joint.ts        JOINT_TEMPLATES, generateJointOrder(), contribute(), isComplete(), payout()
  buildings.ts    BUILDINGS, buildingEffects(state)
  decor.ts        DECOR items (German names), placeDecor action rules
  goodsTransfer.ts exportStack()/importStack(): carry design snapshots across workshops
src/shared/types.ts       + GameState.village, decor, decorPlaced; Design.origin?
src/shared/state.ts       SCHEMA_VERSION 2 + migrate v1→v2
src/shared/actions.ts     + placeDecor, removeDecor (solo actions)
src/shared/advance.ts     + specialty trickle, help-boost speed
src/shared/production.ts  + help boost multiplier
src/shared/market.ts      + market-hall price bonus
src/worker/village.ts     VillageDO class + routes (/api/village, /api/village/action, /api/village/visit/:id)
src/worker/index.ts       export VillageDO, route /api/village*
src/worker/auth.ts        found/join → notify DO (member joined, specialty assigned)
src/client/villageStore.ts village signal, loadVillage(), villageDispatch(), polling while open
src/client/art/village/VillageMap.tsx, House.tsx, Buildings.tsx   map art
src/client/art/workshop/Decor.tsx                                   decor items drawn in the room
src/client/panels/village/VillagePanel.tsx (map + tabs), JointOrdersPanel.tsx, TradePanel.tsx, GiftPanel.tsx, VisitView.tsx, GuestbookPanel.tsx, DecorPanel.tsx
test/shared/village/*.test.ts, test/worker/village.test.ts, test/client/village.test.tsx, test/e2e/village-smoke.mjs
```

---

### Task 1: Schema v2, specialties and village effects inside the solo simulation

**Files:**
- Create: `src/shared/village/specialties.ts`, `src/shared/village/buildings.ts`, `src/shared/village/decor.ts`
- Modify: `src/shared/types.ts`, `src/shared/state.ts`, `src/shared/advance.ts`, `src/shared/production.ts`, `src/shared/market.ts`, `src/shared/actions.ts` (`buyMaterial` uses `shopPrice`; new `placeDecor` / `removeDecor`)
- Test: `test/shared/village/specialties.test.ts`, `test/shared/village/effects.test.ts`, extend `test/shared/state.test.ts`

**Interfaces:**
- Produces in `types.ts`:

```ts
export interface VillageSnapshot {
  villageId: string;
  specialty: string | null;          // material id, e.g. 'kupferoxid'
  buildings: string[];               // ids from BUILDINGS
  helpBoostUntil: number;            // ×1.25 speed while now < this
  trickleCarry: number;              // fractional specialty units carried between advances
}
export interface GameState { /* … */ village: VillageSnapshot | null; decor: string[]; decorPlaced: string[] }
export interface Design { /* … */ origin?: { playerName: string; makerMark: MakerMark } }   // foreign (gifted) design snapshot
```

- `SCHEMA_VERSION = 2`. `migrateState` upgrades v1 by adding `village: null, decor: [], decorPlaced: []`. Test with a stored v1 JSON fixture.
- `specialties.ts`:
  - `SPECIALTIES: Record<string, { material: string; name: string; yieldPerHour: number }>`. Five entries:
    - `ton` (Rote Tongrube): 40/h
    - `eisenoxid` (Eisenerz): 6/h
    - `kupferoxid` (Kupfermine): 5/h
    - `kobalt` (Kobaltader): 3/h
    - `holz` (Buchenwald): 30/h
  - `assignSpecialty(taken: string[], seed: number): string` returns the least-taken specialty, with ties broken by seed.
  - `shopPrice(state, material): number`:
    - your own specialty costs `ceil(base × 0.3)`
    - a colourant or `holz` that isn't your specialty, while you're in a village of ≥ 2, costs `base × 2`
    - otherwise `base`
  - `villageStorePrice(material) = base × 3` (always available; used by joint orders).
- `advance` adds the specialty trickle. Over each processed interval it adds `floor(trickleCarry + yieldPerHour × Δh)` units of the specialty material and keeps the fraction in `trickleCarry`. The trickle must be path-independent: run it inside the event loop next to `sell`.
- `production.stationSpeed` multiplies by `1.25` while `now < state.village.helpBoostUntil`.
- `buildings.ts`: `BUILDINGS: Record<string, { name; description; effect }>`:
  - `tongrube`: clay `shopPrice` ×0.8
  - `markthalle`: stall price factor 0.8 → 0.9
  - `glasurbibliothek`: experiments cost 1 glasurbasis less, and every undiscovered effect's hint is shown as "fast entdeckt"
  - `gildenhaus`: joint-order payouts +20 %
- `decor.ts`:
  - `DECOR: Record<string, { name; slotHint: 'wall' | 'floor' | 'window' }>` with at least 8 items: `wimpelkette`, `blumenkasten`, `vogelhaus`, `laterne`, `teppich-blau`, `grosse-vase`, `wandteller`, `hängekorb`.
  - Actions:
    - `{type:'placeDecor', id}`: must be owned and not yet placed; at most 4 placed.
    - `{type:'removeDecor', id}`.

- [ ] **Step 1: Write the failing tests.**
  - v1 → v2 migration.
  - `assignSpecialty(['ton','ton','holz'], s)` never returns `ton`.
  - `shopPrice` for your own specialty is cheap; for a foreign colourant in a 2-player village it is ×2; in a solo game (`village` null) it is base.
  - 6 h of trickle gives `ton` +240 (±1). One-shot vs 10-minute steps are equal.
  - The help boost shortens `stageDurationMs` by a factor of 1.25.
  - `markthalle` raises stall income by 12.5 % (±0.5 %).
  - `placeDecor`: rejects unowned items, rejects a fifth item, accepts an owned one.
- [ ] **Step 2:** Run `npx vitest run test/shared`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run check`. Expected: all PASS. The Plan 1 pacing test must still pass, because solo games have `village: null` and their prices are unchanged.
- [ ] **Step 5:** Commit with the message `feat(shared): schema v2 — specialties, village buildings, decor, help boost`.

### Task 2: Village state types and village actions (pure)

**Files:**
- Create: `src/shared/village/types.ts`
- Test: `test/shared/village/types.test.ts`

**Interfaces:**

```ts
export interface Member { playerId: string; name: string; avatarSeed: number; makerMark: MakerMark; specialty: string; joinedAt: number; lastSeen: number; houseSlot: number }
export type Give = { kind: 'material'; material: string; count: number } | { kind: 'goods'; stack: TransferStack } | { kind: 'taler'; amount: number };
export interface Offer { id: string; from: string; give: Give; want: Give; createdAt: number }
export interface RequestNote { id: string; from: string; material: string; count: number; createdAt: number }
export interface JointPart { kind: 'goods'; form: string; count: number; minQuality: 1 | 2 | 3; colorFamily?: string; effect?: string } | { kind: 'material'; material: string; count: number }
export interface JointOrder { id: string; templateId: string; title: string; client: string; parts: (JointPart & { filled: number })[]; contributions: Record<string, number /* value points */>; createdAt: number }
export interface NewsItem { id: string; at: number; text: string; for?: string /* playerId or everyone */ }
export interface GuestbookEntry { from: string; fromName: string; sticker: string; at: number }
export interface VillageState {
  schemaVersion: 1; version: number; villageId: string; name: string; nextId: number; rng: number;
  members: Member[]; offers: Offer[]; requests: RequestNote[]; jointOrders: JointOrder[]; completedJoint: number;
  buildings: string[]; buildingProgress: Record<string, number>; news: NewsItem[];
  guestbooks: Record<string, GuestbookEntry[]>; helpsGiven: Record<string, number /* key `${helper}>${target}@${day}` */>;
}
export type VillageAction =
  | { type: 'postOffer'; give: Give; want: Give } | { type: 'cancelOffer'; offerId: string } | { type: 'acceptOffer'; offerId: string }
  | { type: 'gift'; to: string; give: Give }
  | { type: 'postRequest'; material: string; count: number } | { type: 'removeRequest'; requestId: string }
  | { type: 'contribute'; jointId: string; part: number; count: number; source: 'own' | 'store'; goods?: TransferStack }
  | { type: 'help'; target: string; sticker: string };
export const STICKERS = ['herz', 'stern', 'blume', 'daumen', 'katze', 'vase'] as const;
```

- `newVillage(villageId, name, seed)`.
- `addMember(v, member)` assigns a `houseSlot` (0–5) and the specialty via `assignSpecialty`.
- `validateVillageAction(v, actorId, a): string | null` checks structure only: ids exist, own-property keys, integer bounds, caps.
- [ ] **Step 1: Write the failing tests:**
  - `addMember` gives a 2nd member a different specialty and a different house.
  - A 7th member is rejected with "Das Dorf ist voll (höchstens 6)", per spec 2–6.
  - `validateVillageAction` rejects `__proto__` materials, negative counts, and a `help` with an unknown sticker or on yourself.
- [ ] **Step 2:** Run `npx vitest run test/shared/village`. Expected: FAIL. Then implement until they pass.
- [ ] **Step 3:** Commit with the message `feat(shared): village state and action validation`.

### Task 3: Trades, gifts, requests and cross-workshop goods (pure)

**Files:**
- Create: `src/shared/village/goodsTransfer.ts`, `src/shared/village/trade.ts`
- Test: `test/shared/village/trade.test.ts`

**Interfaces:**
- `TransferStack = { design: Design; quality: 1|2|3; effect: string | null; count: number; makerName: string; makerMark: MakerMark }`.
- `exportStack(state, designId, quality, effect, count, makerName): TransferStack | string` returns a German error if the stack doesn't exist.
- `importStack(state, t): void` adds the goods. It finds or creates a foreign design copy with `origin` set and id `f:<hash of design json + maker>`, reusing an identical copy if one exists.
  - Foreign designs are excluded from studio and production pickers and from `MAX_DESIGNS`.
  - `saveDesign` / `setStanding` / `queueBatch` reject ids that start with `f:`.
- `take(state, give): string | null` removes a give from a workshop (materials, goods via `exportStack`, or Taler) and returns a German error if there isn't enough. `put(state, give): void` adds one.
- Trade transitions are pure and take `{ v: VillageState; actor: GameState }`, returning the new `v`, the new `actor` and `deliveries: { to: string; give: Give; note: string }[]`, or an error:
  - `postOffer`: takes `give` from the actor into escrow.
  - `cancelOffer`: returns the escrow to the poster (only the poster may cancel).
  - `acceptOffer`: the acceptor pays `want` and gets the escrowed `give`; a delivery of `want` goes to the poster.
  - `gift`: takes from the actor; a delivery goes to the recipient.
  - `postRequest` / `removeRequest`.
- News entries in German, for example "Anna hat dir 10 Holz geschenkt".
- [ ] **Step 1: Write the failing tests:**
  - **Conservation:** for random sequences of post, accept, cancel and gift, the sum of materials, goods counts and Taler over all workshops plus escrow stays the same.
  - You can't accept your own offer.
  - A cancelled offer can't be accepted.
  - **Review Focus 3:**
    - A gifted stack appears in the recipient's goods.
    - Its design has `origin.playerName === 'Anna'`.
    - `pieceValue` works.
    - Delivering it to a matching order works.
    - It is absent from the `ownDesigns(state)` helper.
    - `saveDesign` with an `f:` id is rejected.
- [ ] **Step 2:** Run `npx vitest run test/shared/village/trade.test.ts`. Expected: FAIL. Then implement until it passes.
- [ ] **Step 3:** Commit with the message `feat(shared): trades, gifts, requests with escrow and foreign designs`.

### Task 4: Joint orders and buildings (pure)

**Files:**
- Create: `src/shared/village/joint.ts`
- Modify: `src/shared/village/buildings.ts`
- Test: `test/shared/village/joint.test.ts`

**Interfaces:**
- `JOINT_TEMPLATES` (at least 6, German). Each has a title, a client, parts drawn from at least 2 different specialties, a reward and a building contribution. Example:
  - "Hochzeitsgeschirr für die Müllerstochter", client "Familie Mahlzahn"
  - Parts: 24 Teller in Blau (min quality 2), 24 Becher, 40 Kobalt, 60 Brennholz
  - Reward: 900 Taler, 60 Ruf, decor `wandteller`, building progress `gildenhaus` +1
  - Templates only use forms unlocked in Plan 1.
- `generateJointOrder(v, seed): JointOrder`. Part sizes scale with the member count: `ceil(base × (0.6 + 0.2 × members))`.
- `contribute(v, actor, a): { v; actor } | error`:
  - `source: 'own'` takes from the actor's workshop.
  - `source: 'store'` (materials only) costs the actor `villageStorePrice × count` Taler, so the village is never blocked.
  - Value points are `pieceValue` or the material base price × count, credited to the actor.
- `isComplete(o)`: every part filled **and** `Object.keys(contributions).length >= 2`.
- `payout(v, o): { to: string; give: Give[]; decor: string[] }[]` for **all members**:
  - 40 % of Taler and Ruf split equally (base share).
  - 60 % split by contribution points.
  - The decor reward goes to every member.
  - `gildenhaus` adds +20 %.
- Completion adds building progress. 2 progress points build a building:
  - order: `tongrube`, `markthalle`, `glasurbibliothek`, `gildenhaus`
  - it's added to `v.buildings`, with news "Das Dorf hat jetzt eine Markthalle!"
- A new joint order is generated whenever fewer than 2 are open **and** the village has ≥ 2 members.
- [ ] **Step 1: Write the failing tests:**
  - A 1-member village has no joint orders.
  - All parts filled by one player: not complete.
  - Filled by two players: complete.
  - **Review Focus 4:** a member who never contributed gets ≥ 40 % ÷ members of the Taler.
  - Store purchase covers a material part without any specialty holder present.
  - Payouts sum to the template reward (±1 rounding).
  - The second completion builds `tongrube`.
- [ ] **Step 2:** Run `npx vitest run test/shared/village/joint.test.ts`. Expected: FAIL. Then implement until it passes.
- [ ] **Step 3:** Commit with the message `feat(shared): joint orders, payouts, village buildings`.

### Task 5: Help and guestbook (pure)

**Files:**
- Modify: `src/shared/village/trade.ts` (or create `src/shared/village/help.ts`)
- Test: `test/shared/village/help.test.ts`

**Interfaces:**
- `help(v, helperId, target: GameState, sticker, now)`:
  - Extends `target.village.helpBoostUntil` to `max(now, current) + 15 min`, capped at `now + 60 min`.
  - Adds a guestbook entry (cap 50, oldest dropped) and news for the target ("Ben hat dir geholfen 🌼").
  - Counts `helpsGiven[`${helper}>${target}@${dayIndex(now)}`]`. More than 3 per day returns "Für heute hast du genug geholfen – morgen wieder!".
  - The helper gets +1 Ruf. This is applied to the helper's workshop as a delivery.
- [ ] **Step 1: Write the failing tests:**
  - The boost extends and caps at 60 min.
  - The 4th help in one day is rejected; the next day it's allowed again.
  - You can't help yourself.
  - The guestbook keeps 50 entries.
- [ ] **Step 2:** Run the tests (expected FAIL), implement, run again (expected PASS).
- [ ] **Step 3:** Commit with the message `feat(shared): helping hands and guestbook`.

### Task 6: VillageDO and village API

**Files:**
- Create: `src/worker/village.ts`, `migrations/0003_village.sql`
- Modify: `wrangler.jsonc`, `src/worker/index.ts`, `src/worker/auth.ts`, `vitest.workers.config.ts` (DO bindings for tests)
- Test: `test/worker/village.test.ts`

**Interfaces:**
- `wrangler.jsonc`:
  - `"durable_objects": { "bindings": [{ "name": "VILLAGE", "class_name": "VillageDO" }] }`
  - `"migrations": [{ "tag": "v1", "new_sqlite_classes": ["VillageDO"] }]`
  - `Env` gains `VILLAGE: DurableObjectNamespace`.
- `VillageDO`:
  - Holds `VillageState` in `ctx.storage` under the key `'state'`.
  - Methods (RPC): `init(villageId, name)`, `join(member)`, `view(playerId)`, `act(playerId, action, now)`, `visit(viewerId, targetId)`.
- `act` sequence:
  1. Load the actor's workshop.
  2. Catch it up with `advance(…, CATCHUP_EVENTS)`. If the catch-up isn't finished, return 409 `catchingUp`.
  3. Apply the pure transition.
  4. Save the actor's workshop conditionally. On a version conflict, reload once and re-apply; if it still conflicts, return 409.
  5. Persist the village document.
  6. Run deliveries: read, `put`, conditional save, retrying up to 8 times. Deliveries are additive, so a retry can't double-count, because each attempt starts from a fresh read.
  7. Return `{ village: view, state: actorState }`.
- Snapshot sync: whenever buildings or a member's specialty change, the DO writes `state.village` into every member's workshop, using the same delivery mechanism with a `kind: 'snapshot'` delivery.
- Routes (all require a session; the DO stub comes from `env.VILLAGE.idFromName(villageId)`):
  - `GET /api/village` returns `{ village: VillageView, serverNow }`. `VillageView` is the state minus other players' guestbooks and minus `helpsGiven`.
  - `POST /api/village/action { action, version }` returns `{ village, state, events, serverNow }`, or 400 / 409.
  - `GET /api/village/visit/:playerId` returns `{ state, member }` only if the target is in the caller's village; otherwise 404.
- `handleFound` / `handleJoin` call `init` / `join` after the D1 insert, then write the member's `village` snapshot into their new workshop.
- Existing Plan 1 players (no DO yet) get it lazily: `GET /api/village` calls `init` + `join` for every D1 member of the village if the DO is empty.
- [ ] **Step 1: Write the failing tests:**
  - Founding plus joining gives two members with different specialties, and both workshops have `village.specialty`.
  - Gift: B's materials increase, A's decrease.
  - **Review Focus 1:** two simultaneous `acceptOffer` calls give one 200 and one 400 "Dieses Angebot ist schon weg", and the escrow is delivered once.
  - **Review Focus 2:** B posts a solo action while A's gift to B is in flight. Both effects are present afterwards.
  - **Review Focus 5:**
    - Visiting a player in another village returns 404.
    - Visiting an unknown id returns 404.
    - A visit returns no `password`, `pw_hash` or session data.
  - A joint order completes with contributions from A and B; C (who never logged in after joining) has received the base Taler.
  - A 7th join returns 409 "Das Dorf ist voll".
- [ ] **Step 2:** Run `npm run test:worker`. Expected: FAIL. Then implement until it passes.
- [ ] **Step 3:** Run `npm run test:worker && npm test && npm run check`. Expected: all PASS.
- [ ] **Step 4:** Commit with the message `feat(worker): VillageDO, village API, specialty assignment on join`.

### Task 7: Village map art — REVIEW GATE 4

**Files:**
- Create: `src/client/art/village/VillageMap.tsx`, `src/client/art/village/House.tsx`, `src/client/art/village/Buildings.tsx`, and a dev route `/#village` with a mock village
- Test: `test/client/villagemap.test.tsx`

**Interfaces:**
- `<VillageMap village={VillageView} meId={string} onHouse={(playerId) => void} onBuilding={(id) => void} />`. The viewBox is 1200×760, drawn top-down-ish in B2 style:
  - meadow ground with path texture, a winding path, a stream with a small bridge, trees and bushes, fences, sheep
  - the village square with a well in the centre
- 6 house plots around the square:
  - Each member's house is a hand-drawn cottage. Roof colour comes from the member's `makerMark.color`, the maker's-mark emblem hangs over the door, the chimney smokes if the member was seen in the last hour, and the avatar `<Character>` stands by the door with the name on a little sign.
  - The specialty shows as a yard prop: clay heap, ore cart, copper pot, cobalt crystals, or a woodpile.
  - Empty plots show a "Zu verkaufen" signpost.
- Buildings appear on their own plots once built: Tongrube, Markthalle, Glasurbibliothek, Gildenhaus. Unbuilt ones show a faint dashed outline with a construction sign showing progress `x/2`.
- A notice board by the well shows the counts of open offers and requests.
- [ ] **Step 1: Write the test:** rendering a mock village with 3 members gives 3 `data-house` elements plus 3 empty plots, built buildings have `data-building` attributes, and the markup contains no `NaN` or `undefined`.
- [ ] **Step 2:** Run `npx vitest run test/client/villagemap.test.tsx`. Expected: FAIL. Then implement until it passes.
- [ ] **Step 3:** Take screenshots: `npm run shot -- "http://localhost:5173/#village" village`. Check the phone shot for overflow.
- [ ] **Step 4:** **REVIEW GATE:** show the owner `docs/screens/village-desktop.png`. If the owner is away, self-review against the B2 reference and list the screenshot for approval.
- [ ] **Step 5:** Commit with the message `feat(client): hand-drawn village map`.

### Task 8: Village client — store, panel shell, visits, guestbook

**Files:**
- Create: `src/client/villageStore.ts`, `src/client/panels/village/VillagePanel.tsx`, `src/client/panels/village/VisitView.tsx`, `src/client/panels/village/GuestbookPanel.tsx`
- Modify: `src/client/api.ts`, `src/client/screens/GameScreen.tsx` (new toolbar tool "Dorf", with an unread-news badge), `src/client/panels/PanelHost.tsx` (`PanelId` adds `'village'`)
- Test: `test/client/village.test.tsx`

**Interfaces:**
- `villageStore.ts`:
  - `village = signal<VillageView | null>`
  - `loadVillage()`
  - `villageDispatch(a: VillageAction)`: posts, adopts the returned `village` and the actor `state` into `serverState`, shows events as toasts, and handles a 409 by `loadState()` then one retry
  - `startVillagePolling()`: 60 s while the panel is open or the tab is visible
  - `unreadNews = computed(...)`, counting news for me or everyone newer than the `localStorage` `mf_news_seen`
- `VillagePanel`: a full-screen sheet with `<VillageMap>` on top and tabs **Großaufträge · Tauschbrett · Geschenke · Gästebuch · Neuigkeiten**.
  - Clicking a house opens `VisitView`.
- `VisitView`:
  - The friend's `WorkshopScene`, read-only (no `onStation`).
  - Their designs as a gallery.
  - "Mit anpacken" (help) with a sticker picker, disabled with a reason when the daily limit is reached.
  - Their guestbook.
- [ ] **Step 1: Write the tests** with mocked fetch:
  - `villageDispatch` adopts both `village` and `state`.
  - `unreadNews` counts only newer news.
  - `VisitView` renders without station click handlers (`data-readonly`).
- [ ] **Step 2:** Run the tests (expected FAIL), implement, run again (expected PASS).
- [ ] **Step 3:** Commit with the message `feat(client): village panel, visits, helping hands, guestbook`.

### Task 9: Village client — trading board, gifts, requests, joint orders, decor

**Files:**
- Create: `src/client/panels/village/TradePanel.tsx`, `src/client/panels/village/GiftPanel.tsx`, `src/client/panels/village/JointOrdersPanel.tsx`, `src/client/panels/village/DecorPanel.tsx`, `src/client/art/workshop/Decor.tsx`
- Modify: `src/client/art/workshop/Room.tsx` (renders `decorPlaced`), `src/client/panels/StationPanel.tsx` (the Werkstatt panel gets a "Dekoration" section), `src/client/panels/ShopPanel.tsx` (shows specialty and foreign prices, "Deine Spezialität!")
- Test: `test/client/village-panels.test.tsx`

**Interfaces:**
- **TradePanel:**
  - Offer cards show give → want with material swatches or pot thumbnails, the poster's avatar, and "Annehmen" (disabled with a reason if you can't pay).
  - A "Neues Angebot" form has two pickers (give and want) and a count.
  - My offers have "Zurückziehen".
  - Requests ("Ich brauche 10 Holz") have a one-tap "Schenken" if you have enough.
- **GiftPanel:** pick a friend (avatars), then materials or shelf goods, then a count, then "Schenken". The recipient's shelf shows the sender's design and maker's mark.
- **JointOrdersPanel:**
  - Each joint order is a big paper card: client portrait, title, parts with progress bars and contributor portraits.
  - Each part has "Beisteuern" with `own` stock or `store` (3× price, with an explanation).
  - The note "Nur gemeinsam: mindestens zwei Leute müssen beitragen".
  - On completion: a celebration modal listing every member's share.
- **DecorPanel:** owned decor as cards; place up to 4. `Room` draws placed items in fixed decor spots (wall shelf, window box, floor corner, ceiling hook).
- [ ] **Step 1: Write the tests:**
  - The "Annehmen" button is disabled when the actor lacks `want`.
  - The joint part shows "Im Dorfladen kaufen (3×)" only for material parts.
  - `Room` with `decorPlaced: ['laterne']` contains `data-decor="laterne"`.
- [ ] **Step 2:** Run the tests (expected FAIL), implement, run again (expected PASS).
- [ ] **Step 3:** Take screenshots of each panel at desktop and phone size and check them.
- [ ] **Step 4:** Commit with the message `feat(client): trading board, gifts, joint orders, decor`.

### Task 10: Village onboarding, news, end-to-end

**Files:**
- Modify: `src/client/panels/Onboarding.tsx`, `src/client/panels/AwaySummary.tsx`
- Create: `test/e2e/village-smoke.mjs`
- Modify: `README.md`

**Interfaces:**
- After the 8 solo steps, Greta adds two village steps, which complete from the village view:
  - 9: "Schau ins Dorf – wer wohnt schon da?" (open the village)
  - 10: "Schenk jemandem etwas oder hilf mit anpacken" (any gift or help given)
  - In a 1-member village, step 9 says "Lade Freunde ein!" and shows the invite link.
- `AwaySummary` also lists village news for me since the last visit: gifts received, helps, completed joint orders with my share, new buildings.
- `village-smoke.mjs`:
  1. A founds a village; B joins via the link.
  2. B and A each see a different specialty.
  3. A gifts B 5 Ton.
  4. B posts an offer; A accepts it.
  5. A helps B.
  6. A and B contribute to a joint order until it completes (store purchases where needed, plus `/api/dev/warp` to produce goods).
  7. Both get the payout.
  8. Take screenshots of the village map and B's shelf with A's gifted pieces.
- [ ] **Step 1:** Write the onboarding and summary tests (step 9 completes when `villageVisited`; the summary renders gift news). Run them (expected FAIL), implement, run again (expected PASS).
- [ ] **Step 2:** Run `npm test && npm run test:worker && npm run check`. Expected: all PASS.
- [ ] **Step 3:** Run `node test/e2e/village-smoke.mjs http://localhost:5173`. Expected: "VILLAGE SMOKE OK".
- [ ] **Step 4:** Commit with the message `feat: village onboarding, news, e2e`. Ask the owner before pushing.
