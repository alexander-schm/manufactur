# Manufaktur — Little Surprises & the Curiosity Album

Date: 2026-11-21
Builds on: `2026-11-07-manufaktur-design.md` (§7 art direction: "Things move… the cat breathes")

## 1. Intent and the why

The owner wants "cute little things to discover", like clicking the cat and having it react, or a noisy dragon peeking through the window every now and then. Today the workshop is pretty but passive. The cat (`Room.tsx` `Cat`) only breathes, sways its tail and wakes when the workshop is idle. Surprises make each check-in feel alive and give a light, cozy reason to look around. The **curiosity album** turns them into something to collect, without making them a chore.

## 2. Goals, non-goals, anti-goals

**Goals**
- Many small, charming, varied surprises in the workshop and on the village map.
- Discovering them feels lucky and personal. The album records them across devices.
- Small rewards (cosmetics, stickers, a few Taler) that are nice but never needed.

**Non-goals**
- Sound. The game has none today, so the radio and kettle are visual only (music notes, steam). Adding audio is a separate decision.
- Surprises that affect the economy in a meaningful way.

**Anti-goals**
- **Interrupting.** A surprise never blocks a panel, pauses work, steals a click meant for a station, or needs to be dismissed.
- **Cost or loss.** Nothing is ever lost (the cat "knocks a pot off" but it is caught or lands softly), and nothing costs anything.
- **Click-grinding.** No surprise rewards clicking repeatedly. Spamming the cat ends in a swat, not a prize. Every album entry is rewarded once.
- **Wearing out.** Frequent surprises get dull, so each has a cooldown and a rarity.
- Art below the "cute and nice" bar.

## 3. Constraints

- **Client-side.** Surprises are animations and timing in the client (`src/client/art/workshop/`, `src/client/art/village/`). The scene is SVG (Preact). Animations stay cheap: CSS transforms, no per-frame JS on large layers, and respect `prefers-reduced-motion` (show a still pose instead).
- **Server-side recording.** First discoveries go to the server as a new game action `discoverCuriosity { id }`. The server checks the id exists and isn't already recorded, adds it to `state.curiosities: string[]` and grants that entry's reward. It cannot verify the click really happened. In a closed circle of friends that is acceptable.
- **Calendar and time.** Calendar- and time-of-day surprises use the **viewer's local clock** (client). Gating by that clock on the server isn't needed, given the trust model above.
- **Order.** Built after the branches project (`2026-11-21-branches-and-long-goals-design.md`). It relies on `state.tier` from that project, and takes its own schema bump after that project's (3 → 4).
- **Phones.** Everything must be tappable on phones. Pointer-following effects degrade to tap-based ones on touch devices.

## 4. Approaches

- **Client surprises + server-recorded album (chosen).** Album and rewards persist across devices. Costs one action and a small state field.
- **Purely visual, nothing saved.** Simplest, but no album, no collecting and no rewards, and the "something to discover" goal is much weaker.
- **Server-driven surprise events** (scheduled in `advance`). Validatable, but heavy for something that is about timing and animation, and the surprises would show up in the away summary instead of being seen live.

## 5. Design

### 5.0 Decisions from the builder check (builder's calls)

- **Saved state:** `curiosities: Record<string, number>` (id → time of discovery), `plant: { stage: 0..4, lastWatered: number }`. Watering is once per server day (UTC). The mouse chain advances one step at most every 3 days; the server checks this against the previous step's time in `curiosities`.
- **Rewards are solo only:** Taler or **ordinary decor items** (new `DECOR` entries in the existing spots). There are no guestbook stickers (they are village-wide and validated by the village DO) and no maker's-mark frames. `MAX_DECOR_PLACED` goes from 4 to 6, because there are more decor items now.
- **Existing clicks win.** A click on a station still opens the station, and a click on a worker still opens the people panel. The worker's speech bubble appears in the scene at the same time. The cat gets its own hit area above the stations, so it is always clickable. While the cat lies on the kiln or in a pot, it is drawn on top of the station and catches only its own clicks.
- **Visits:** surprises play in a friend's workshop too (birthday cake by *their* `createdAt`, plant shown at *their* stage), but nothing is recorded for the visitor and the plant can't be watered there. The scene gets a `readOnly` flag; `WorkshopScene` already has one.
- **The happy accident and the cake** are one-time scenes plus an album entry, not saved objects.

### 5.1 Surprise engine (client)

A small scheduler in the client (`src/client/surprises/`):
- **Content table.** Each surprise has an `id`, a `where` (workshop / window / village map), a trigger, a rarity, a cooldown and conditions (time of day, month, tier, cat state, workers present, and so on).
- **Triggers:**
  - **click:** on an object (cat, kettle, radio, plant, string lights, worker, mouse hole)
  - **ambient:** random roll every ~1–2 minutes while the scene is visible, weighted by rarity (common ≈ every few minutes, rare ≈ a few times per week of play, legendary ≈ once in weeks)
  - **calendar:** active on matching dates or times
- At most one ambient surprise runs at a time. Cooldowns per surprise are kept in `localStorage` as a convenience (a reset only makes things a bit more frequent).
- When a surprise plays for the first time, the client sends `discoverCuriosity` and shows a small, non-blocking toast: "Neu im Kuriositätenkabinett: Der neugierige Drache".

### 5.2 Starting surprises (about 30)

Rarity: C = common, R = rare, L = legendary.

**The cat** (makes `Cat` interactive, with several new poses)
- Pet it: purrs, little hearts (C)
- Pet it 5 times quickly: swats you, offended tail (C)
- Sleeps curled on the warm kiln while it fires (C)
- Sits in a freshly thrown pot on the wheel (R)
- Follows the pointer with its eyes, then pounces (desktop) / chases a tapped spot (touch) (R)
- Brings a "gift" to the door: button, feather, a single sock (R; reward: the sock as a decor item)
- Nudges a pot off the shelf; a worker catches it at the last moment (R)

**At the window**
- The noisy dragon: peeks in, fogs the glass with its breath, and the player can wipe a smiley into the fog (R; dragon plush decor reward)
- Hedgehog trundling past (C)
- Fox peering in (C)
- Carrier pigeon with a customer's letter, a funny note (C)
- Village kids pressing their noses on the glass (C, only during the day)
- Snail on the glass in the rain (C; rain is a client-side weather roll)
- Stork with a parcel (L; reward: a rare decor)

**Workshop objects**
- Radio: click to switch "station"; music notes in different styles, workers bob to the beat (C)
- Kettle: click for a tea break; steam, every worker lifts a cup and cheers (C)
- Plant: water it once a day (click) and it grows over days through 5 stages to a flowering plant (R at the final stage). The growth stage is stored in state with the album, so it survives devices.
- Mouse hole: a mouse appears, and over weeks of discoveries it builds its own tiny pottery stall next to the hole (a chain of 4 entries, the last L)
- String lights: click to make them twinkle in a wave (C)

**Workers**
- Click a worker: a speech bubble with a line that fits their quirk or trait (C; one entry, many lines)
- Two idle workers chat (bubbles with little drawings: a cat, a heart, a pot) (R)

**Time and calendar**
- Evening: lamps light up, warm glow (C)
- Night: an owl on the window sill (C)
- Morning: birds on the sill (C)
- December: snow outside, a little Christmas tree, and a Christmas market stall on the village map (R, seasonal)
- 31 December / 1 January: fireworks outside the window (L, seasonal)
- The player's "workshop birthday" (anniversary of `createdAt`): a cake on the table (L)

**Kiln**
- "Happy accident": rarely, a unique misfired piece appears as a display object with a funny name (R). Cosmetic only, not a sellable good.
- The ghost of old potter Greta at night by the kiln, who whispers a hint toward an undiscovered effect (R). It uses `hintFor`.

**Village map**
- Stork on a roof (C)
- Hot-air balloon drifting over (R)
- Sheep that wandered somewhere silly (C)
- The travelling merchant: appears once a week for a day with 3 rare **decor items** for Taler. It's the one deliberate exception to "nothing costs anything": purely cosmetic, optional, and a small money sink. It only appears for players in a village. The weekly offer is deterministic from the player id and the week; `buyFromMerchant` is a solo, server-validated action. (R for the first sighting)

### 5.3 The curiosity album (Kuriositätenkabinett)

- A new book panel next to the recipe book, in the same paper style.
- One illustrated card per surprise (reusing the surprise's art in a still pose) with a German caption, for example "Der Drache hat wieder ans Fenster gehaucht. Wer putzt das jetzt?"
- Unfound entries show a "?" silhouette with a tiny hint ("Nachts raschelt es am Fenster …").
- Counter "17 / 32 entdeckt", grouped by place (Werkstatt, Fenster, Dorf, Jahreszeiten).
- **Rewards:** each entry once (a few Taler, or a decor item for rare and legendary entries). Every 10 entries: a bigger decor item.

### 5.4 Art

Each surprise is drawn in the house style (ink outline, flat washes, hatching) and gets a screenshot self-review against the art reference. The owner reviews the collected screenshots after the build.

## 6. Delivery order

1. Engine, album, `discoverCuriosity` action
2. Cat interactions
3. Window visitors
4. Workshop objects and workers
5. Calendar and time, December first (it's soon)
6. Kiln and village map, travelling merchant last

## 7. Left to the builder

- Exact odds, cooldowns, reward amounts, captions and hints.
- How the art is split into components.
- Which surprises are cut if one doesn't reach the cuteness bar. Better fewer and cute.
- Tests: unit tests for the album action, rewards (once only), plant growth and merchant validation; client tests for the scheduler (conditions, cooldowns, rarity) with a fake clock.
