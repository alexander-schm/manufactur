# Manufaktur — Game Design

Date: 2026-11-07
Repo: https://github.com/alexander-schm/manufactur

## 1. Intent

A cozy, web-based management game in which each player owns a pottery **Manufaktur**. It is played by a closed circle of friends and family, each at their own pace, in a persistent village they share.

**All game text is in German**: UI, characters, orders, hints and recipe-book pages. This document is in English for convenience only.

What a player should tell a friend after a week:

- *"It was interesting to discover everything."* There's always a new glaze, form, branch or village building just around the corner.
- *"I enjoyed doing things together with friends."* The biggest goals can only be reached together.
- *"I didn't need to log in at specific times."* The game runs while you're away and nobody waits on anybody.
- *"My manufaktur looks like mine."* Colours, forms, patterns, maker's mark and workshop decor make every player recognisable.
- Some players dig into every detail and some just play along, and **both** feel the game is for them.

## 2. Goals, non-goals, anti-goals

**Goals**
- Quick early progress: something new unlocks every few minutes in the first hour. Later progress is slower but always visible.
- Two depths of play over the same systems:
  - **Casual:** a check-in of 2–5 minutes collects goods, accepts a suggested order, queues production and leaves. Sensible auto-defaults everywhere.
  - **Optimizer:** recipe tuning, kiln settings, worker team synergies, design-for-taste, trade planning and village logistics.
- Collaboration that is **required** for the biggest content (joint orders, the communal kiln) and **richly rewarded** everywhere else.
- Deep customization of pieces and workshop, so every player has a distinct style.
- Hand-drawn, cute, characterful graphics (see §7).
- A persistent world that runs forever, with no seasons and no resets.

**Non-goals**
- Public sign-up, matchmaking, moderation or anti-cheat beyond basic server-side validation. This is a closed circle.
- Real-time multiplayer and chat. Everything is asynchronous; players use their existing chat apps to talk.
- Monetisation and ads.
- Native mobile apps. The game is a responsive web app that must be playable on phones as well as desktops.

**Anti-goals** (a failure even if the game technically works)
- **Grind.** Progress must come from decisions, discovery and cooperation, never from repeating clicks. Avoid anything that rewards tapping the same button 50 times. Timers should be short early on and never require waking up at night.
- **Punishing absent friends.**
  - Nothing a friend fails to do may block or reduce another player's progress.
  - Joint orders must stay completable when someone is gone (see §5.4).
  - Absent players never lose stock, workers or reputation, and they get a welcome-back boost.
  - No decay mechanics.
- **Graphics that don't look cute and nice.** Generic UI, programmer art or faceless stick figures are a failure.

## 3. Constraints

- **Platform:** Cloudflare Workers (the user's choice).
  - Static frontend served by Workers Static Assets.
  - API in a Worker.
  - Persistence in D1 (SQLite).
  - Durable Objects where shared, contended state needs serialised updates: per-village state for joint orders, the communal kiln and the trading board.
- **Access, players and villages:**
  - A new player either **founds a village** (no code needed; they receive an invite code to share) or **joins** one with an invite code. Either way, they enter a display name and password. No email.
  - Each player belongs to **exactly one village**. The server may host several independent villages, but villages don't interact.
  - Leaving or switching villages is not part of the first release.
  - Villages are **small: 2–6 players**. Balance joint orders, specialties and the village map for that size.
- **Language:** German only. No i18n framework is needed, but keep texts in content data, not hard-coded in components.
- **Offline progress:** production is computed deterministically from timestamps when a player (or a friend's action) touches the workshop. No background ticking is required. Cron triggers are allowed for village-wide events.
- **Graphics:** everything is drawn in code (SVG, plus canvas where performance needs it) in the chosen style, so that player-designed pieces and procedurally varied characters can be rendered. No external image assets are required, though some may be added.

## 4. The player's Manufaktur

### 4.1 Production chain

Raw materials → **prepare** (wedging/mixing clay bodies) → **form** (wheel, hand-building, moulds) → **dry** → **bisque firing** → **glaze** → **glaze firing** → finished goods → **sell / deliver / gift / contribute**.

- Each step is a **station** placed in the workshop scene: wheel, drying rack, kiln, glaze table, and so on.
- Stations have levels and variants. For example, a wood kiln and an electric kiln behave differently: the wood kiln gives more varied, surprising results.
- Production is queued as **batches** of a chosen design. Workers move batches through the chain automatically.
- The workshop **expands** over time: more rooms, a yard and outbuildings. This expansion is the visual record of progress.
- A small **hand-crafted touch** keeps the casual loop lively. The player can personally "throw" a piece or "open the kiln" with a satisfying animation. These actions give a small bonus but are never required and never spammable (no click-grind).

### 4.2 Workers: everyone has character

- Workers are hired from a rotating pool of village folk. Each is a distinct, procedurally varied character:
  - silhouette and body type, face, hair, clothing and accessories
  - one visible quirk (round glasses, a bushy moustache, freckles, a too-big hat, a missing tooth, a headscarf…)
  - a name and a one-line personality
- **Traits** affect production. Examples:
  - *Perfectionist*: higher quality, slower.
  - *Night owl*: faster while the owner is offline.
  - *Chatterbox*: boosts the neighbouring station.
  - *Clumsy but fast*.
  - *Glaze whisperer*: better rare-effect odds.
  - *Homesick*: better when working with ingredients from their home region.
- Workers gain experience and can develop new traits.
- **Casual players** hire whoever is shown with a sensible auto-assign. **Optimizers** compose teams for synergies.
- Workers never quit, sulk or starve because the owner was absent.
- Village customers, traders and each player's own **avatar** follow the same "everyone has character" rule. The avatar is customisable: face, hair, outfit, accessories and colours.

### 4.3 Design studio: personal style

Players design the pieces they produce. A design is made of:

- **Form type:** cup, bowl, plate, vase, jug, teapot, tile, figurine, and so on. More types unlock over time.
- **Silhouette:** adjustable profile curve with a few intuitive handles (belly, neck, foot, rim), plus presets.
- **Details:** handle style, rim style, foot, spout, lid where applicable.
- **Glaze:** from the player's discovered glaze recipes, possibly two-tone or dipped.
- **Pattern / decoration:** stripes, dots, waves, leaves, stamps, sgraffito… with colour choice, unlocked progressively.
- **Maker's mark:** a small personal emblem shown on every piece the player makes.

Designs have derived properties:

- **difficulty**, which affects production time and failure chance
- **appeal** per customer taste

Customers in the village have tastes, for example "loves blue", "likes tall vases" or "prefers simple forms". Matching tastes earns more money and reputation. That gives designing a gameplay reason as well as a creative one. Casual players can use presets or the suggested design.

Finished pieces are rendered from their design data everywhere they appear: shelves, market, the friend's workshop when gifted, and the collection book.

### 4.4 Discovery and the recipe book

- Glazes and clay bodies are **recipes** (ingredient ratios) combined with **firing settings** (temperature band, atmosphere, cooling speed).
- **Experimenting** with combinations reveals effects: crackle, celadon, tenmoku, crystalline, raku, ash glaze, and so on.
  - Each discovery adds an illustrated page to the **recipe book** (Rezeptbuch).
  - Hints guide casual players ("Old Greta mutters something about iron and a smoky fire…").
  - Optimizers can reason from ingredient properties.
- Discoveries unlock new designs, orders and branches.
- Recipes a friend has discovered can be **taught**. Learning from a friend is much faster than discovering alone (a collaboration benefit).

### 4.5 Branches (breadth beyond pottery)

The game starts with earthenware cups and bowls. It later branches into:

- **stoneware**
- **porcelain** (needs kaolin)
- **tiles** (large village commissions)
- **figurines**
- later still, related crafts such as **glass** or **enamel**

Each branch adds stations, recipes, design options and customer types.

**Every branch and tier is reachable solo.** Cooperation makes it much faster and cheaper, but a player whose friends are inactive never gets stuck. Joint orders give **exclusive extras** that can't be obtained solo:

- unique decor, patterns and maker's-mark frames
- village buildings
- rare effects The branch system must be data-driven, so new branches and customization options can be added without engine changes.

### 4.6 Economy

- **Currencies:**
  - **Taler** (money), earned by selling goods.
  - **Reputation** (Ruf), which unlocks customers, orders and tiers.
  - **Village goodwill**, earned through cooperation. It unlocks village buildings and cosmetic rewards.
- **Selling:**
  - **Orders board:** village customers with tastes and deadlines that are generous or open-ended.
  - **Market stall:** sells goods passively at a steady price.
  - **Trading** with friends (see §5).
- No order is lost because the player was absent. Orders without deadlines are the default, and deadline orders are an optional optimizer bonus.

### 4.7 Pacing and progression

- **First session (~10–15 minutes):**
  - throw first cups
  - first firing
  - first sale
  - hire the first worker
  - design a first custom piece
  - discover a first glaze
  - join or create a village
- **First days:** new stations, a second room, the first branch, and the first joint order with friends.
- **Long term:**
  - workshop tiers (Werkstatt → Manufaktur → Hofmanufaktur)
  - masterworks: rare, high-effort pieces shown off in the village
  - a collection book of every form × glaze × effect
  - village growth
- **Offline accumulation:** generous storage caps, at least 12–24 hours of production, so a once-a-day player loses nothing meaningful.
- **Welcome-back boost:** after longer absences, temporarily faster production and a summary card ("While you were away…").

## 5. Collaboration: the village (Dorf)

A **village** is a group of players joined by invite code. It is drawn as a small map: each player's Manufaktur, plus shared buildings that appear and grow as the village progresses.

### 5.1 Regional specialties (the reason to trade)

- Each player's land has **one or two natural specialties**, for example:
  - red clay pit
  - kaolin (porcelain earth)
  - iron and copper oxides (glaze colours)
  - wood (fuel for wood kilns)
  - ash or quartz
- Every player can obtain small amounts of everything, slowly or expensively. Their specialty is plentiful and cheap for them.
- Advanced recipes and branches need ingredients from several specialties, so trading with friends is the natural route.
- Specialties are assigned to keep the village diverse, so a new player's specialty is something the village lacks. A player may switch their specialty later through a long-term upgrade.

### 5.2 Trading and gifting

- **Trading board** in the village: post an offer ("20 kaolin for 15 copper oxide"). A friend accepts any time, and the trade executes immediately and safely on the server.
- **Gifts:** send materials or finished pieces to a friend at no cost. Gifted pieces appear on the recipient's shelf, rendered with the sender's design and maker's mark.
- **Requests:** "I need 10 wood" pinned to the board. Friends see it the next time they visit.

### 5.3 Visits and helping hands

- A player can visit any friend's workshop and see it in full: their style, designs and decor.
- **Lend a hand:** a few times per day, a visitor can give a boost such as speeding up a station or adding quality to a batch. The owner benefits even while absent and sees who helped.
- **Guestbook:** visitors leave a sticker or stamp, a lightweight social touch.

### 5.4 Joint orders (Großaufträge): only possible together

- Big commissions from the village, the town or noble houses, for example:
  - "a tiled fountain for the market square"
  - "a full porcelain dinner service for the wedding feast"
  - "glazed roof tiles for the new mill"
- Each joint order lists several **parts**. Each part requires specific forms, materials, effects or quality levels, and these deliberately span **different specialties and branches**, so no single player can fulfil a joint order alone.
- Players contribute toward any part at any time. Progress is visible to everyone, with contributor portraits.
- **Absence-safe rules:**
  - No hard deadlines, or very long ones.
  - A part that needs one player's specialty can also be covered, at higher cost, by buying that material from the village store. The village is never blocked by one missing player, but cooperating is far cheaper.
  - The minimum number of contributors scales down if the village has fewer active players.
  - Rewards are split: a good base share goes to **every** village member, plus a contribution share. Absent members are never excluded and never penalised.
- **Rewards** are the biggest in the game:
  - large Taler and reputation gains
  - unique cosmetic unlocks (workshop decor, patterns, maker's mark frames)
  - new village buildings on the map
  - big shortcuts toward branches; branches themselves stay reachable solo
- A joint order always needs **at least two contributing players**: "only possible together" holds. If only one member is active, joint orders wait and that player's solo progress continues unaffected.

### 5.5 The communal great kiln (Gemeinschaftsofen)

- A large village kiln (anagama style) that players **load together**. When it's full, or after a set time, it fires.
- It produces rare effects that are impossible in personal kilns: ash glaze, flashing, natural ash deposits.
- Results return to each contributor's shelf.
- More contributors means a bigger, hotter firing and better odds, so cooperation is rewarded and nobody is required.

### 5.6 Village buildings and growth

Completed joint orders and pooled goodwill build and upgrade shared village buildings. Each gives every member a passive benefit. Examples:

- **Clay pit:** cheaper base clay.
- **Glaze library:** shared recipe hints.
- **Market hall:** better market prices.
- **Guild hall:** unlocks larger joint orders.

The village map visibly grows: a lasting record of the group's history.

## 6. Two depths of play: how each system serves both

| System | Casual default | Optimizer depth |
|---|---|---|
| Production | auto-queue the suggested design | batch sizing, bottleneck tuning, station upgrades |
| Workers | auto-assign | trait synergies, training paths |
| Design | presets, "suggested for this customer" | silhouette tuning to customer tastes, difficulty vs appeal |
| Glazes | follow hints | systematic experiments, ratio tuning |
| Kiln | default program | temperature, atmosphere and cooling profiles; load planning |
| Trade | one-tap gifts, accept suggested trades | price planning, specialty arbitrage |
| Joint orders | contribute whatever's highlighted | plan the village's division of labour |

## 7. Art direction (decided via mockups)

**Style "B2 — Ink + rich colour washes"** was chosen.

- Reference mockup: `docs/art/art-style-reference.html`, lower card. A screenshot is in `art-style-reference.png`.
- The generator script `gen_scene.py` shows the drawing techniques used.

**Sign-off:** the owner (the user) approves the art. The build must put art-heavy work early and in small pieces, with screenshot review gates:

1. the workshop scene
2. the character system
3. rendering of player-designed pieces
4. the village map

That way a rejected direction doesn't sink later work.

- Wobbly hand-inked dark outlines (#2b2420-ish) over warm, fairly saturated flat colour washes on cream paper, with subtle paper grain.
- Line wobble comes from an SVG turbulence/displacement filter. It should be applied with care so animation stays cheap, for example pre-rendered or limited to static layers.
- Hatched shadows (diagonal-line patterns) under furniture and objects.
- Busy, cozy, lived-in scenes full of clutter: shelves of glazed pots, sacks, buckets, plants, string lights, pinboard with the player's own design sketches, a cat.
- A handwritten font (e.g. "Patrick Hand" or similar) for labels and UI accents. UI panels look like paper cards, tape and notebook pages, not generic web UI.
- **Every character is distinct**, with a recognisable silhouette, quirk and personality. No generic or faceless figures. Characters are built procedurally from part libraries (heads, hair, noses, eyes, accessories, outfits, body shapes) with hand-tuned rules, so they always look charming.
- Things move: the wheel spins, fire flickers, smoke puffs, the cat breathes, workers bob while working, and pots pop out of the kiln. Animation is gentle and loops.
- Player-designed pieces are rendered from design data in this style everywhere.
- Must work in both desktop and phone layouts. The workshop scene scales and pans.

The "cute and nice" bar is a hard requirement: graphics quality is reviewed visually (screenshots) as part of every visual feature.

## 8. Technical shape (decided)

- **Cloudflare Workers** serves the static frontend (Static Assets) and the `/api/*` routes.
- **D1:** players, villages, workshops, inventories, designs, workers, recipes discovered, trades, gifts, visits, history.
- **Durable Objects:** one per village, for serialised updates to joint orders, the communal kiln and the trading board, to avoid double-spend races.
- **Simulation:** shared TypeScript game-logic module used by both server (authoritative) and client (prediction and preview). State advances from the last-update timestamp to now deterministically ("catch-up" simulation).
- **Auth:** village invite code → create player with display name + password (hashed with a salt). Session via HTTP-only cookie.
- **Game content** (forms, glazes, effects, traits, branches, orders, buildings) lives in data files, so content can grow without engine changes.

## 9. First release scope

The first release the friends play includes **the core game plus the village**:

- **Solo loop:**
  - full production chain
  - workers with traits
  - characters
  - design studio
  - glaze discovery and the recipe book
  - orders board and market stall
  - workshop expansion
  - the earthenware start plus **1–2 branches** (e.g. stoneware, porcelain)
- **Village:**
  - founding and joining
  - village map
  - specialties
  - trading board, gifts and requests
  - visits with lend-a-hand
  - **joint orders**
  - at least a couple of village buildings
- **Comfort:** offline catch-up, a "While you were away…" summary, welcome-back boost.

Deferred to later releases:

- the communal great kiln (§5.5)
- masterworks
- the full collection book
- further branches (tiles, figurines, glass, enamel)
- higher workshop tiers beyond what the first branches need

The engine and content model must already support all of these, so they can be added as data and features without rework.

## 10. Left to the builder

- Frontend framework choice (a lightweight one, or none) and the build tooling.
- Exact numbers: timers, prices, caps, odds. Tune them for the pacing goals in §4.7.
- The exact list of initial forms, glazes, effects, traits and joint orders, within the shapes described.
- Database schema and API design.
- How much is SVG vs canvas, and animation implementation details.
- Testing approach. Game logic should be unit-tested because it is deterministic.
- The order in which to build features. A playable solo loop should come first, then the village, then joint orders.
