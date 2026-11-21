# Little Surprises & the Curiosity Album Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the workshop and village map come alive with ~36 small, cute surprises (cat, window visitors, workshop objects, workers, time and calendar, kiln, village map, a travelling merchant) and collect them in a server-recorded album, the Kuriositätenkabinett.

**Architecture:** A pure, clock-injected scheduler in `src/client/surprises/` decides what plays when (click, ambient roll, calendar); a Preact hook wires it to the scene and records first discoveries with a new solo action `discoverCuriosity`. Album content, rewards, plant growth and the merchant's weekly offer are deterministic shared logic (`src/shared/content/curiosities.ts`, `src/shared/curiosities.ts`, `src/shared/merchant.ts`) behind schema 4 (`curiosities`, `plant`). Art is SVG components under `src/client/art/surprises/`, drawn in a layer above the room, each with a still pose for reduced motion and screenshots.

**Tech Stack:** TypeScript, Preact + SVG + CSS keyframes, `@preact/signals`, Vitest (node, `preact-render-to-string`) + Workers pool, Cloudflare Worker + D1, Playwright (screenshots, e2e).

**Spec:** `docs/superpowers/specs/2026-11-21-surprises-design.md` (builds on `docs/superpowers/specs/2026-11-07-manufaktur-design.md` §7 art direction)

Delivery follows spec §6, with December pulled forward (it is late November) and every surprise in its own small slice, so a surprise that misses the cute bar can be cut without touching its neighbours: **Tasks 1–4** engine, album, action, cat basics · **Tasks 5–6** December, time of day, calendar · **Tasks 7–8** more cat · **Tasks 9–10** window · **Tasks 11–14** objects, plant, mouse, workers · **Task 15** kiln · **Tasks 16–17** village map, merchant last · **Task 18** ship.

## Global Constraints

- All in-game text is German. Shared content lives in `src/shared/content/*`, client-only lines in `src/client/surprises/texts.ts`, UI labels in `src/client/strings.ts`. Use the exact texts given in this plan.
- `src/shared` stays deterministic: no `Date.now()`, no `Math.random()`. Week/day maths use UTC days of the server `now` passed to `applyAction`.
- Client surprise code never calls `Date.now()`, `Math.random()`, `matchMedia`, `localStorage` or `document` directly, except inside `browserEnv()` in `src/client/surprises/env.ts`. Everything else gets a `SurpriseEnv`.
- A rejected action leaves the state untouched (existing `expectRejected` pattern in `test/shared/actions.test.ts`).
- Save migration: this plan owns `SCHEMA_VERSION` 3 → 4 (`curiosities`, `plant`). The village-long-goals plan executes first and adds only optional fields, no bump. If `SCHEMA_VERSION` is not 3 when Task 1 starts, take the next number and chain the migration from there.
- `MAX_DECOR_PLACED` goes from 4 to 6.
- Anti-goals (spec §2): a surprise never blocks a panel, pauses work, steals a station/worker click or needs dismissing; nothing is lost or costs anything (the merchant is the one opt-in exception); every album entry is rewarded once; rapid clicking never earns anything.
- Existing clicks win: stations and workers keep their click handlers. Surprise hit areas (`data-hit="<target>"`) must not cover a station's drawing, except the cat's (`data-hit="cat"`, drawn above stations). Every hit area is at least 60×60 viewBox units (≈44 CSS px on a phone).
- Animations are CSS keyframes on small groups. The only per-frame JS is the cat chase's pointer tracking (rAF-throttled, only while that surprise plays). Under `prefers-reduced-motion` (or `still`), every surprise renders a visible still pose: never rely on a final keyframe, and moving actors get a fixed mid-path position.
- Touch devices: pointer-following effects become tap-based (`env.touch()`).
- Visits (`WorkshopScene` without `onStation`): surprises play with the friend's data (their `createdAt`, plant stage, mouse stall), nothing is recorded or dispatched, the plant can't be watered, the cabinet isn't clickable.
- Art gate (replaces owner review; the owner reviews `docs/screens/surprise-*.png` after the build): dev server via `npm run dev`; `npm run shot -- "<url>" <name>`; output must show `horizontalOverflow=0px` and no `ERRORS`. Check desktop and phone against `docs/art/art-style-reference.png`: ink outlines via `inkStyle` (2.2 main, 1.2 detail), flat washes from `tokens.css` variables, `url(#hatch)` shadows, dot eyes, `var(--cheek)` blush on creatures, round friendly shapes, hand font. The **cute bar is hard**: fix and re-shoot; if after two fix rounds a surprise still isn't clearly cute, cut it (delete its `SURPRISES` def, art, card, `CURIOSITIES` entry, and its reward decor if nothing else uses it) and write `cut: <id> — <reason>` in the commit message.
- Tests: `npx vitest run` (shared + client), `npm run test:worker`, `npm run check` (tsc incl. `test/`). Known flake: "[Review Focus 1] 30 days of absence" in `test/shared/advance.test.ts` is timing-based; re-run it alone before treating it as a failure.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stay on branch `feat/endgame`.

## Review Focus

1. A click on a station or worker while a surprise plays next to it still opens that station/worker; only the cat's own hit area sits above stations (Task 4 geometry test over `HIT_RECTS` vs. `stationRect`).
2. The same curiosity discovered twice (second device, 409 retry, visit then home) shows no error toast and pays once (Task 1 rejection test + Task 4 `shouldRecord` and quiet-dispatch tests).
3. A tab hidden for hours and then shown again plays at most one ambient surprise, not a burst of missed rolls (Task 2 fake-clock test).
4. With reduced motion every surprise is still visible in a still pose, walkers mid-window rather than off-screen (Task 4 render-all-still test, extended by each art task).
5. Day boundaries are UTC on both sides: the client offers watering and shows the merchant only when the server will accept (Tasks 12 and 17 boundary tests on `canWater` and `merchantToday`).

---

## File Structure

**Create (shared)**
- `src/shared/content/curiosities.ts`: `CuriosityDef`, `CURIOSITIES` (36 entries), `CURIOSITY_GROUPS`, `ALBUM_PRIZES`, `RARITY_TALER`.
- `src/shared/curiosities.ts`: `recordCuriosity`, `discoverError`, mouse chain rule, plant watering (`canWater`, `waterPlant`), `utcDay`.
- `src/shared/merchant.ts`: `MERCHANT_STOCK`, `merchantToday` (Task 17).

**Create (client logic)**
- `src/client/surprises/types.ts`: `Rarity`, `Where`, `ClickTarget`, `LocalTime`, `Mood`, `SurpriseCtx`, `SurpriseDef`, `Play`, `SurpriseEnv`, `SurpriseView`.
- `src/client/surprises/scheduler.ts`: `createScheduler`, `CHANCE`, `COOLDOWN`, `ROLL_MS`.
- `src/client/surprises/env.ts`: `browserEnv`, `memoryStore`, dev flags (`readDevFlags`).
- `src/client/surprises/calendar.ts`: `moodAt`, `isRaining`.
- `src/client/surprises/defs.ts`: `SURPRISES` table (grows per task).
- `src/client/surprises/useSurprises.ts`: hook + `shouldRecord`.
- `src/client/surprises/spots.ts`: every surprise anchor (`SPOTS`, `HIT_RECTS`, `stationRect`, `VILLAGE_SPOTS`).
- `src/client/surprises/texts.ts`: worker lines, pigeon notes, accident names, Greta, merchant, bubble texts.

**Create (client art)** under `src/client/art/surprises/`: `Cat.tsx`, `SurpriseLayer.tsx`, `Cabinet.tsx`, `WindowLayer.tsx`, `Seasonal.tsx`, `Visitors.tsx`, `Objects.tsx`, `Plant.tsx`, `Mouse.tsx`, `Bubbles.tsx`, `KilnSurprises.tsx`, `VillageSurprises.tsx`, `cards.tsx`, `surprises.css`.

**Create (panels):** `src/client/panels/CuriosityAlbum.tsx`, `src/client/panels/albumLogic.ts`, `src/client/panels/village/MerchantSheet.tsx`.

**Create (tests):** `test/shared/curiosities.test.ts`, `test/shared/merchant.test.ts`, `test/client/scheduler.test.ts`, `test/client/calendar.test.ts`, `test/client/surprises.test.tsx`, `test/client/album.test.tsx`.

**Modify:** `src/shared/{types,state,actions,rng}.ts`, `src/shared/content/index.ts`, `src/shared/village/decor.ts`, `src/client/{store,strings}.ts`, `src/client/ui/{Toast.tsx,ui.css,Icons.tsx}`, `src/client/art/workshop/{Room,WorkshopScene,Decor}.tsx`, `src/client/art/workshop/stations/Stations.tsx`, `src/client/art/character/{Character,parts}.tsx`, `src/client/art/village/VillageMap.tsx`, `src/client/screens/GameScreen.tsx`, `src/client/panels/{PanelHost}.tsx`, `src/client/panels/village/{VillagePanel,DecorPanel}.tsx`, `src/client/dev/{ScenePage,GamePage,VillagePage}.tsx`, `test/shared/{state.test.ts,village/trade.test.ts}`, `test/client/store.test.ts`, `test/worker/game.test.ts`, `test/e2e/smoke.mjs`, `README.md`.

---

### Task 1: Schema 4, album content, `discoverCuriosity`

**Files:**
- Create: `src/shared/content/curiosities.ts`, `src/shared/curiosities.ts`
- Modify: `src/shared/types.ts`, `src/shared/state.ts`, `src/shared/actions.ts`, `src/shared/rng.ts`, `src/shared/content/index.ts`, `src/shared/village/decor.ts`
- Test: `test/shared/curiosities.test.ts`, `test/shared/state.test.ts`, `test/shared/village/trade.test.ts`

**Interfaces:**
- Produces (types): `interface PlantState { stage: number /* 0..4 */; lastWatered: number /* 0 = never */ }`; `GameState.curiosities: Record<string, number>` (id → server time of discovery); `GameState.plant: PlantState`.
- Produces (content): `type CuriosityGroup = 'werkstatt' | 'fenster' | 'dorf' | 'jahreszeiten'`; `CURIOSITY_GROUPS: { id: CuriosityGroup; title: string }[]` in this order: Werkstatt, Fenster, Dorf, Jahreszeiten; `interface CuriosityDef { id: string; group: CuriosityGroup; rarity: 'C' | 'R' | 'L'; name: string; caption: string; hint: string; decor?: string; serverOnly?: boolean; chain?: { prev: string; minGapMs: number } }`; `CURIOSITIES: Record<string, CuriosityDef>` (table order = album order); `RARITY_TALER = { C: 5, R: 20, L: 50 }` (an entry with `decor` pays the decor instead of Taler); `ALBUM_PRIZES = [{ at: 10, decor: 'ohrensessel' }, { at: 20, decor: 'goldfischglas' }, { at: 30, decor: 'drachenteppich' }]`.
- Produces (logic, `src/shared/curiosities.ts`): `DAY_MS = 86_400_000`; `utcDay(t: number): number` (= `Math.floor(t / DAY_MS)`); `MOUSE_GAP_MS = 3 * DAY_MS`; `discoverError(s: GameState, id: unknown, now: number): string | null`; `recordCuriosity(s: GameState, id: string, now: number, events: GameEvent[]): void` (records, pays, hands out album prizes; used by Task 12 too).
- Produces (actions): `{ type: 'discoverCuriosity'; id: string }` in `Action` and `ACTION_TYPES`; `GameEvent.kind` gains `'curiosity'`.
- Produces (rng): `hashString(s: string): number` (FNV-1a 32-bit, unsigned).
- Produces (decor): `MAX_DECOR_PLACED = 6`; new `DECOR` entries (data only, art comes later): `socke` 'Einzelne Socke' wall · `drachenpluesch` 'Plüschdrache' window · `storchenmobile` 'Storchen-Mobile' ceiling · `gluecksschwein` 'Glücksschwein' floor · `kerzenkranz` 'Geburtstagskranz' wall · `ohrensessel` 'Ohrensessel' floor · `goldfischglas` 'Goldfischglas' window · `drachenteppich` 'Drachen-Wandteppich' wall · `kuckucksuhr` 'Kuckucksuhr' wall · `globus` 'Globus' floor · `vogelkaefig` 'Vogelkäfig' ceiling · `muschelkette` 'Muschelkette' window · `schaukelpferd` 'Schaukelpferd' floor · `sternlaterne` 'Sternlaterne' ceiling.

**`CURIOSITIES` content (exact; reward column: Taler by rarity unless a decor is named):**

| id | group | rarity | name | caption | hint | extra |
|---|---|---|---|---|---|---|
| katze-streicheln | werkstatt | C | Schnurrende Katze | Einmal hinter den Ohren kraulen, und die ganze Werkstatt schnurrt mit. | Die Katze mag es, wenn man nett zu ihr ist … | |
| katze-beleidigt | werkstatt | C | Beleidigte Katze | Fünfmal hintereinander? Jetzt reicht’s aber, sagt die Pfote. | Man kann es mit dem Streicheln auch übertreiben … | |
| katze-ofen | werkstatt | C | Ofenwärme | Wenn der Ofen brennt, ist der beste Platz ganz oben. | Wo ist es in der Werkstatt am wärmsten? | |
| katze-topf | werkstatt | R | Katze im Topf | Frisch gedreht und schon besetzt. Passt wie angegossen. | Ein frisch gedrehter Topf ist für manche ein Bett. | |
| katze-jagd | werkstatt | R | Die Jägerin | Erst die Augen, dann wackelt der Po, dann – Sprung! | Wenn die Katze munter ist, beweg dich mal vor ihr hin und her … | |
| katze-geschenk | werkstatt | R | Ein Geschenk von der Katze | Ein Knopf, eine Feder, eine einzelne Socke. Woher nur? | Manchmal bringt die Katze etwas mit. | decor `socke` |
| katze-schubs | werkstatt | R | Gerade noch gefangen | Ein Stups mit der Pfote, ein Hechtsprung – nichts passiert! | Die Katze schaut so verdächtig aufs Regal … | |
| radio | werkstatt | C | Werkstattradio | Walzer, Polka oder Jazz? Die Werkstatt wippt bei allem mit. | Das alte Radio auf dem Regal geht noch. | |
| teepause | werkstatt | C | Teepause | Wasser kocht, Becher hoch – auf die Werkstatt! | Der Kessel auf dem Ofen pfeift, wenn man ihn lässt. | |
| lichterkette | werkstatt | C | Lichterwelle | Ein Stups, und die Lichter tanzen einmal quer durch den Raum. | Die Lichterkette ist kitzlig. | |
| pflanze | werkstatt | R | Die Werkstattpflanze blüht | Vier Tage Wasser, ein bisschen Geduld – und jetzt das! | Der kleine Setzling am Fenster hat Durst. Jeden Tag ein bisschen. | `serverOnly` |
| maus-1 | werkstatt | C | Die Werkstattmaus | Hinter der Fußleiste wohnt jemand. Mit sehr kleinen Schuhen. | In der Fußleiste ist ein kleines Loch … | |
| maus-2 | werkstatt | R | Ton für die Maus | Ein Krümel Ton, kaum größer als eine Erbse. Es ist ein Anfang. | Die Maus hat Pläne. Schau in ein paar Tagen wieder nach. | chain prev `maus-1` |
| maus-3 | werkstatt | R | Die Mäusescheibe | Eine Drehscheibe aus einem Garnröllchen. Sie dreht sich sogar! | Die Maus baut an etwas. Ein paar Tage noch. | chain prev `maus-2` |
| maus-4 | werkstatt | L | Der Mäusemarkt | Winzige Töpfe, winziges Schild: »Alles 1 Krümel«. | Was die Maus wohl baut? | chain prev `maus-3` |
| plausch | werkstatt | C | Ein Wort im Vorbeigehen | Alle hier haben etwas zu erzählen. Man muss nur hinhören. | Was deine Leute wohl sagen, wenn du sie anstupst? | |
| tratsch | werkstatt | R | Werkstatttratsch | Eine Katze, ein Herz, ein Topf. Mehr muss man nicht wissen. | Wenn zwei gerade nichts zu tun haben … | |
| gluecksfehler | werkstatt | R | Ein glücklicher Fehlbrand | Schief, verlaufen, einzigartig. Er hat jetzt sogar einen Namen. | Manchmal macht der Ofen, was er will. | |
| greta | werkstatt | R | Die alte Meisterin Greta | Nachts am Ofen flüstert sie, was sie über Glasuren weiß. | Nachts ist es am Ofen nicht so leer, wie man denkt … | |
| drache | fenster | R | Der neugierige Drache | Der Drache hat wieder ans Fenster gehaucht. Wer putzt das jetzt? | Manchmal beschlägt das Fenster ganz von allein … | decor `drachenpluesch` |
| igel | fenster | C | Igel auf Wanderschaft | Tipp, tapp, tipp. Er hat es nicht eilig. | Unten am Fenster raschelt es manchmal. | |
| fuchs | fenster | C | Der Fuchs | Er schaut rein, er schaut raus. Wahrscheinlich wegen der Katze. | In der Dämmerung schaut jemand Rotes vorbei. | |
| brieftaube | fenster | C | Post per Taube | Ein Brief von der Kundschaft – mit sehr eigenen Wünschen. | Wer gurrt denn da auf dem Fensterbrett? | |
| kinder | fenster | C | Neugierige Nasen | Drei Nasen an der Scheibe. Ob die später auch töpfern? | Tagsüber kommen manchmal kleine Besucher ans Fenster. | |
| schnecke | fenster | C | Schnecke im Regen | Langsam, glänzend, glücklich. Endlich Regen! | Bei Regen wird das Fenster zum Wanderweg. | |
| storch | fenster | L | Der Storch mit dem Paket | Ein Paket für die Werkstatt. Was da wohl drin ist? | Ganz selten fliegt etwas Großes mit einem Paket vorbei. | decor `storchenmobile` |
| eule | fenster | C | Die Nachteule | Huhu. Sie passt auf, bis morgens alle wieder da sind. | Nachts sitzt jemand auf dem Fensterbrett. | |
| morgenvoegel | fenster | C | Morgenkonzert | Früh am Morgen gibt es Musik auf dem Fensterbrett. | Wer früh kommt, hört sie singen. | |
| dorf-storch | dorf | C | Storch auf dem Dach | Er steht auf einem Bein und schaut, wer im Dorf was macht. | Auf den Dächern im Dorf ist manchmal Besuch. | |
| ballon | dorf | R | Der Heißluftballon | Ganz langsam treibt er über das Dorf. Jemand winkt! | Schau im Dorf auch mal nach oben. | |
| schaf | dorf | C | Das Ausreißerschaf | Wie ist es da bloß hinaufgekommen? | Die Schafe im Dorf bleiben nicht immer auf der Wiese. | |
| haendler | dorf | R | Der fahrende Händler | Einmal die Woche, nur für einen Tag – mit Schönem aus aller Welt. | Einmal in der Woche kommt jemand mit einem Wagen ins Dorf. | |
| abendlicht | jahreszeiten | C | Feierabendlicht | Wenn es dunkel wird, leuchtet die Werkstatt ganz warm. | Komm doch mal am Abend vorbei. | |
| dezember | jahreszeiten | R | Winter in der Werkstatt | Schnee vor dem Fenster, ein Bäumchen in der Ecke, und im Dorf duftet es nach Zimt. | Im Dezember sieht alles ein bisschen anders aus. | |
| silvester | jahreszeiten | L | Feuerwerk | Prost Neujahr! Sogar die Katze ist wach geblieben. | Nur an einem Abend im Jahr ist der Himmel so bunt. | decor `gluecksschwein` |
| geburtstag | jahreszeiten | L | Werkstattgeburtstag | Ein Jahr Werkstatt! Eine Torte, eine Kerze, ganz viel Ton. | Weißt du noch, wann du die Werkstatt eröffnet hast? | decor `kerzenkranz` |

Chains use `minGapMs: MOUSE_GAP_MS`.

**`discoverError` rules, in order (German messages exact):** not `own(CURIOSITIES, id)` → `'Unbekannte Kuriosität'`; `serverOnly` → `'Das zeigt sich von ganz allein'`; already recorded → `'Schon entdeckt'`; chain prev missing → `'Die Maus ist noch nicht so weit'`; `now - curiosities[prev] < minGapMs` → `'Die Maus ist noch nicht so weit'`.

**`recordCuriosity` events (exact):** `{ kind: 'curiosity', id, text: \`Neu im Kuriositätenkabinett: ${name}\` + (taler ? \` (+${taler} Taler)\` : '') }`; for a decor reward that `grantDecor` accepted: `{ kind: 'curiosity', id: decor, text: \`Neue Dekoration: ${DECOR[decor].name}\` }`; for each `ALBUM_PRIZES` entry with `at <= count` whose decor `grantDecor` accepts: `{ kind: 'curiosity', id: prize.decor, text: \`${prize.at} Kuriositäten entdeckt! Neue Dekoration: ${DECOR[prize.decor].name}\` }`.

- [ ] **Step 1: Write the failing tests**

```ts
// test/shared/curiosities.test.ts — copy the ok/expectRejected helpers from test/shared/actions.test.ts
const NOW = T0 + 1000;
it('a first discovery is recorded with its time, pays once and announces itself', () => {
  const r = ok(plainGame(), { type: 'discoverCuriosity', id: 'katze-streicheln' });
  expect(r.state.curiosities['katze-streicheln']).toBe(NOW);
  expect(r.state.taler).toBe(105);
  expect(r.events).toContainEqual({ kind: 'curiosity', id: 'katze-streicheln', text: 'Neu im Kuriositätenkabinett: Schnurrende Katze (+5 Taler)' });
  expectRejected(r.state, { type: 'discoverCuriosity', id: 'katze-streicheln' }); // 'Schon entdeckt'
});
it('rejects unknown, prototype and server-only ids', () => {
  for (const id of ['quatsch', '__proto__', 'pflanze', 42]) expectRejected(plainGame(), { type: 'discoverCuriosity', id } as any);
});
it('a decor reward replaces the Taler and is set up while there is room', () => {
  const r = ok(plainGame(), { type: 'discoverCuriosity', id: 'drache' });
  expect(r.state.taler).toBe(100);
  expect(r.state.decorPlaced).toContain('drachenpluesch');
  expect(r.events.map((e) => e.text)).toContain('Neue Dekoration: Plüschdrache');
});
it('the mouse chain needs the previous step and three days', () => {
  const s = plainGame();
  expectRejected(s, { type: 'discoverCuriosity', id: 'maus-2' });
  const a = ok(s, { type: 'discoverCuriosity', id: 'maus-1' }).state;
  expectRejected(a, { type: 'discoverCuriosity', id: 'maus-2' }, NOW + 3 * 86_400_000 - 1);
  expect(ok(a, { type: 'discoverCuriosity', id: 'maus-2' }, NOW + 3 * 86_400_000).state.curiosities['maus-2']).toBeDefined();
});
it('the tenth entry brings the Ohrensessel', () => {
  const s = plainGame();
  const ids = Object.keys(CURIOSITIES).filter((id) => !CURIOSITIES[id].serverOnly && !CURIOSITIES[id].chain && !CURIOSITIES[id].decor);
  for (const id of ids.slice(0, 9)) s.curiosities[id] = T0;
  const r = ok(s, { type: 'discoverCuriosity', id: ids[9] });
  expect(r.state.decor).toContain('ohrensessel');
  expect(r.events.map((e) => e.text)).toContain('10 Kuriositäten entdeckt! Neue Dekoration: Ohrensessel');
});
it('content is consistent', () => {
  expect(Object.keys(CURIOSITIES)).toHaveLength(36);
  for (const c of Object.values(CURIOSITIES)) {
    expect(c.caption.length && c.hint.length && c.name.length).toBeTruthy();
    if (c.decor) expect(DECOR[c.decor]).toBeDefined();
    if (c.chain) expect(CURIOSITIES[c.chain.prev]).toBeDefined();
    expect(CURIOSITY_GROUPS.map((g) => g.id)).toContain(c.group);
  }
  for (const p of ALBUM_PRIZES) { expect(DECOR[p.decor]).toBeDefined(); expect(p.at).toBeLessThanOrEqual(Object.keys(CURIOSITIES).length); }
});
it('six decor items can stand at once', () => {
  const s = plainGame(); s.decor = Object.keys(DECOR).slice(0, 7); s.decorPlaced = s.decor.slice(0, 6);
  expect(MAX_DECOR_PLACED).toBe(6);
  expectRejected(s, { type: 'placeDecor', id: s.decor[6] });
});
```
In `test/shared/state.test.ts` add: `newGame` has `curiosities: {}` and `plant: { stage: 0, lastWatered: 0 }`; "v3 to v4 fills the album fields": a `newGame` JSON with `schemaVersion = 3` and both keys deleted migrates to `toEqual(newGame('p', 5, T0))` with `schemaVersion` 4; update the existing v1→v3 and v2→v3 tests to expect 4. In `test/shared/village/trade.test.ts` change the "full" fixture to six ids `['a','b','c','d','e','f']`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/curiosities.test.ts test/shared/state.test.ts test/shared/village/trade.test.ts`
Expected: FAIL (`CURIOSITIES` not exported, schema 3).

- [ ] **Step 3: Implement** per Interfaces and the content table. `run()` case `'discoverCuriosity'`: `const err = discoverError(s, a.id, now); if (err) fail(err); recordCuriosity(s, a.id, now, events);`. `store.announce` is untouched in this task.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared test/shared && git commit -m "feat(shared): curiosity album, discoverCuriosity, schema 4, six decor spots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The surprise scheduler (pure, fake-clock tested)

**Files:**
- Create: `src/client/surprises/types.ts`, `src/client/surprises/scheduler.ts`, `src/client/surprises/defs.ts`
- Test: `test/client/scheduler.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type Rarity = 'C' | 'R' | 'L'`; `type Where = 'workshop' | 'window' | 'village'`
  - `type ClickTarget = 'cat' | 'radio' | 'kettle' | 'lights' | 'mouseHole' | 'worker'`
  - `interface LocalTime { year: number; month: number /* 1-12 */; day: number; hour: number; minute: number }`
  - `interface Mood { daypart: 'morning' | 'day' | 'evening' | 'night'; december: boolean; newYear: boolean; birthday: boolean; rain: boolean }`
  - `interface SurpriseCtx { s: GameState; now: number; local: LocalTime; mood: Mood; readOnly: boolean; touch: boolean; reducedMotion: boolean }`
  - `type Trigger = { kind: 'click'; target: ClickTarget; combo?: { count: number; withinMs: number } } | { kind: 'ambient' } | { kind: 'calendar' }`
  - `interface SurpriseDef { id: string; where: Where; trigger: Trigger; rarity: Rarity; durationMs: number; cooldownMs?: number; when?: (c: SurpriseCtx) => boolean; album: string[]; pickAlbum?: (c: SurpriseCtx) => string | null }` (`album[0]` is recorded unless `pickAlbum` is given; `album` lists every id the def can record)
  - `interface Play { id: string; startedAt: number; until: number; seed: number /* uint32 */; held: boolean; data?: Record<string, string | number> }`
  - `interface SurpriseEnv { now(): number; random(): number; local(t: number): LocalTime; visible(): boolean; touch(): boolean; reducedMotion(): boolean; store: { load(): Record<string, number>; save(v: Record<string, number>): void } }`
- Produces (`scheduler.ts`): `CHANCE: Record<Rarity, number> = { C: 0.06, R: 0.01, L: 0.0008 }`; `UNDISCOVERED_BOOST = 2`; `COOLDOWN: Record<Rarity, number> = { C: 20 min, R: 6 h, L: 3 days }` (ambient/calendar default when `cooldownMs` is absent; click defs default 0); `ROLL_MS: [number, number] = [60_000, 120_000]`;
  `createScheduler(defs: SurpriseDef[], env: SurpriseEnv, opts: { where: Where[]; firstRollMs: [number, number]; onStart?: (p: Play, album: string | null) => void }): Scheduler` with
  `interface Scheduler { tick(c: SurpriseCtx): boolean /* true when plays or calendar changed */; click(target: ClickTarget, c: SurpriseCtx, data?: Play['data']): Play | null; force(id: string, c: SurpriseCtx): Play | null; plays(): Play[]; calendar(): string[] }`.
- Produces (`defs.ts`): `SURPRISES: SurpriseDef[]` (empty here; each later task appends its defs).

Scheduler rules (the parts the tests don't pin):
- `tick`: drop plays whose `until <= now` (held plays never end). If `!env.visible()`, do nothing else. Calendar: for every calendar def of a matching `where` whose `when` holds, keep it in `calendar()`; the first time an id enters the set this session, call `onStart` with a synthetic play. Ambient: when `now >= nextRollAt` and no ambient play is running, roll once, then set `nextRollAt = now + ROLL_MS[0] + random() * (ROLL_MS[1] - ROLL_MS[0])` (never "catch up" missed rolls).
- Roll: eligible = ambient defs of a matching `where`, `when` true, off cooldown (`store.load()[id] + cooldown <= now`). Weight = `CHANCE[rarity]` × `UNDISCOVERED_BOOST` if no `album` id is in `c.s.curiosities`. If the weights sum above 1, scale them to sum 1. One `random()`: walk the cumulative weights in table order; the def whose band contains it plays; otherwise nothing.
- Starting a play: `seed = Math.floor(random() * 2 ** 32)`, `until = now + durationMs`, store `{ ...load(), [id]: now }`, then `onStart(play, album)` where `album = pickAlbum ? pickAlbum(c) : album[0]`.
- `click`: defs with `trigger.kind === 'click'` and that target; combos checked first (count clicks on that target within `withinMs`, the current one included); a combo play resets the counter and, until it ends, further clicks on that target return `null`. A new click play replaces a running play of the same id. `data` is stored on the play.
- `force`: starts that def regardless of trigger, conditions and cooldown, with `held: true` and `until: Infinity`.

- [ ] **Step 1: Write the failing tests** (test-local defs; `fakeEnv({ now, randoms })` returns queued randoms, then `0.999`; `local` = UTC parts; `store` in memory)

```ts
it('first ambient roll comes inside the first-roll window, then every 60–120 s', () => { /* firstRollMs [20_000, 40_000], random 0 → roll at +20 s; next roll at +20 s + 60 s with random 0 */ });
it('conditions gate ambient defs (owl only at night)', () => { /* when: c.mood.daypart === 'night'; day ctx + random 0 → no play; night → play */ });
it('a common surprise waits out its 20-minute cooldown, also across a new scheduler with the same store', () => {});
it('at most one ambient play at a time', () => {});
it('undiscovered surprises are twice as likely', () => {
  // one C def; random 0.07: plays when its album id is not in s.curiosities (0.12 band), not when found (0.06)
});
it('[Review Focus 3] after three hidden hours, becoming visible plays at most once and reschedules', () => {
  // visible() false while now advances 3 h with ticks every second; then visible: exactly one roll, next roll ≥ 60 s later
});
it('five cat clicks within 4 s play the combo; more clicks are ignored until it ends', () => {
  // defs: pet (click cat), swat (click cat, combo { count: 5, withinMs: 4000 }); 4 clicks → pet; 5th → swat; 6th → null; after swat.until → pet again
});
it('force holds a play until cleared, ignoring conditions and cooldown', () => {});
it('calendar defs report while active and call onStart once per session', () => {});
it('onStart gets pickAlbum’s id when present', () => {});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/scheduler.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `types.ts`, `scheduler.ts`, `defs.ts` per Interfaces and rules.

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/client/scheduler.test.ts && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/surprises test/client/scheduler.test.ts && git commit -m "feat(client): surprise scheduler with injectable clock

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The Kuriositätenkabinett panel and the wall cabinet (art gate)

**Files:**
- Create: `src/client/panels/CuriosityAlbum.tsx`, `src/client/panels/albumLogic.ts`, `src/client/art/surprises/cards.tsx`, `src/client/art/surprises/Cabinet.tsx`, `src/client/art/surprises/surprises.css`
- Modify: `src/client/panels/PanelHost.tsx`, `src/client/strings.ts`, `src/client/screens/GameScreen.tsx`, `src/client/panels/panels.css`, `src/client/dev/{ScenePage,GamePage}.tsx`
- Test: `test/client/album.test.tsx`

**Interfaces:**
- Consumes: `CURIOSITIES`, `CURIOSITY_GROUPS`, `ALBUM_PRIZES`, `DECOR`.
- Produces: `interface AlbumCard { id: string; found: boolean; name: string; text: string; rarity: Rarity; foundAt: number | null }` (unfound: `name '???'`, `text` = hint; found: real name and caption); `albumView(s: GameState): { found: number; total: number; groups: { id: CuriosityGroup; title: string; cards: AlbumCard[] }[]; nextPrize: { at: number; decor: string; left: number } | null }`.
- Produces: `CARD_ART: Record<string, () => preact.JSX.Element>` (each draws in `viewBox="0 0 160 120"`; later tasks add their entries) and `CuriosityCard({ card })`: found → the art; unfound → the same art (or `GenericCard`, a stoppered glass jar with a ribbon, when no art exists yet) with class `unfound` (CSS `filter: brightness(0) opacity(.16)`) and a hand-drawn "?" on top.
- Produces: `CuriosityAlbum({ s })` (paper book style of `RecipeBook`: `.book`/`.book-page`): heading counter `` `${found} / ${total} entdeckt` ``, one section per group in `CURIOSITY_GROUPS` order, cards in a responsive grid, rarity as ★ / ★★ / ★★★, found date `` `entdeckt am ${d.toLocaleDateString('de-DE')}` ``, prize line `` `Noch ${left} bis zum nächsten Geschenk: ${DECOR[decor].name}` `` or `'Alle Geschenke abgeholt – jetzt heißt es nur noch staunen.'`.
- Produces: `Cabinet({ x, y, found, fresh, onClick? })`: a small wall curio cabinet with two glass doors and three shelves; tiny objects appear on the shelves as `found` grows (one per 6 entries: feather, shell, tiny pot, acorn, key, star), a sparkle when `fresh`. `data-cabinet`, `role="button"`, `aria-label="Kuriositätenkabinett"`, keyboard Enter/Space like `Plinth`. Drawn by `WorkshopScene` after the room at `SPOTS.cabinet` (Task 4 creates `spots.ts`; until then use `{ x: 272, y: 220 }`), clickable only when not read-only. `WorkshopScene` gets `onCabinet?: () => void`.
- `PanelId` gains `'kabinett'` (never locked); `T.tabs.kabinett = 'Kuriositätenkabinett'`; `GameScreen` passes `onCabinet={() => open('kabinett')}` and adds a menu-sheet button `'Kuriositätenkabinett öffnen'`. "Fresh" = any `curiosities` time newer than the localStorage key `mf_album_seen` (try/catch), which `PanelHost` writes with `serverTime()` when the album opens.
- Dev flag `&found=all|<n>` in ScenePage and GamePage: records the first n (or all) `CURIOSITIES` ids into the mock state with times `now - i * 86_400_000`.

- [ ] **Step 1: Write the failing tests**

```ts
it('album view: counter, hints for unfound, captions for found, next prize', () => {
  const s = newGame('p', 1, T0); s.curiosities = { 'katze-streicheln': T0 };
  const v = albumView(s);
  expect([v.found, v.total]).toEqual([1, 36]);
  expect(v.groups.map((g) => g.title)).toEqual(['Werkstatt', 'Fenster', 'Dorf', 'Jahreszeiten']);
  const cat = v.groups[0].cards.find((c) => c.id === 'katze-streicheln')!;
  expect(cat).toMatchObject({ found: true, name: 'Schnurrende Katze', foundAt: T0 });
  expect(v.groups[1].cards.find((c) => c.id === 'drache')).toMatchObject({ found: false, name: '???', text: 'Manchmal beschlägt das Fenster ganz von allein …' });
  expect(v.nextPrize).toEqual({ at: 10, decor: 'ohrensessel', left: 9 });
});
it('the album page shows no spoilers', () => {
  const s = newGame('p', 1, T0); s.curiosities = { 'katze-streicheln': T0 };
  const html = render(<CuriosityAlbum s={s} />);
  expect(html).toContain('1 / 36 entdeckt');
  expect(html).not.toContain('Der neugierige Drache');
  expect(html).toContain('Noch 9 bis zum nächsten Geschenk: Ohrensessel');
});
it('the scene has a clickable cabinet, a visit does not', () => {
  const s = newGame('p', 1, T0);
  expect(render(<WorkshopScene state={s} now={T0} onStation={() => {}} onCabinet={() => {}} />)).toMatch(/data-cabinet[^>]*role="button"/);
  expect(render(<WorkshopScene state={s} now={T0} />)).not.toMatch(/data-cabinet[^>]*role="button"/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/album.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces. The album grid wraps on phones; the page itself must not overflow sideways.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run: `npm run shot -- "http://localhost:5173/#game&calm&panel=kabinett&found=8" surprise-album` and `npm run shot -- "http://localhost:5173/#scene&found=20" surprise-cabinet`
Check: album reads as a notebook in the paper-UI kit; found and "?" cards clearly distinct; no spoiler names; the cabinet is visible in the phone shot without scrolling, doesn't touch the wall plate, glaze-sample board, hanging plant, broom or shelf, and looks like a treasured little cabinet.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-album-*.png docs/screens/surprise-cabinet-*.png && git commit -m "feat(client): Kuriositätenkabinett album and wall cabinet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Wiring the scene, the cat's own hit area, petting and the swat (art gate)

**Files:**
- Create: `src/client/surprises/env.ts`, `src/client/surprises/calendar.ts` (stub `moodAt` returning `{ daypart: 'day', december: false, newYear: false, birthday: false, rain: false }`; Task 5 fills it), `src/client/surprises/useSurprises.ts`, `src/client/surprises/spots.ts`, `src/client/art/surprises/Cat.tsx`, `src/client/art/surprises/SurpriseLayer.tsx`
- Modify: `src/client/art/workshop/{Room,WorkshopScene}.tsx`, `src/client/art/workshop/stations/Stations.tsx` (export `STATION_BOX`), `src/client/store.ts`, `src/client/ui/{Toast.tsx,ui.css}`, `src/client/dev/{ScenePage,GamePage}.tsx`, `src/client/surprises/defs.ts`
- Test: `test/client/surprises.test.tsx`, `test/client/store.test.ts`

**Interfaces:**
- Consumes: Task 2 types and `createScheduler`; `discoverCuriosity`.
- Produces (`env.ts`): `browserEnv(): SurpriseEnv` (now = `serverTime()` + dev clock offset; `Math.random`; local parts via `new Date(t)` getters; `document.visibilityState`; `matchMedia('(pointer: coarse)')` / `('(prefers-reduced-motion: reduce)')`; store key `mf_surprises_v1`, try/catch, `{}` on failure); `memoryStore()`; `interface DevFlags { force?: string; clock?: number; reduced?: boolean; touch?: boolean; rain?: boolean; decorAll?: boolean }` and `readDevFlags(hash: string): DevFlags` for `&surprise=<id>`, `&clock=YYYY-MM-DDTHH:MM` (local time), `&reduced`, `&touch`, `&rain`, `&decor=all`; only honoured when `import.meta.env.DEV` and `typeof location !== 'undefined'`.
- Produces (`useSurprises.ts`): `interface SurpriseView { plays: Play[]; calendar: string[]; mood: Mood; local: LocalTime; now: number; still: boolean; touch: boolean; readOnly: boolean; click(target: ClickTarget, data?: Play['data']): void }` (add to `types.ts`); `useSurprises(where: 'workshop' | 'village', s: GameState, readOnly: boolean): SurpriseView` (workshop scheduler covers `['workshop', 'window']` with `firstRollMs [20_000, 40_000]`; village covers `['village']` with `[3_000, 8_000]`; ticks every 1000 ms via `setInterval` in `useEffect`, re-renders only when `tick` returns true; `still = reducedMotion || play.held`; `&surprise=` calls `force` once on mount); `shouldRecord(album: string | null, s: GameState, readOnly: boolean, sent: Set<string>): boolean` (false when no album, read-only, already in `s.curiosities` or in `sent`); recording calls `dispatch({ type: 'discoverCuriosity', id }, { quiet: true })` and adds the id to `sent`.
- Produces (`spots.ts`): `type Rect = { x: number; y: number; w: number; h: number }`; `SPOTS` starting values (adjust after screenshots; tests use names only): `catHome {760,652}`, `catKiln` (room-1 kiln top, left half), `catPot` (room-1 wheel head), `catShelf {90, 180}`, `gift {860, 690}`, `radio {205, 178}`, `kettle` (room-1 kiln top, right half), `plant {614, 266}`, `mouseHole {805, 466}`, `cabinet {272, 220}`, `cake {660, 600}`, `accident {905, 500}`, `ghost {900, 470}`, `tree {330, 482}`, `window {x: 420, y: 78, w: 200, h: 180, sill: 266}`; `HIT_RECTS: Partial<Record<ClickTarget | 'cabinet' | 'plant' | 'fog' | 'pigeon', Rect>>`; `catSpot(plays: Play[]): { x: number; y: number }`; `stationRect(kind: StationKind, slot: number): Rect` from `SLOTS` and `STATION_BOX` (`Record<StationKind, { w: number; h: number }>` exported from `Stations.tsx` with the sizes each draw function uses).
- Produces (`Cat.tsx`): `Cat` moved out of `Room.tsx` unchanged in look, now `WorkshopCat({ x, y, pose, still })` (root has `data-cat-pose={pose}`) with `type CatPose = 'sleep' | 'awake' | 'purr' | 'swat'` (more poses in Task 7): purr = eyes closed happy curves, 3 small hearts floating up (`class="hearts"`), tail curled; swat = one paw raised mid-swipe, ears back, puffed tail, a little "!" puff — offended, never angry-scary. `CatHit({ x, y, onClick })`: transparent ellipse ≥ 60×60, `data-hit="cat"`, `role="button"`, `aria-label="Katze"`, `onClick` stops propagation.
- Produces (`SurpriseLayer.tsx`): `SurpriseLayer({ state, sx, onCabinet })` renders everything surprise-related above stations in this order: cat (when its play needs it above stations), surprise actors, bubbles, cabinet, hit areas last. Each actor root carries `data-surprise="<def id>"`. Actors render from `sx.plays` / `sx.calendar` alone; conditions are the scheduler's business, so a forced play always draws (with fallbacks such as "the first two workers" when a play needs actors the state lacks).
- `WorkshopScene` gets `surprises?: SurpriseView` (tests/dev override; the hook is always called and its result replaced when the prop is given). It draws `WorkshopCat` in its old z-place for `sleep`/`awake` (sleeping exactly as today: asleep unless no batches) and calls `SurpriseLayer` after people and idle workers.
- Defs added: `katze-streicheln` (click cat, C, 2500 ms), `katze-beleidigt` (click cat, combo `{ count: 5, withinMs: 4000 }`, C, 2000 ms).
- `store.dispatch(action, opts?: { quiet?: boolean })`: quiet suppresses error toasts (local and server rejections) but still rolls back. `announce` shows `'curiosity'` events as `toast(text, 'curiosity', 4200)`. `ToastKind` gains `'curiosity'` (styled like `discovery`, `pointer-events: none` so it never eats a click).
- Dev: `&surprise=<id>` forces and holds that play; ScenePage/GamePage scroll `.scene-scroll` so the surprise's anchor spot is centred. `&decor=all` (ScenePage) draws every `DECOR` item with art, ignoring the cap.

- [ ] **Step 1: Write the failing tests**

```ts
const still = (plays: Play[], extra: Partial<SurpriseView> = {}): SurpriseView => ({ plays, calendar: [], mood: DAY_MOOD, local: LOCAL, now: T0, still: true, touch: false, readOnly: false, click: () => {}, ...extra });
const play = (id: string, data?: Play['data']): Play => ({ id, startedAt: T0, until: T0 + 5000, seed: 7, held: true, data });
it('the cat has its own hit area above every station', () => {
  const html = render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} surprises={still([])} />);
  expect(html.lastIndexOf('data-hit="cat"')).toBeGreaterThan(html.lastIndexOf('data-station='));
});
it('petting shows purring hearts, five pets the swat', () => {
  expect(render(<WorkshopScene state={newGame('p', 1, T0)} now={T0} onStation={() => {}} surprises={still([play('katze-streicheln')])} />)).toContain('data-surprise="katze-streicheln"');
  expect(render(<WorkshopScene state={newGame('p', 1, T0)} now={T0} onStation={() => {}} surprises={still([play('katze-beleidigt')])} />)).toContain('data-surprise="katze-beleidigt"');
});
it('[Review Focus 1] no surprise hit area except the cat’s covers a station', () => {
  const s = mockWorkshop(T0);
  for (const [target, r] of Object.entries(HIT_RECTS)) for (const st of s.stations) if (target !== 'cat') expect(intersects(r!, stationRect(st.kind, st.slot)), `${target} vs ${st.kind}`).toBe(false);
  for (const r of Object.values(HIT_RECTS)) expect(r!.w >= 60 && r!.h >= 60).toBe(true);
});
it('[Review Focus 4] every surprise renders visibly in its still pose', () => {
  for (const d of SURPRISES.filter((d) => d.where !== 'village')) {
    const html = render(<WorkshopScene state={mockWorkshop(T0)} now={T0} onStation={() => {}} surprises={still([play(d.id, { workerId: mockWorkshop(T0).workers[0].id })], { calendar: [d.id] })} />);
    expect(html, d.id).toContain(`data-surprise="${d.id}"`);
    expect(html).not.toMatch(/NaN|undefined/);
  }
});
it('[Review Focus 2] recording: once, never on visits', () => {
  const s = newGame('p', 1, T0); const sent = new Set<string>();
  expect(shouldRecord('katze-streicheln', s, false, sent)).toBe(true);
  sent.add('katze-streicheln');
  expect(shouldRecord('katze-streicheln', s, false, sent)).toBe(false);
  expect(shouldRecord('radio', s, true, new Set())).toBe(false);
  s.curiosities.radio = T0; expect(shouldRecord('radio', s, false, new Set())).toBe(false);
});
```
(`intersects`, `DAY_MOOD`, `LOCAL` are test helpers in the same file; later tasks extend the "every surprise" test simply by adding defs.) In `test/client/store.test.ts`: "[Review Focus 2] a quiet dispatch the server rejects rolls back without an error toast" (mock fetch 400 `{ error: 'Schon entdeckt' }`, assert `toasts.value` has no `error` entry and the state is the base).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx test/client/store.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces. Keep `scene.css` cat breathing/tail classes working on the moved cat.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS (existing `scene.test.tsx` included).

- [ ] **Step 5: Art gate**

Run: `npm run shot -- "http://localhost:5173/#scene&surprise=katze-streicheln" surprise-katze-streicheln`, `... &surprise=katze-beleidigt" surprise-katze-beleidigt`, and `... #scene&reduced" surprise-still`
Check: hearts small and soft, the purr pose reads "happy", the swat reads "offended but cute"; tapping the cat in the phone shot area is comfortably large; reduced-motion shot shows the normal sleeping cat. Then click the glaze table in the dev page next to the cat (console logs `station`) to confirm clicks still reach it.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-katze-*.png docs/screens/surprise-still-*.png && git commit -m "feat(client): surprises in the scene; the cat purrs and swats

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: December — snow, the little tree, the village Christmas stall (art gate)

**Files:**
- Create: `src/client/art/surprises/WindowLayer.tsx`, `src/client/art/surprises/Seasonal.tsx`
- Modify: `src/client/surprises/calendar.ts`, `src/client/surprises/defs.ts`, `src/client/surprises/spots.ts` (adds `VILLAGE_SPOTS`), `src/client/art/workshop/Room.tsx` (`data-broom` on the broom; export `WindowMullions({ x, y })`: the two muntin paths and the glass highlight; the broom is hidden when `december` is passed), `src/client/art/surprises/SurpriseLayer.tsx`, `src/client/art/village/VillageMap.tsx`, `src/client/art/surprises/cards.tsx`, `src/client/dev/VillagePage.tsx`
- Test: `test/client/calendar.test.ts`, `test/client/surprises.test.tsx`

**Interfaces:**
- Produces: `moodAt(local: LocalTime, created: LocalTime): Mood` — daypart: 5:00–8:59 morning, 9:00–17:59 day, 18:00–21:59 evening, 22:00–4:59 night; `december` = month 12; `newYear` = Dec 31 from 17:00 through Jan 1 23:59; `birthday` = same month/day as `created` in a later year, and a Feb 29 workshop celebrates on Feb 28 in non-leap years; `rain = !december && isRaining(local)`. `isRaining(local): boolean` = `hashString(\`${year}-${month}-${day}-${Math.floor(hour / 3)}\`) % 100 < 18`.
- Produces: `WindowLayer({ sx, children })` drawn right after `Room`: a `clipPath id="window-clip"` on `SPOTS.window` holding the outside (sky tint, weather, outside actors from later tasks), then `WindowMullions` on top, then sill actors (unclipped). Weather: December snow (≈14 flakes drifting in 2 CSS loops, snow caps on the hills and the tree in the window), rain streaks when `mood.rain` (used in Task 9).
- Produces: `ChristmasTree({ x, y, still })` (`data-tree`) at `SPOTS.tree`: a small fir in a clay pot, a star, paper chains in glaze colours, a few hand-made ceramic baubles, one slowly twinkling; the broom is tidied away all December. `ChristmasStall({ x, y })` (`data-xmas-stall`) on the village square at `VILLAGE_SPOTS.xmasStall` (`{ x: 560, y: 520 }` start value, clear of every plot, building spot and the well): striped roof, garland, a steaming pot, gingerbread hearts; static, no click.
- `VillageMap` gets `mood?: Mood` (VillagePanel passes the workshop scheduler's mood from `moodAt(env.local(serverTime()), env.local(s.createdAt))`; VillagePage computes it from `&clock=`).
- Def: `dezember` (calendar, where `window`, R, `when: c => c.mood.december`). `CARD_ART.dezember`: the window with snow and the tree.

- [ ] **Step 1: Write the failing tests**

```ts
const L = (y: number, mo: number, d: number, h = 12, mi = 0): LocalTime => ({ year: y, month: mo, day: d, hour: h, minute: mi });
const C = L(2026, 3, 14);
it('dayparts switch on the hour', () => {
  expect([4, 5, 8, 9, 17, 18, 21, 22].map((h) => moodAt(L(2026, 6, 1, h, h === 4 ? 59 : 0), C).daypart))
    .toEqual(['night', 'morning', 'morning', 'day', 'day', 'evening', 'evening', 'night']);
});
it('December, New Year’s Eve window, birthdays', () => {
  expect(moodAt(L(2026, 12, 1), C).december).toBe(true);
  expect(moodAt(L(2026, 12, 31, 16, 59), C).newYear).toBe(false);
  expect(moodAt(L(2026, 12, 31, 17), C).newYear).toBe(true);
  expect(moodAt(L(2027, 1, 1, 23, 59), C).newYear).toBe(true);
  expect(moodAt(L(2027, 1, 2, 0), C).newYear).toBe(false);
  expect(moodAt(L(2027, 3, 14), C).birthday).toBe(true);
  expect(moodAt(L(2026, 3, 14), C).birthday).toBe(false);
  const leap = L(2028, 2, 29);
  expect(moodAt(L(2029, 2, 28), leap).birthday).toBe(true);
  expect(moodAt(L(2032, 2, 28), leap).birthday).toBe(false);
  expect(moodAt(L(2032, 2, 29), leap).birthday).toBe(true);
});
it('rain: never in December, stable within a 3-hour block, about one block in six', () => {
  expect(moodAt(L(2026, 12, 5, 10), C).rain).toBe(false);
  expect(isRaining(L(2026, 6, 1, 9))).toBe(isRaining(L(2026, 6, 1, 11, 59)));
  let n = 0; for (let d = 0; d < 365; d++) for (let b = 0; b < 8; b++) { const t = new Date(Date.UTC(2026, 0, 1 + d)); if (isRaining(L(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), b * 3))) n++; }
  expect(n / 2920).toBeGreaterThan(0.12); expect(n / 2920).toBeLessThan(0.24);
});
it('December in the workshop and the village', () => {
  // WorkshopScene with surprises={still([], { calendar: ['dezember'], mood: { ...DAY_MOOD, december: true } })}: contains data-surprise="dezember", data-tree, no broom (data-broom absent)
  // VillageMap with mood.december: contains data-xmas-stall; without: not
});
```
(Add `data-broom` to the broom group in `Room`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/calendar.test.ts test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run: `npm run shot -- "http://localhost:5173/#scene&clock=2026-12-12T11:00" surprise-dezember`, `npm run shot -- "http://localhost:5173/#scene&clock=2026-12-12T11:00&reduced" surprise-dezember-still`, `npm run shot -- "http://localhost:5173/#village&clock=2026-12-12T11:00" surprise-dezember-village`
Check: snow reads as gentle and cosy, flakes stay inside the glass, muntins and curtains stay in front; the tree is small, hand-made-looking, clear of the shelf, drying rack and cabinet; the stall is charming, doesn't cover houses or paths, and fits the phone layout.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-dezember-*.png && git commit -m "feat(art): December snow, Christmas tree and the village Christmas stall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Time of day — evening light, owl, morning birds, fireworks, birthday cake (art gate)

**Files:**
- Modify: `src/client/art/surprises/{Seasonal,WindowLayer,SurpriseLayer,cards}.tsx`, `src/client/art/surprises/surprises.css`, `src/client/art/workshop/{WorkshopScene,Decor}.tsx`, `src/client/surprises/defs.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Consumes: `moodAt`, `WindowLayer`, `SPOTS.cake`.
- Produces: the `<svg class="scene">` gets `mood-<daypart>` classes. Evening: window sky goes apricot-pink, string-light halos and the lantern glow brighter (CSS on `.mood-evening .bulb circle`), a warm overlay rect `fill: var(--sun)` at low opacity with `pointer-events: none`. Night: deep-blue sky with moon and a few stars in the window, a soft dim overlay on the room, lights glowing. Morning: pale peach sky.
- Defs: `abendlicht` (calendar, workshop, C, `when: daypart === 'evening'`; the warm overlay carries its `data-surprise`); `eule` (ambient, window, C, 5 min, night): a round owl on the sill with ear tufts, blinks slowly, head tilts; `morgenvoegel` (ambient, window, C, 3 min, morning): three little birds on the sill hopping, tiny music notes; `silvester` (calendar, window, L, `when: mood.newYear`): fireworks bursting in the window every few seconds (3 colours, staggered CSS), still pose = two frozen bursts; `geburtstag` (calendar, workshop, L, `when: mood.birthday`): a round cake with one candle per year (each `data-candle`; max 5 drawn, then a single number candle), cream, a flag with "Hurra!", on a little stool at `SPOTS.cake`.
- Decor art in `Decor.tsx`: `gluecksschwein` (a small pink ceramic piggy with a four-leaf clover, floor) and `kerzenkranz` (a small wreath with candles, wall). Spot rule for all new decor: clear of stations, worker spots, cat home, every `SPOTS` object, window glass, pinboard, clock, tier sign and every other new decor item; light overlap with ceiling garlands is fine.
- `CARD_ART` for all five.

- [ ] **Step 1: Write the failing tests**: scene with `mood.daypart === 'night'` has class `mood-night`; `eule` play renders `data-surprise="eule"` inside the sill group; `silvester` and `geburtstag` in `calendar` render their `data-surprise`; a birthday on year 3 of the workshop draws three candles (`data-candle` count 3). `DecorLayer` renders `data-decor="gluecksschwein"` and `data-decor="kerzenkranz"`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&clock=2026-11-25T19:30` (surprise-abendlicht), `#scene&clock=2026-11-25T23:30&surprise=eule` (surprise-eule), `#scene&clock=2026-11-26T07:00&surprise=morgenvoegel` (surprise-morgenvoegel), `#scene&clock=2026-12-31T23:30` (surprise-silvester), `#scene&surprise=geburtstag` (surprise-geburtstag), `#scene&decor=all` (surprise-decor).
Check: evening and night feel warm and safe, not gloomy, everything still readable; owl and birds are round and friendly; fireworks colourful but small; the cake doesn't hide the wheel worker or the cat; new decor sits at free spots.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): evening light, owl, morning birds, New Year fireworks, workshop birthday

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The cat naps on the kiln, sits in a pot, brings a gift, nudges a pot (art gate)

**Files:**
- Modify: `src/client/art/surprises/{Cat,SurpriseLayer,cards}.tsx`, `src/client/art/character/{Character,parts}.tsx`, `src/client/art/workshop/{WorkshopScene,Decor}.tsx`, `src/client/surprises/{defs,texts,spots}.ts`
- Test: `test/client/surprises.test.tsx`, `test/client/character.test.tsx`

**Interfaces:**
- Produces: `CatPose` gains `'kiln' | 'pot' | 'gift' | 'shelf'`. `Pose` (Character) gains `'cheer'` (right arm raised high holding a small cup, left arm relaxed) and `'catch'` (both hands up in front of the chest as if holding something); `Arms` handles both, the cup is drawn only for `cheer`.
- Defs (all ambient, workshop): `katze-ofen` (C, 4 min, when the room-1 kiln has a running batch): the cat curls up asleep on the kiln top at `SPOTS.catKiln`, drawn above the kiln, its home spot empty; `katze-topf` (R, 90 s, when the room-1 wheel has a running batch): only head, ears and paws peek out of a fresh grey-clay pot on the wheel head; `katze-geschenk` (R, 60 s): the cat sits at `SPOTS.gift` proudly next to a gift — the first time (album id not yet recorded) always the sock, later `seed % 3` of button, feather, sock; `katze-schubs` (R, 4 s, when goods exist and there is a worker): the cat on the shelf top paws a pot; the pot tips and falls; the catcher (first idle worker, else `workers[0]`) is drawn at the shelf foot in pose `'catch'` holding it, their usual figure hidden for the play; still pose = the catch moment.
- `catSpot(plays)` and the cat's hit area follow these poses (the cat drawn on top of a station catches only its own clicks).
- Decor art: `socke` (a single striped sock hung on a nail with a wooden clothes peg).
- `texts.ts`: `GIFT_NAMES = ['Knopf', 'Feder', 'Socke']` (used as `aria-label`).

- [ ] **Step 1: Write the failing tests**: render with each play holds `data-surprise`; `katze-ofen` draws the cat (`data-cat-pose="kiln"`) after `data-station="kiln"` and no cat at home; the cat hit area is centred on `catSpot` for `katze-topf`; `katze-geschenk` with no record shows `aria-label="Socke"`; `katze-schubs` draws exactly one `data-pose="catch"` character and hides that worker's normal figure; `render(<Character … pose="cheer" />)` contains `data-pose="cheer"` and the cup.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx test/client/character.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&surprise=katze-ofen` (needs a firing kiln: mockWorkshop has one; else use `#scene&endgame&surprise=katze-ofen`), `katze-topf`, `katze-geschenk`, `katze-schubs`, and `#people` (new poses; save as surprise-poses).
Check: kiln nap looks warm and snug (no flame touching the cat); the cat in the pot is the cutest frame of the set; gift pride readable; the catch is funny-relieved, not frantic; the pot never breaks.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): the cat naps on the kiln, sits in a pot, brings gifts, nudges pots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The cat chase (cuttable on its own) (art gate)

**Files:**
- Modify: `src/client/art/surprises/{Cat,SurpriseLayer,cards}.tsx`, `src/client/art/workshop/WorkshopScene.tsx`, `src/client/surprises/defs.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Def: `katze-jagd` (ambient, workshop, R, 45 s, `when: !c.reducedMotion && !c.readOnly`).
- Produces: `CatChase({ sx, home })`: desktop — the awake cat's pupils follow the pointer over the scene (one `pointermove` listener on the svg, rAF-throttled, updating only the two pupil transforms, removed when the play ends); when the pointer rests 1.5 s within 300 units, the cat wiggles and pounces to that floor point (CSS transition on one group) and sits there pleased. Touch (`sx.touch`) — no tracking; a tap on empty floor (target is the svg background, never a station/worker/hit area) makes the cat dash there. Pounce target is clamped to the floor band (y 500–700).
- Pure helper `pounceTarget(p: { x: number; y: number }): { x: number; y: number }` (exported for the test).

- [ ] **Step 1: Write the failing test**: `pounceTarget({ x: 400, y: 100 })` → `{ x: 400, y: 500 }`; `({ x: -50, y: 900 })` → `{ x: 40, y: 700 }`; render with the play contains `data-surprise="katze-jagd"` and `data-cat-pose="awake"`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run: `npm run shot -- "http://localhost:5173/#scene&surprise=katze-jagd" surprise-katze-jagd`, then in the dev page move the mouse and tap (phone emulation via `&touch`) to watch the pounce. Check: smooth, no jank, station clicks still work during the play. If it doesn't feel delightful, cut it (rule in Global Constraints).

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-katze-jagd-*.png && git commit -m "feat(art): the cat stalks and pounces

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Window — the noisy dragon, the snail in the rain, the stork with a parcel (art gate)

**Files:**
- Create: `src/client/art/surprises/Visitors.tsx`
- Modify: `src/client/art/surprises/{WindowLayer,SurpriseLayer,cards}.tsx`, `src/client/art/workshop/Decor.tsx`, `src/client/surprises/{defs,spots}.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Defs (ambient, window): `drache` (R, 55 s): a round, friendly green dragon head with little horns and freckles rises from the bottom-right corner of the glass, puffs (cheeks round, then a breath cloud), leaves; the glass fogs (soft white blob, clipped) and stays fogged until the play ends. `Fog` component: hit area `data-hit="fog"` over the glass; each tap adds one smiley stroke in order: left eye, right eye, smile (component state, works the same on touch and desktop); fully drawn → the fog gets a tiny shine. `schnecke` (C, 60 s, `when: mood.rain`): a snail with a swirled shell slides slowly up the glass leaving a shiny trail (outside, clipped). `storch` (L, 10 s, `when: daypart === 'day' && !mood.rain`): a stork flies across the sky with a bundle in its beak and drops a parcel that lands on the sill with a little bounce; still pose = mid-flight above the hills.
- Decor art: `drachenpluesch` (a small green plush dragon sitting on the sill, button eyes, stitched smile), `storchenmobile` (a hanging mobile of three little storks).
- `CARD_ART` for the three; `&rain` forces `mood.rain`.

- [ ] **Step 1: Write the failing tests**: each play renders its `data-surprise` inside the window clip (`clip-path="url(#window-clip)"`), except the parcel landing on the sill; `drache` adds `data-hit="fog"`; `Fog` with strokes 3 contains three `data-smiley` paths; `DecorLayer` renders the two decor ids.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&surprise=drache`, `#scene&rain&surprise=schnecke`, `#scene&surprise=storch`, `#scene&decor=all` (overwrite surprise-decor).
Check: the dragon is cuddly, never scary (big eyes, round snout, small teeth at most); the fog reads as breath on glass; the snail is shiny and slow; the stork elegant and the parcel cute; the window cross stays in front of everything outside.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): the noisy dragon, the snail in the rain, the stork with a parcel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Window — hedgehog, fox, carrier pigeon, village kids (art gate)

**Files:**
- Modify: `src/client/art/surprises/{Visitors,WindowLayer,cards}.tsx`, `src/client/surprises/{defs,texts}.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Defs (ambient, window, C): `igel` (14 s, `daypart !== 'night'`): trundles along the grass line left to right, stops once to sniff; `fuchs` (12 s, morning or evening): pops up from the bottom edge, ears first, peers left and right, ducks away; `brieftaube` (30 s, not night): lands on the sill with a rolled letter; tapping it (`data-hit="pigeon"`) unrolls a paper note above the window (`Note` with the hand font, wrapped to ≤ 28 chars per line by a pure `wrapLines(text: string, max: number): string[]`) for 8 s; `kinder` (12 s, day): three kids' heads rise into the glass, noses squashed flat on it, hands pressed beside, one waves.
- `texts.ts`: `PIGEON_NOTES` (pick `seed % 6`), exact:
  1. `Liebe Werkstatt, ich hätte gern eine Vase, die nicht umfällt, wenn mein Dackel wedelt. Gruß, Herr Brösel`
  2. `Gibt es Teetassen mit eingebautem Keksfach? Ich frage für eine Freundin. Oma Hilde`
  3. `Meine Katze hat die alte Schüssel zerbrochen. Sie entschuldigt sich nicht. Bitte eine neue! Frau Pimpernell`
  4. `Bitte einen Krug, der nach Sommer aussieht. Danke! Der Bäcker`
  5. `Kann man Teller in der Farbe von Montagmorgen machen? Eher hellgrau, mit Hoffnung. Herr Zwirn`
  6. `Ich brauche einen Becher für sehr große Gedanken. Die Dorflehrerin`

- [ ] **Step 1: Write the failing tests**: four plays render their `data-surprise`; `wrapLines('Ich brauche einen Becher für sehr große Gedanken.', 28)` → `['Ich brauche einen Becher für', 'sehr große Gedanken.']`; every `PIGEON_NOTES` entry wraps to ≤ 6 lines.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&surprise=igel`, `fuchs`, `brieftaube`, `kinder` (one name each, `surprise-<id>`). Then open the pigeon note in the dev page and shoot it (`surprise-brieftaube-note`, add `&open` handling in the Note's dev path if needed).
Check: all four distinct and charming; kids' squashed noses funny, not creepy; the note readable on the phone.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): hedgehog, fox, carrier pigeon and village kids at the window

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Radio, kettle and string lights (art gate)

**Files:**
- Create: `src/client/art/surprises/Objects.tsx`
- Modify: `src/client/art/surprises/{SurpriseLayer,cards}.tsx`, `src/client/art/workshop/{WorkshopScene,Room}.tsx`, `src/client/art/workshop/scene.css`, `src/client/surprises/{defs,spots,texts}.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Produces: `Radio({ x, y, station })` (always drawn at `SPOTS.radio` on the shelf top: a rounded wooden radio with a fabric grille and a dial), `Kettle({ x, y, steaming })` (always drawn at `SPOTS.kettle`: an enamel kettle), both with hit areas `data-hit="radio"` / `"kettle"` that don't overlap the shelf or kiln drawings.
- Defs (click): `radio` (C, 20 s): each click advances `RADIO_STATIONS = ['Walzer', 'Polka', 'Jazz']` (scheduler keeps nothing; the component derives the station from a module counter); notes float from the radio in the station's style (Walzer round ♪ swaying, Polka bouncy ♫, Jazz slanted ♬), a hand-written label `♪ ${station}` above for 3 s, every drawn worker gets class `bob` (gentle 2 px bounce, offset per worker). `teepause` (C, 6 s, cooldown 60 s): the kettle steams and whistles (a little steam curl + "~"), every worker on screen switches to pose `'cheer'`, the first one shows a bubble `'Prost!'`. `lichterkette` (C, 3 s): the string-light bulbs brighten in a wave left to right (staggered CSS on `.bulb`, `--i` per bulb), hit area = the light band along the ceiling.
- `WorkshopScene`'s `Person` takes a pose/class override computed from the active plays (`cheer`, `bob`, the Task 7 `catch`).

- [ ] **Step 1: Write the failing tests**: radio and kettle always present with their hit areas; `radio` play has `data-surprise="radio"` and every person group gets class `bob`; `teepause` turns every `data-pose` of workers into `cheer` and shows `Prost!`; `lichterkette` sets `data-surprise="lichterkette"` on the lights group.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&surprise=radio`, `teepause`, `lichterkette`. Check: radio and kettle look like they always belonged; the cheering crew is the happiest frame in the game; notes small and light; no overlap with decor spots.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): workshop radio, tea break and the light wave

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The workshop plant (watered daily, five stages) (art gate)

**Files:**
- Create: `src/client/art/surprises/Plant.tsx`
- Modify: `src/shared/curiosities.ts`, `src/shared/actions.ts`, `src/client/art/workshop/Room.tsx` (room 1's sill drops its leafy plant; room 2 keeps its own), `src/client/art/surprises/{SurpriseLayer,cards}.tsx`, `src/client/dev/{ScenePage,GamePage}.tsx`
- Test: `test/shared/curiosities.test.ts`, `test/client/surprises.test.tsx`

**Interfaces:**
- Produces (shared): `PLANT_MAX = 4`; `canWater(s: GameState, now: number): boolean` (stage < 4 and `utcDay(lastWatered) !== utcDay(now)`, `lastWatered 0` = never); action `{ type: 'waterPlant' }`: errors `'Die Pflanze blüht schon'` (stage 4), `'Die Pflanze hat heute schon Wasser bekommen'`; otherwise `stage += 1`, `lastWatered = now`; reaching 4 calls `recordCuriosity(s, 'pflanze', now, events)`.
- Produces (client): `GrowingPlant({ x, y, stage, canWater, onWater? })` in the room-1 sill pot at `SPOTS.plant`: 0 seedling with two leaves, 1 four leaves, 2 a small bushy plant, 3 buds, 4 in full bloom with five pink-yellow flowers and a bee. `data-plant-stage`. When `canWater && onWater`: a tiny droplet bubble bobs above it and the hit area `data-hit="plant"` dispatches `waterPlant` with a watering-can tilt animation (component state, 1.5 s). Otherwise a click wiggles the leaves. `title`: `['Setzling', 'Erste Blätter', 'Kleine Pflanze', 'Knospen', 'In voller Blüte'][stage]`. Read-only scenes: no `onWater`. Dev flag `&plant=<0-4>`.

- [ ] **Step 1: Write the failing tests**

```ts
it('[Review Focus 5] the plant drinks once per UTC day and blooms on the fourth day', () => {
  const day = 86_400_000, mid = Math.ceil(T0 / day) * day; // a UTC midnight
  let s = plainGame();
  s = ok(s, { type: 'waterPlant' }, mid - 60_000).state;      // 23:59 UTC
  expect(canWater(s, mid - 1)).toBe(false);
  expectRejected(s, { type: 'waterPlant' }, mid - 1);
  expect(canWater(s, mid)).toBe(true);
  s = ok(s, { type: 'waterPlant' }, mid).state;                  // 00:00 UTC next day
  s = ok(s, { type: 'waterPlant' }, mid + day).state;
  const r = ok(s, { type: 'waterPlant' }, mid + 2 * day);
  expect(r.state.plant.stage).toBe(4);
  expect(r.state.curiosities.pflanze).toBe(mid + 2 * day);
  expect(r.events.map((e) => e.text)).toContain('Neu im Kuriositätenkabinett: Die Werkstattpflanze blüht (+20 Taler)');
  expectRejected(r.state, { type: 'waterPlant' }, mid + 3 * day);
});
```
Client: plant renders `data-plant-stage="2"` for stage 2; with `canWater` and not read-only it has `data-hit="plant"` and the droplet; a visit renders the friend's stage without the droplet.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/curiosities.test.ts test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces. The client uses `canWater(view, serverTime())`, never the local day.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&plant=0` … `&plant=4` (`surprise-pflanze-0` … `-4`). Check: a clear, satisfying progression; the bloom is lush but stays on the sill; the droplet hint is noticeable but quiet.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-pflanze-*.png && git commit -m "feat: the workshop plant grows when watered daily

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The mouse hole and the mouse's pottery stall (art gate)

**Files:**
- Create: `src/client/art/surprises/Mouse.tsx`
- Modify: `src/client/art/surprises/{SurpriseLayer,cards}.tsx`, `src/client/surprises/{defs,spots}.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Consumes: the Task 1 chain rule (`maus-1`…`maus-4`, 3 days apart).
- Def: `maus` (click `mouseHole`, C, 8 s, `album: ['maus-1', 'maus-2', 'maus-3', 'maus-4']`, `pickAlbum: nextMouseStep`).
- Produces: `nextMouseStep(c: SurpriseCtx): string | null` — the first unrecorded step if it is `maus-1` or its predecessor was recorded at least `MOUSE_GAP_MS` before `c.now`; else `null` (the mouse just peeks). `MouseHole({ x, y, steps, play })`: an arched hole in the baseboard at `SPOTS.mouseHole` with hit area `data-hit="mouseHole"`; the stall next to it shows what `steps` (count of recorded steps, from the scene owner's `curiosities`) has built: 1 a tiny mat, 2 a clay lump on the mat, 3 a cotton-reel wheel, 4 a stall with a striped awning, three thimble-sized pots and a sign `Alles 1 Krümel`. On a play the mouse (grey, pink ears, big dark eyes) pops out, does its step's action (carry the lump / spin the reel / stand proudly at the stall), and slips back.

- [ ] **Step 1: Write the failing tests**: `nextMouseStep` → `'maus-1'` on a new game; `null` one hour after `maus-1`; `'maus-2'` exactly 3 days after; `null` after `maus-4`. A visit to a state with `maus-1..3` draws `data-mouse-steps="3"` and the reel.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&found=all&surprise=maus` (`surprise-maus-4`) and for steps 1–3 via `&found=` presets that contain only those steps (add `&mouse=<n>` to the dev flags if that's simpler). Check: tiny but legible at desktop size, findable but not shouty, the stall the cutest small thing in the room.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-maus-*.png && git commit -m "feat(art): the workshop mouse builds its own little pottery stall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Workers speak and gossip (art gate)

**Files:**
- Create: `src/client/art/surprises/Bubbles.tsx`
- Modify: `src/client/art/workshop/WorkshopScene.tsx`, `src/client/art/surprises/{SurpriseLayer,cards}.tsx`, `src/client/surprises/{defs,texts}.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Defs: `plausch` (click `worker`, C, 4 s, data `workerId`); `tratsch` (ambient, workshop, R, 12 s, `when`: at least two workers are unassigned or at a station with no running batch): two such workers get picture bubbles in turns (cat, heart, pot, then both laugh "hihi").
- `WorkshopScene`'s `Person` click keeps `onWorker(w.id)` and also calls `sx.click('worker', { workerId: w.id })` (not in read-only scenes the people panel isn't opened, but the bubble still plays).
- Produces: `workerLine(w: Worker, seed: number): string` — pool = `[PERSONALITY_LINES[personality(w.seed, w.traits)], ...w.traits.map((t) => TRAIT_LINES[t]).flat()]`, pick `seed % pool.length`. `SpeechBubble({ x, y, lines })` (paper bubble, ink outline, tail to the head, hand font, `wrapLines(…, 24)`), `PictureBubble({ x, y, picture: 'cat' | 'heart' | 'pot' | 'laugh' })`.
- `TRAIT_LINES` (exact):
  - perfektionist: `Noch ein Millimeter … so. Jetzt ist er perfekt.` · `Schief? Das nennt man Charakter. Aber nicht bei mir.`
  - nachteule: `Nachts dreht sich die Scheibe am schönsten.` · `Gähn. Ich bin erst ab zehn Uhr abends ich selbst.`
  - plaudertasche: `Hast du schon gehört? Nein? Dann erzähl ich’s dir!` · `Ich arbeite schneller, wenn jemand zuhört.`
  - flink: `Fertig! … Oh, ups.` · `Schnell ist auch eine Qualität. Irgendwie.`
  - glasurfluesterer: `Diese Glasur will heute Blau sein. Ich spür das.` · `Pssst, ich glaub, im Ofen passiert gerade was Schönes.`
  - geduldig: `Ton hat Zeit. Ich auch.` · `Langsam wird’s am schönsten.`
  - fruehaufsteher: `Guten Morgen! Ich bin schon seit fünf hier.` · `Der frühe Vogel töpfert den Becher.`
  - ordnungsliebend: `Wer hat den Pinsel ins falsche Glas gestellt?` · `Ein Platz für alles, und alles hat seinen Platz.`
  - traeumer: `Ich hab von einem Krug geträumt, der singen kann.` · `Wolken sind eigentlich nur Glasur für den Himmel.`
  - kraftpaket: `Noch einen Sack Ton? Her damit!` · `Kneten ist mein Sport.`
  - drehkuenstler: `Die Scheibe und ich, wir verstehen uns.` · `Schau mal, ganz ohne Hände! … Na gut, mit Händen.`
- `PERSONALITY_LINES` keyed by the exact `PERSONALITIES` string (exact, in that list's order):
  `Hmm hmm hmmm … ich krieg das Lied nicht aus dem Kopf.` · `Wie sagt man so schön: Gut Ding will Weile haben.` · `Heute ist Kuchentag! Oder? Fast?` · `Ich hab dem Ton gesagt, er soll heute brav sein.` · `Solange die Katze da ist, kann nichts schiefgehen.` · `Die Scherbe heb ich auf. Für später.` · `HAHA! … Entschuldigung, die Regale.` · `Mein Becher ist schief, aber er hält den Tee warm.` · `Weißt du schon, wer gestern beim Bäcker war?` · `Eines Tages töpfere ich eine Entenkanne. Eines Tages.` · `Mh.` · `Ton unter den Nägeln ist ein gutes Zeichen.` · `Ich hab ein Gedicht auf den Glasurzettel geschrieben. Nicht lesen!` · `Fiiiiep … Das war ein Lied.` · `Ich sag’s euch, der Drache war wieder da!` · `Rot, Orange, Gelb … wo ist Grün hin?` · `Früher hatten wir nur einen Ofen und waren glücklich.` · `Neue Frisur. Merkt man’s?` · `Der Ofen summt auf Mittel. Ich hör das.` · `Das hier ist Herbert. Herbert wird eine Vase.` · `Wenn keiner guckt, tanz ich an der Drehscheibe.` · `Die Spatzen kriegen gleich ihre Krümel.`

- [ ] **Step 1: Write the failing tests**: every `PERSONALITIES` entry has a `PERSONALITY_LINES` line and every `TRAITS` id has two `TRAIT_LINES`; `workerLine` is stable for the same seed and only returns lines from its pool; `plausch` with a `workerId` renders a bubble containing that worker's line; `tratsch` renders two `data-picture` bubbles.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&surprise=plausch` (the dev force picks `workers[0]` when no `workerId`) and `#scene&surprise=tratsch`. Check: bubbles paper-like, readable on phone, never over the topbar; picture bubbles tiny drawings in the house style.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): workers talk and gossip in speech bubbles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Kiln — the happy accident and old Greta's ghost (art gate)

**Files:**
- Create: `src/client/art/surprises/KilnSurprises.tsx`
- Modify: `src/client/art/surprises/{SurpriseLayer,cards}.tsx`, `src/client/surprises/{defs,texts}.ts`
- Test: `test/client/surprises.test.tsx`

**Interfaces:**
- Defs (ambient, workshop): `gluecksfehler` (R, 60 s, `when: c.s.stats.made >= 10`): the kiln door puffs once and a wonky, melted-glaze little pot hops out to `SPOTS.accident` with a paper name tag `ACCIDENT_NAMES[seed % 8]`; colours from the player's newest glaze plus a drip of another; cosmetic only, nothing is added to state. `greta` (R, 30 s, night): a translucent, kindly old potter (bun, apron, round glasses, soft blue glow) appears at `SPOTS.ghost`, bubble `'Psst … ich hab da was gehört.'`, and the hook shows `gretaHint(s)` as `toast(text, 'curiosity', 7000)` when the play starts (not on visits).
- `ACCIDENT_NAMES` (exact): `Der schiefe Heinrich`, `Tante Wackelpudding`, `Die tropfende Trude`, `Herr Knubbel`, `Die Glasurnase`, `Ottos Ohr`, `Der kleine Vulkan`, `Frau Krummhals`.
- `gretaHint(s: GameState): string` = `hintFor(newest glaze as RecipeInput, s)`, prefixed `'Greta flüstert: '`; when null: `'Greta flüstert: Du weißt jetzt alles, was ich wusste. Jetzt bist du dran.'`.

- [ ] **Step 1: Write the failing tests**: both plays render; the accident tag shows `ACCIDENT_NAMES[7 % 8]` for seed 7; `gretaHint(newGame(...))` starts with `'Greta flüstert: '` and isn't the fallback; with every effect discovered it is the fallback.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#scene&surprise=gluecksfehler` and `#scene&clock=2026-11-25T23:30&surprise=greta`. Check: the misfire is lovable and funny, its tag legible; Greta is gentle and warm, a grandmother, not a horror ghost.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): the happy accident and old Greta at the kiln

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Village map — stork on a roof, hot-air balloon, runaway sheep (art gate)

**Files:**
- Create: `src/client/art/surprises/VillageSurprises.tsx`
- Modify: `src/client/art/village/VillageMap.tsx`, `src/client/panels/village/VillagePanel.tsx`, `src/client/dev/VillagePage.tsx`, `src/client/surprises/{defs,spots}.ts`, `src/client/art/surprises/cards.tsx`
- Test: `test/client/villagemap.test.tsx`

**Interfaces:**
- `VillageMap` gets `me?: GameState` and `surprises?: SurpriseView`; when `me` is given it calls `useSurprises('village', me, false)` and draws `VillageSurprises` above the houses (the existing `mood` prop now comes from the view). `VillagePanel` passes `view.value`; `VillagePage` passes `mockWorkshop(now)` (with `&found=`/`&surprise=` flags).
- Defs (ambient, village): `dorf-storch` (C, 3 min, day): a stork on one leg on the roof of an occupied house (`seed` picks the plot), clacks its beak now and then; `ballon` (R, 40 s, day, not rain): a patched striped hot-air balloon drifts across the top of the map, a tiny figure waves from the basket; `schaf` (C, 3 min): one sheep stands somewhere silly — `VILLAGE_SPOTS.sillySheep[seed % 3]` = on the well's roof, on top of the notice board, on a house roof — with a tiny "mäh?".
- `VILLAGE_SPOTS`: read `PLOTS` and `BUILDING_SPOTS` at execution time (the village-long-goals plan has added spots) and keep every surprise and the Christmas stall clear of them all.

- [ ] **Step 1: Write the failing tests**: `VillageMap` with `surprises={still([play('ballon')])}` renders `data-surprise="ballon"`; `dorf-storch` sits on an occupied plot's roof; `schaf` with seed 1 uses the board spot; without `me` there is no surprises layer.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/villagemap.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#village&n=6&surprise=dorf-storch`, `ballon`, `schaf` (add the long-goals plan's "all buildings" dev flag if it has one). Check: readable at map scale, nothing covers a house door, the board or a building; phone layout fine.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat(art): stork, balloon and a runaway sheep in the village

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: The travelling merchant (art gate)

**Files:**
- Create: `src/shared/merchant.ts`, `src/client/panels/village/MerchantSheet.tsx`
- Modify: `src/shared/actions.ts`, `src/client/art/surprises/{VillageSurprises,cards}.tsx`, `src/client/art/workshop/Decor.tsx`, `src/client/panels/village/{VillagePanel,DecorPanel}.tsx`, `src/client/surprises/{defs,texts}.ts`, `src/client/dev/VillagePage.tsx`
- Test: `test/shared/merchant.test.ts`, `test/client/villagemap.test.tsx`, `test/worker/game.test.ts`

**Interfaces:**
- Produces (shared): `MERCHANT_STOCK: Record<string, number> = { kuckucksuhr: 900, globus: 600, vogelkaefig: 750, muschelkette: 300, schaukelpferd: 1200, sternlaterne: 450 }`; `merchantToday(playerId: string, now: number): { present: boolean; offer: string[]; leavesAt: number }` — `day = utcDay(now)`, `week = Math.floor((day + 3) / 7)` (Monday-based), present when `(day + 3) % 7 === hashString(\`${playerId}:${week}\`) % 7`; `offer` = 3 distinct stock ids by a seeded shuffle from `hashString(\`${playerId}:${week}:offer\`)` (same all week, sorted by price); `leavesAt = (day + 1) * DAY_MS`.
- Action `{ type: 'buyFromMerchant'; id: string }`, errors in order: `s.village === null` → `'Der Händler kommt nur ins Dorf'`; not present → `'Der Händler ist heute nicht da'`; id not in offer → `'Das hat der Händler diese Woche nicht'`; owned → `'Das hast du schon'`; price > Taler → `'Nicht genug Taler'`; then pay and `grantDecor`.
- Def: `haendler` (calendar, village, R, `when: merchantToday(c.s.playerId, c.now).present`) records the first sighting. `MerchantCart({ x, y, onClick })` at `VILLAGE_SPOTS.merchant`: a little covered wagon with a patched canopy, lanterns and a donkey, `data-hit="merchant"`; click opens `MerchantSheet` inside the village panel (like the visit view).
- `MerchantSheet({ s, now })` (texts exact): title `'Der fahrende Händler'`; intro `'Grüß dich! Heute hab ich was ganz Besonderes dabei. Morgen bin ich schon weiter.'`; per item: small decor preview, name, button `` `Kaufen · ${fmtTaler(price)} Taler` ``, or `'Hast du schon'` disabled; footer `'Nächste Woche komme ich wieder – mit anderen Schätzen.'`. Buying uses `dispatch` (normal, not quiet). `DecorPanel` empty text becomes `'Dekoration gibt es als Belohnung für Großaufträge im Dorf und für Kuriositäten.'`.
- Decor art for the six stock items. Dev: `#village&merchant` forces `present` and `&open` opens the sheet.

- [ ] **Step 1: Write the failing tests**

```ts
it('[Review Focus 5] the merchant comes one UTC day per week, with three stock items all week', () => {
  const days = Array.from({ length: 7 }, (_, i) => merchantToday('p1', (20_003 + i) * DAY_MS + 1));
  expect(days.filter((d) => d.present)).toHaveLength(1); // UTC days 20003..20009 are one Monday-based week ((20003 + 3) % 7 === 0)
  const at = days.findIndex((d) => d.present), t = (20_003 + at) * DAY_MS;
  expect(merchantToday('p1', t).present).toBe(true);
  expect(merchantToday('p1', t - 1).present).toBe(false);          // 23:59:59.999 the day before
  expect(merchantToday('p1', t + DAY_MS).present).toBe(false);
  expect(new Set(days.map((d) => d.offer.join()))).toHaveProperty('size', 1);
  expect(days[0].offer).toHaveLength(3);
});
it('buying: in a village, on the day, from the offer, once, with enough Taler', () => { /* each error message above, then success removes the price and grants the decor; second buy → 'Das hast du schon' */ });
```
Worker test: `buyFromMerchant` on a non-merchant day returns 400 with a German error. Client: `MerchantSheet` renders three items and `Kaufen · 600 Taler` style buttons.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/shared/merchant.test.ts test/client/villagemap.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces. The client always calls `merchantToday` with `serverTime()`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run test:worker && npm run check`
Expected: PASS.

- [ ] **Step 5: Art gate**

Run `npm run shot` for `#village&n=6&merchant` (`surprise-haendler`), `#village&merchant&open` (`surprise-haendler-sheet`), `#scene&decor=all` (overwrite `surprise-decor`). Check: wagon and donkey adorable; the sheet fits the phone; prices clear; six new decor items sit at free spots.

- [ ] **Step 6: Commit**

```bash
git add src test docs/screens/surprise-*.png && git commit -m "feat: the travelling merchant visits once a week

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Ship — album prizes art, consistency checks, e2e, README, full verification

**Files:**
- Modify: `src/client/art/workshop/Decor.tsx`, `src/client/art/surprises/cards.tsx`, `test/client/surprises.test.tsx`, `test/e2e/smoke.mjs`, `README.md`

**Interfaces:**
- Decor art: `ohrensessel` (a worn armchair with a knitted blanket), `goldfischglas` (a round bowl with one goldfish and a pebble), `drachenteppich` (a small wall tapestry stitched with the dragon from Task 9).

- [ ] **Step 1: Write the failing tests**

```ts
it('every album entry can be found and has card art', () => {
  const reachable = new Set([...SURPRISES.flatMap((d) => d.album), 'pflanze']);
  expect([...reachable].sort()).toEqual(Object.keys(CURIOSITIES).sort());
  for (const id of Object.keys(CURIOSITIES)) expect(CARD_ART[id], id).toBeDefined();
});
it('every decor item has art', () => { for (const id of Object.keys(DECOR)) expect(render(<DecorLayer placed={[id]} />)).toContain(`data-decor="${id}"`); });
it('album prizes stay reachable', () => { for (const p of ALBUM_PRIZES) expect(p.at).toBeLessThanOrEqual(Object.keys(CURIOSITIES).length); });
```
(If surprises were cut, the first test forces their `CURIOSITIES` entries out too; if fewer than 30 remain, drop the 30 prize and its decor.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/client/surprises.test.tsx`
Expected: FAIL (prize decor art missing).

- [ ] **Step 3: Implement** the three decor drawings; extend `test/e2e/smoke.mjs` after the first `.scene` wait: `await a.click('[data-hit="cat"]')`, wait for the toast `Neu im Kuriositätenkabinett: Schnurrende Katze`, then `GET /api/state` must have `curiosities['katze-streicheln']`; open the cabinet `[data-cabinet]` and expect `1 / 36 entdeckt` (use the real total). README: list the new dev flags (`&surprise=`, `&clock=`, `&found=`, `&plant=`, `&rain`, `&reduced`, `&touch`, `&decor=all`, `#village&merchant&open`) and a short "Kuriositäten" section in German.

- [ ] **Step 4: Full verification**

Run: `npx vitest run && npm run test:worker && npm run check`, then with `npm run dev` and `DEV_FAST=1`: `node test/e2e/smoke.mjs http://localhost:5173` and `node test/e2e/village-smoke.mjs http://localhost:5173`
Expected: all PASS, `SMOKE OK`.

- [ ] **Step 5: Final art gate**

Run: `npm run shot -- "http://localhost:5173/#scene&decor=all" surprise-decor`, `npm run shot -- "http://localhost:5173/#game&calm&panel=kabinett&found=all" surprise-album-full`, `npm run shot -- "http://localhost:5173/#scene" scene` and `npm run shot -- "http://localhost:5173/#game&calm" game`. Check the whole set side by side in `docs/screens/surprise-*.png`: consistent line weight and palette, nothing below the cute bar (cut per the rule if so), the everyday scene with no surprise playing still calm and uncluttered.

- [ ] **Step 6: Commit**

```bash
git add src test README.md docs/screens && git commit -m "feat: album prizes, surprise consistency checks, e2e and docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
