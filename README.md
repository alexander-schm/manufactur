# Manufaktur

Ein gemütliches Töpfer-Aufbauspiel für Freunde und Familie: Jede Person führt ihre eigene kleine Manufaktur, alle leben im selben Dorf, und alles läuft weiter, wenn man nicht da ist.

- Spieldesign: `docs/superpowers/specs/2026-11-07-manufaktur-design.md`
- Umsetzungsplan (Teil 1): `docs/superpowers/plans/2026-11-08-manufaktur-1-solo-foundation.md`
- Grafikstil-Referenz: `docs/art/art-style-reference.png`
- Aktuelle Bildschirmfotos: `docs/screens/`

## Technik

- **Cloudflare Workers** liefert die Seite (Static Assets) und die API unter `/api/*`.
- **D1** speichert Dörfer, Spieler, Sitzungen und je Spieler den Spielstand als JSON.
- **Gemeinsame Spiellogik** in `src/shared/` läuft identisch auf dem Server (verbindlich) und im Browser (Vorschau). Sie ist deterministisch: Zeit wird beim Laden „nachgerechnet“. Deshalb arbeitet die Werkstatt weiter, auch wenn niemand online ist.
- **Preact + SVG** für die Oberfläche. Alle Bilder (Töpferware, Leute, Werkstatt) werden im Code gezeichnet.

```
src/shared/   Spielregeln, Inhalte (deutsch), Simulation
src/worker/   API: Konten, Spielstand, Aktionen
src/client/   Oberfläche, Grafik, Panels
test/         Vitest (shared, client, worker) + test/e2e/smoke.mjs
```

## Entwickeln

```bash
npm install
npx wrangler d1 migrations apply manufaktur --local   # einmalig
echo "DEV_FAST=1" > .dev.vars                         # nur lokal: erlaubt /api/dev/warp für Tests
npm run dev                                            # http://localhost:5173
```

Entwickler-Seiten (nur im Dev-Modus):

- `/#kit`: Papier-UI-Baukasten
- `/#pots`: Töpferware
- `/#people`: Leute
- `/#scene`: Werkstatt
- `/#game&panel=orders`: Spielbildschirm mit Testdaten

## Testen

```bash
npm test               # Spiellogik + Oberfläche
npm run test:worker    # API im Workers-Runtime
npm run check          # TypeScript
node test/e2e/smoke.mjs http://localhost:5173   # Ende-zu-Ende (Dev-Server mit DEV_FAST=1)
node test/e2e/village-smoke.mjs http://localhost:5173   # zwei Spieler im Dorf: schenken, tauschen, helfen, Großauftrag
npm run shot -- "http://localhost:5173/#scene" scene   # Bildschirmfotos nach docs/screens/
```

## Veröffentlichen

```bash
npx wrangler login
npx wrangler d1 create manufaktur        # die ausgegebene database_id in wrangler.jsonc eintragen
npx wrangler d1 migrations apply manufaktur --remote
npm run deploy
node test/e2e/smoke.mjs https://<deine-url> --no-fast
```

Hinweis: Nach langer Abwesenheit rechnet der Server die verpasste Zeit in kleinen Häppchen nach, höchstens 3000 Ereignisse (ein paar Millisekunden) pro Anfrage. Der Browser lädt dabei einfach so lange nach, bis alles aufgeholt ist. So bleibt jede Anfrage unter den CPU-Grenzen des kostenlosen Workers-Plans.

Datenbank-Migrationen nach einem Update: `npx wrangler d1 migrations apply manufaktur --remote`.

## Das Dorf

- Bis zu 10 Leute pro Dorf, ausgelegt auf etwa 6.
- Jede Person hat eine Spezialität (Tongrube, Eisenerz, Kupfermine, Kobaltader oder Buchenwald). Die eigene ist günstig und wächst von allein nach, fremde Farbkörper und Holz kosten im Laden das Doppelte.
- Tauschbrett, Geschenke, Wünsche, Mit-anpacken (bis zu 3× am Tag pro Freund) und ein Gästebuch.
- Großaufträge gehen nur gemeinsam (mindestens zwei Leute). Alle bekommen einen Anteil, auch wer gerade nicht da ist. Material, das niemand hat, gibt es im Dorfladen zum dreifachen Preis.
- Alle zwei Großaufträge entsteht ein Dorfgebäude: Tongrube, Markthalle, Glasurbibliothek, Gildenhaus.
- Technisch: ein Durable Object pro Dorf (`VillageDO`), das alle Dorf-Aktionen nacheinander abarbeitet. Die Werkstätten bleiben in D1.

## Freunde einladen

Wer das Dorf gründet, bekommt einen Einladungscode und einen Link (`/?einladung=CODE`). Mit dem Link landen Freunde direkt im richtigen Dorf.
