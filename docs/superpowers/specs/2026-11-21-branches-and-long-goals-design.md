# Manufaktur — Branches & Long Goals (solo endgame)

Date: 2026-11-21
Builds on: `2026-11-07-manufaktur-design.md` (§4.5 branches, §4.7 long term, §9 deferred items)

## 1. Intent and the why

Players who have every station at level 5 have nothing left to work towards. One player has 1.8 million Taler. They keep selling, and they buy clay 10,000 at a time by clicking, but there is nothing to aim for, nothing to discover and no decision to make. The last milestone fires at 72 Ruf, and all station upgrades together cost about 4,000 Taler.

This project gives the solo game a **long-shot goal**: weeks of play with new things to learn along the way and real trade-offs. It does this by building the branches and workshop tiers the original design planned, plus the collection book and masterworks.

It is the first of three projects. The other two are designed separately later: (2) the village long goal (great kiln, grand village project) and (3) small surprises (interactive cat, window visitors, curiosity album).

## 2. Goals, non-goals, anti-goals

**Goals**
- Something big and expensive to save for. Taler means something again.
- New things to discover in every tier: a clay body, forms, effects, customers.
- Real decisions. Which clay body suits a design? Is a slow, valuable porcelain batch worth the kiln time? Which masterwork commission do I take?
- A completionist goal (collection book) and a show-off goal (masterworks).
- No more click-grinding for materials.

**Non-goals (this project)**
- Communal great kiln, grand village project, kaolin as a village specialty. These belong to project 2.
- Interactive cat, window visitors, curiosity album. These belong to project 3.
- A third room, or further branches (glass, enamel).
- Seasons or resets.

**Anti-goals**
- **Devaluing what players have.** Existing designs, glazes, effects and goods keep working and keep their value. Earthenware stays a viable, fast choice and is never made obsolete.
- **Forcing casual players.** Everything works without understanding the new systems. Defaults and suggestions exist for clay body and masterworks.
- **Grind.** Progress comes from decisions and discovery, not repetition. No "make 10,000 cups" goals.
- **Punishing absence.** No decay, no expiring commissions, nothing lost while away.
- Art below the "cute and nice" bar (original spec §7).

## 3. Constraints

- Same stack and rules as the original spec: shared deterministic logic in `src/shared/`, server-authoritative, catch-up simulation, all text German in content data, everything drawn in code.
- **Save migration:** `SCHEMA_VERSION` 2 → 3 in `migrateState`. Existing states must load with no loss.
- Catch-up loop performance: anything added to `advance` (auto-restock, collection recording) must stay cheap. Plain arrays, as in `market.ts`.
- Phones and desktops.

## 4. Approaches considered

- **A. Real branches (chosen).** Add a clay body to every design and glaze, expensive workshop tiers that unlock stoneware and then porcelain, new station levels, forms, effects and customers, plus the collection book, masterworks and bulk buying. Most work, and the only option that adds new things to learn rather than bigger numbers.
- **B. Tiers without branches.** Expensive tiers, station levels 6–10, a few forms and effects, no clay body. About half the work, but mostly bigger numbers, which is the boredom the player already has.
- **C. Goals only.** Collection book, masterworks and a longer milestone ladder over today's content. Fastest, but 5 forms × 5 effects fills in a week and there is nothing new to discover.

The user chose **A**, delivered in two playable steps: **Step 1, Manufaktur and stoneware**, complete on its own. **Step 2, Hofmanufaktur and porcelain.**

## 5. Design

### 5.1 Workshop tiers

`state.tier: 'werkstatt' | 'manufaktur' | 'hofmanufaktur'`. A tier is bought with a single action (`upgradeTier`) once both price and reputation are met. It is shown as a big, celebrated step: a new sign over the door and a celebration card.

| Tier | Price | Ruf | Unlocks |
|---|---|---|---|
| Werkstatt | — | — | today's game |
| Manufaktur | 50,000 Taler | 300 | stoneware, station levels 6–7, Teekanne form, new customers, masterworks |
| Hofmanufaktur | 500,000 Taler | 1000 | porcelain (kaolin becomes buyable), station level 8, Figur and Fliese forms, noble customers |

The numbers are starting points. The builder tunes them (see §7). *Builder's call:* Ruf is never spent, and station level 5 already needs 200 Ruf, so the gates sit above 200. Otherwise every endgame player would pass them on day one.

Station levels 6–8 extend each station's arrays (`piecesPerMinute`, `upgradeCost`, `rufRequired`, `capacity`) and additionally require the tier. Upgrade costs should grow steeply (roughly 8k, 30k, 120k) so they work as money sinks.

**Work bays (Arbeitsplätze), decided by the user:** advanced stations can work on more than one batch at a time, including batches of different designs. Today a non-kiln station holds exactly one running batch (`canStartOn` in `advance.ts`), and the kiln shares its capacity across batches.
- Prep bench, wheel, drying rack and glaze table get **2 bays at level 6** and **3 bays at level 8**. `StationDef` gains a `bays` array by level. `canStartOn` allows up to `bays` running batches.
- Each bay runs at the station's full speed. Assigned workers help every bay. *(Builder's call: the simplest rule, and a strong reward for the tier.)*
- The kiln keeps its shared-capacity model. Levels 6–8 raise capacity instead.
- The station panel and the scene show each bay's batch, for example two pots side by side on the wheel table.

### 5.2 Clay bodies

A new content table `BODIES` (data-driven, like `FORMS`):

| Body | Material | Needs | Value × | Difficulty + | Character |
|---|---|---|---|---|---|
| Irdenware (earthenware) | `ton` (existing) | — | 1.0 | 0 | quick, cheap, forgiving |
| Steinzeug (stoneware) | `steinzeugton` (new, buyable) | Manufaktur | 1.8 | +0.2 | glaze firing takes longer; must fire `hoch` |
| Porzellan (porcelain) | `kaolin` (existing, unlocked) | Hofmanufaktur | 3.2 | +0.5 | slow, quality is hard to reach; skilled workers matter |

- `Design.body` and `GlazeRecipe.body` are new fields. A design's glaze must match its body (enforced in `validateDesign`). Each body gets its own clear starter glaze when it unlocks.
- Experiments get a body choice. The test tile is fired on that body, so glazes are discovered per body. This is deliberate: it's a reason to experiment again.
- Body affects `pieceValue`, `designDifficultyOf` (time and quality), `batchMaterials` (body material instead of `ton`) and, for stoneware and porcelain, a longer glaze-firing duration. It does **not** add a failure or loss mechanic: lower quality is the only penalty.
- Existing effects keep matching on any body, so nothing is devalued. **New effects require a specific body** (§5.3).

### 5.3 New effects (body-specific)

Added as `EffectDef` entries with a body condition, so they show up in hints like any other effect. A starting list, which the builder can adjust:

- **Steinzeug:** Ölfleck (oil spot: much iron, hot, slow cooling), Hasenfell (hare's fur: medium iron, reduction), Shino (matt base, no colourant, slow cooling), Salzglasur (needs new material `salz`).
- **Porzellan:** Blanc de Chine (opaque, no colourant), Blau-Weiß (transparent, a little cobalt), Ochsenblut (a richer copper red than Kupferrot: copper 3–5 %, reduction, slow), Eierschale (matt, hot, fast cooling: a translucent look).

Each has a Greta hint written in German. Value multipliers sit above the existing 1.4–2.2 range.

### 5.4 New forms

- **Teekanne** (Manufaktur): spout and lid, high value, high difficulty.
- **Figur** (Hofmanufaktur): a small animal figurine (cat, owl, hedgehog, chosen like a "silhouette preset"), not wheel-thrown, and a natural fit for porcelain.
- **Fliese** (Hofmanufaktur): a flat square tile, cheap per piece but ordered in large counts. It sets up village tile commissions in project 2.

These need new art in `Pot.tsx` / `potShape.ts` and go through a screenshot review gate before anything else builds on them.

### 5.5 Customers and orders

- New customer archetypes per tier, for example a tea master (Teekannen), a court confectioner (porcelain plates), and a duchess (porcelain figurines). Higher rewards.
- `Order` gains an optional `body`, and it is a **hard requirement**, like `form` (*builder's call*; as a mere taste, cheap earthenware could fill expensive orders). So `deliverOrder` validation, the stall's reserve for open orders (`sellableByForm` groups by form + body) and the order card all have to account for body. Orders that ask for stoneware or porcelain pay much more, and only appear once the player can make them.
- Order generation weights towards the player's current tier, while earthenware orders still appear.

### 5.6 Milestone ladder (continuing after 72 Ruf)

Extend `MILESTONES` with a long chain spread over weeks. Each step unlocks something small and visible: a pattern, a handle or rim style, a maker's-mark frame (new optional `MakerMark.frame`: a drawn ring around the mark wherever it is shown), a decor item, a new glaze colourant (for example `mangan`, purple-brown), or a customer. Kinds of triggers:

- Ruf 250 / 400 / 600 / 1000 / 1500 / 2500 (above the 200 that level 5 already requires)
- first stoneware piece, first porcelain piece
- first body-specific effect, all stoneware effects found
- collection book thresholds (25 / 50 / 75 / 100 %)
- first masterwork, masterworks of each prestige rank

No milestone counts raw repetition ("make N pieces") beyond the ones that already exist.

### 5.7 Collection book (Sammlung)

- Entries are **form × body × effect**, where "effect" includes *no effect*, limited to combinations that are actually possible. The builder derives the list from content data, so new content extends the book automatically.
- An entry is recorded the first time a finished piece of that combination comes out of the glaze firing. `state.collection: string[]` holds the keys. This is cheap to check inside `advance`.
- **Migration:** seed it from current `goods`, so existing players start with something filled in.
- **UI:** a book panel with one page per body. A grid of forms × effects shows found entries drawn with the `Pot` renderer and unfound ones as ink silhouettes with "?". Hovering or tapping an unfound entry shows nothing more than which tier it needs: no spoilers.
- **Rewards:** completing a whole row (one form in every effect for a body) or a whole column (one effect on every form) grants a small cosmetic: a pattern, frame or decor. Page percentages feed the milestones.

### 5.8 Masterworks (Meisterstücke)

The long-shot "show-off" goal, with decisions built in.

- Unlocked at Manufaktur. A **patron** (Gönner) offers a commission with **3–4 criteria**, for example "Porzellan · Vase · tall · Seladon · leaves pattern · quality ★★★". There is always exactly one open commission, it never expires, and it can be swapped for a new one at a small cost.
- The player picks one of their designs. The panel shows which criteria it meets, so the design studio becomes a puzzle. They then start the masterwork: a single piece with a high material and Taler cost (a money sink).
- **It goes through the normal workshop (decided by the user).** The masterwork is a `Batch` with `count: 1` and a `masterwork` flag. It goes through every stage like any batch, and at each station it occupies a whole bay for a long, fixed time (about 8–24 hours of game time in total, running offline). That is the trade-off: with one bay, normal production at that station waits. With work bays (§5.1), production carries on in the other bays.
  - In the kiln it takes a fixed share of the capacity (for example half), so the kiln keeps firing other batches.
  - `startWork` gives the masterwork priority for a free bay. Only one masterwork can be in progress at a time.
  - Its duration does not depend on workers or boosts, so it can't be rushed. *(Builder's call: otherwise the "how much production do I give up" decision disappears.)*
- **Outcome:** the piece is always made; it never fails. Its **prestige** (bronze / silver / gold) depends on how many criteria were met and the quality reached. It earns a big Taler and Ruf reward, plus a unique cosmetic for gold.
- Finished masterworks get a named plinth in the workshop scene and are visible to friends in the village visit view. Showing them on the village map is left to project 2.
- Commissions are generated from the player's discovered content, so they are always reachable, and they grow more demanding with each completed masterwork.

### 5.9 No more click-grinding

- **Shop:** buy amounts of +10 / +100 / +1000 and "auf 1000 auffüllen".
- **Vorrat halten (keep in stock):** per material, a target amount. When stock falls below it, the missing amount is bought automatically at the normal shop price, including during offline catch-up, and only while there's enough Taler. This generalises today's `standing.autoBuy`. Default: off. The Standing order's own auto-buy keeps working.

### 5.10 Art and UI

Every visual piece goes through a screenshot review with the owner (same gate as original spec §7):

1. new forms (Teekanne, Figur, Fliese) and body looks: earthenware warm red at the foot, stoneware speckled grey-brown, porcelain bright white with a slight glow
2. the tier sign over the door, kiln looks for levels 6–8, the masterwork plinth
3. the collection book page
4. the masterwork commission card

The design studio and the experiment panel get a body picker (three illustrated clay lumps). Locked bodies show what unlocks them.

## 6. Delivery

- **Step 1: Manufaktur and stoneware.** Tier system, bodies (earthenware and stoneware), station levels 6–7 with work bays, Teekanne, stoneware effects, new customers, the milestone ladder up to the Manufaktur range, collection book, masterworks, bulk buying and keep-in-stock, migration to schema 3. Playable and shippable on its own.
- **Step 2: Hofmanufaktur and porcelain.** Porcelain, kaolin, level 8 (third bay), Figur and Fliese, porcelain effects, noble customers, the rest of the ladder.

## 7. Left to the builder

- All exact numbers: tier prices, upgrade costs, value multipliers, durations, masterwork costs and rewards. Tune for the pacing goals: a mid-game player (all stations level 5, roughly 200–250 Ruf) should reach Manufaktur in a few days, and Hofmanufaktur should take a few weeks. The 1.8 million-Taler player can buy Manufaktur at once and is then gated by Ruf.
- The exact effect list, recipes and hint texts, within §5.3.
- The exact milestone list and rewards, within §5.6.
- Masterwork criteria generation.
- UI layout of the new panels, within the existing paper-UI kit.
- Tests: unit tests for all new shared logic (tier purchase, body validation, effect matching, collection recording, masterwork scoring, keep-in-stock in catch-up, migration), and updating the e2e smoke test.
