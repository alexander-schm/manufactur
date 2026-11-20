# Manufaktur — Village Long Goals

Date: 2026-11-21
Builds on: `2026-11-07-manufaktur-design.md` (§5.4–5.6) and `2026-11-21-branches-and-long-goals-design.md` (solo endgame, built first)

## 1. Intent and the why

The village runs into the same dead end as the solo game. After 8 completed joint orders, all 4 buildings (Tongrube, Markthalle, Glasurbibliothek, Gildenhaus) are built, and nothing comes after that. The owner wants long-shot goals both solo and together. This project gives the village weeks-long shared goals that visibly change the map, and it ties them to the new branches (stoneware, porcelain, tiles, masterworks).

## 2. Goals, non-goals, anti-goals

**Goals**
- A shared long goal the village can see growing on the map.
- Collaboration that is clearly rewarded: more people, better results. The original rule still holds: "only possible together", but never blocked by absent friends.
- A use for the new solo content (stoneware, porcelain, tiles, masterworks) in the village.
- A Taler sink for rich players that can't be used to buy the whole village goal alone.

**Non-goals**
- Chat, real-time play, voting rounds that wait on people.
- New village currencies. "Goodwill" from the original spec stays unbuilt.
- Interaction between villages.

**Anti-goals**
- **One rich player finishes everything alone.**
- **Absent players block or lose anything.** All rules of original spec §5.4 apply.
- **Waiting on others.** No step ever needs a specific person to act.

## 3. Constraints

- Village state lives in the `VillageDO` Durable Object (`src/worker/village.ts`), with serialised updates, an outbox of exactly-once deliveries to workshops (`WorkshopDelta`), and alarms. New village features follow the same pattern: logic in `src/shared/village/`, deliveries via the outbox.
- `VillageState.schemaVersion` 1 → 2 with a migration. Existing villages keep everything.
- The village must work for 2–6 members, and do something sensible for a village of 1, where joint content waits as today.

## 4. Approaches

The user had already said yes to both pieces (great kiln and grand projects) when the options were outlined, and dropping either works against "long goals, together". The approach is therefore both, data-driven, plus continuing joint orders. A greater variety of joint orders alone was considered and rejected: it is more of what players already have.

## 5. Design

### 5.1 The great kiln (Gemeinschaftsofen)

- **A new village building.** It appears on the map once any member has reached the Manufaktur tier. *(Builder's call: it needs stoneware-level heat in the story, and early villages already have enough to do.)*
- **Loading.** A member picks one of their own designs and a count, up to a per-member share of the kiln's capacity. They pay the materials for those pieces plus wood (fuel) up front. The pieces skip the personal production line; they are "thrown for the great kiln". *(Builder's call: interleaving with the personal pipeline would add a lot of complexity for no player-visible benefit.)*
- **Firing.** It fires when full, or 24 hours after the first piece went in. The firing is scheduled with a DO alarm, so nobody needs to be online. Firing duration is about 2 hours, shown on the map with smoke and glow.
- **Heat.** It scales with the number of distinct contributors and the total wood loaded. Higher heat means better odds of rare effects and better quality.
- **Results.** Each piece rolls for an effect from a great-kiln-only set:
  - **Ascheglasur** (ash glaze)
  - **Flammenspur** (flashing)
  - **Ascheanflug** (natural ash deposit)

  These are new `EffectDef`s that experiments can never produce. Pieces return to each contributor's shelf through the outbox with their effect. They count in the collection book (adds a "Gemeinschaftsofen" column to every body page) and in masterwork criteria.
- **One contributor can fire alone** (nobody is blocked), but heat and odds are low. Three or more contributors make legendary results likely.
- The village news reports every firing and its best piece.

### 5.2 Grand building projects (Großbauprojekte)

- **Data-driven list.** Content in `src/shared/village/projects.ts`. Each project has **3–5 stages**. Each stage has several parts, like joint-order parts, but larger, and they deliberately span branches: tiles, stoneware pieces, porcelain pieces, masterworks, materials.
- **Starting set:**

  | Project | Lasting benefit |
  |---|---|
  | **Dorfbrunnen** (tiled fountain) | A daily small Ruf trickle for every member |
  | **Glockenturm** (bell tower) | A weekly village event: a "market day" when stalls sell at a much better price for a few hours |
  | **Museum** | Displays every member's masterworks; visitors can view them |
  | **Kaolingrube** (kaolin pit) | A village-wide perk: kaolin costs everyone much less in the shop. It is *not* added to `SPECIALTIES` and no member holds it. Connects to porcelain |
  | **Rathaus** (town hall) | Unlocks larger and better-paying joint orders; the map's centrepiece |

- **Visibility.** Each stage changes the map visibly (scaffolding, then partly built, then finished), so the history of the village shows.
- **Choosing.** One project is active at a time. When none is active, the village is offered two. The **first contribution** picks one, so nobody waits on a vote. *(Builder's call.)*
- **Taler cap.** At most one part per stage may be paid in Taler. It is a big Taler part, a sink for rich players, but they can't pay for the rest. *(Builder's call; answers the anti-goal.)*
- **Together.** A stage needs **at least two contributors** to complete, scaled down if fewer members are active, the same rule as joint orders. A part that needs a missing member's specialty can always be filled from the village store at the higher price.
- **Rewards on every stage.** Taler and Ruf, with a base share for **every** member (`BASE_SHARE`) plus a contribution share. Plus the lasting benefit when the project completes, and a cosmetic per project.
- **Pacing.** A whole project is about 1–3 weeks for an active village of 3.

### 5.3 Joint orders keep coming

- Joint orders continue after the 4 buildings exist. Completed orders count towards an ongoing village level instead of nothing.
- New templates that need stoneware, porcelain, tiles or great-kiln pieces appear once at least one member can make them. Earthenware templates stay in the pool.
- The `JointPart` goods type gains an optional `body` (hard requirement) and an optional `effect`.

### 5.4 Map

- New building spots: great kiln, the 5 project sites (shown as an empty plot with a sign until started).
- Existing `BUILDING_SPOTS` and the map size may need to grow. The phone layout must still work.
- Screenshot self-review for every new building and each construction stage.

### 5.5 Rules settled after the builder check (builder's calls)

- **Never stuck on a branch.** Every goods part that needs stoneware, porcelain or tiles accepts an **earthenware substitute at 3× the count** (same form where possible; for tiles, plates). It is the goods equivalent of the village store: always possible, much more expensive. A project is only *offered* once at least one member has reached the tier its parts need.
- **Active member:** `lastSeen` within the last 7 days.
- **Together:** a stage needs **two contributors**. If the village has fewer than 2 active members, stages wait, as joint orders do today (original spec §5.4), and solo progress is unaffected. No single player may give more than **70 % of a stage's value**, so token contributions can't carry it. The same rule also limits buying material parts from the village store.
- **Taler cap:** "one Taler part per stage" is a dedicated part kind `{ kind: 'taler', amount }`. The 70 % rule also covers village-store purchases, so no one can buy a stage alone.
- **Great kiln in a village of 1:** it exists and can fire with one person (low heat). It is not a "together" requirement, only rewarded by company.
- **After the five projects:** each project has **3 levels** (I, II, III). A completed project can be started again at the next level, with bigger stages, a stronger benefit and a new look on the map. That makes 15 project levels, many months, and the list is extensible as data.
- **Village level:** every completed joint order or project stage raises the village level. Each level gives +2 % to joint-order and project rewards (capped at +40 %), and every 5 levels add a small map decoration (flower beds, lanterns, a maypole…). It is shown on the map sign.
- **Masterworks in projects are lent, not used up.** The part kind `{ kind: 'masterwork', count, minPrestige }` counts each masterwork once forever, and it stays on the player's plinth and in the museum.

## 6. Delivery order

After the solo project's step 1 (stoneware and masterworks exist):

1. Joint orders continue, plus body and effect parts
2. Great kiln
3. Grand projects, with the kaolin pit last, after porcelain exists

## 7. Left to the builder

- All numbers: kiln capacity, member share, heat formula, effect odds, stage sizes, rewards, the market-day schedule.
- Exact stage contents per project, within §5.2.
- Map layout and building art.
- Tests: unit tests for the shared village logic (loading, firing, effect rolls, project choice, Taler cap, minimum contributors, rewards to absent members, migration), worker tests for the DO alarm firing and the outbox deliveries, and extending `test/e2e/village-smoke.mjs`.
