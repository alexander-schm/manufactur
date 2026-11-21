export const DAY_MS = 86_400_000;
export const MOUSE_GAP_MS = 3 * DAY_MS;

export type CuriosityGroup = 'werkstatt' | 'fenster' | 'dorf' | 'jahreszeiten';

export const CURIOSITY_GROUPS: { id: CuriosityGroup; title: string }[] = [
  { id: 'werkstatt', title: 'Werkstatt' },
  { id: 'fenster', title: 'Fenster' },
  { id: 'dorf', title: 'Dorf' },
  { id: 'jahreszeiten', title: 'Jahreszeiten' },
];

export interface CuriosityDef {
  id: string;
  group: CuriosityGroup;
  rarity: 'C' | 'R' | 'L';
  name: string;
  caption: string;
  hint: string;
  /** pays this decor item instead of Taler */
  decor?: string;
  /** only the server records it (never by a client action) */
  serverOnly?: boolean;
  chain?: { prev: string; minGapMs: number };
}

export const RARITY_TALER = { C: 5, R: 20, L: 50 } as const;

export const ALBUM_PRIZES: { at: number; decor: string }[] = [
  { at: 10, decor: 'ohrensessel' },
  { at: 20, decor: 'goldfischglas' },
  { at: 30, decor: 'drachenteppich' },
];

/** Table order is album order. */
export const CURIOSITIES: Record<string, CuriosityDef> = {
  'katze-streicheln': { id: 'katze-streicheln', group: 'werkstatt', rarity: 'C', name: 'Schnurrende Katze', caption: 'Einmal hinter den Ohren kraulen, und die ganze Werkstatt schnurrt mit.', hint: 'Die Katze mag es, wenn man nett zu ihr ist …' },
  'katze-beleidigt': { id: 'katze-beleidigt', group: 'werkstatt', rarity: 'C', name: 'Beleidigte Katze', caption: 'Fünfmal hintereinander? Jetzt reicht’s aber, sagt die Pfote.', hint: 'Man kann es mit dem Streicheln auch übertreiben …' },
  'katze-ofen': { id: 'katze-ofen', group: 'werkstatt', rarity: 'C', name: 'Ofenwärme', caption: 'Wenn der Ofen brennt, ist der beste Platz ganz oben.', hint: 'Wo ist es in der Werkstatt am wärmsten?' },
  'katze-topf': { id: 'katze-topf', group: 'werkstatt', rarity: 'R', name: 'Katze im Topf', caption: 'Frisch gedreht und schon besetzt. Passt wie angegossen.', hint: 'Ein frisch gedrehter Topf ist für manche ein Bett.' },
  'katze-jagd': { id: 'katze-jagd', group: 'werkstatt', rarity: 'R', name: 'Die Jägerin', caption: 'Erst die Augen, dann wackelt der Po, dann – Sprung!', hint: 'Wenn die Katze munter ist, beweg dich mal vor ihr hin und her …' },
  'katze-geschenk': { id: 'katze-geschenk', group: 'werkstatt', rarity: 'R', name: 'Ein Geschenk von der Katze', caption: 'Ein Knopf, eine Feder, eine einzelne Socke. Woher nur?', hint: 'Manchmal bringt die Katze etwas mit.', decor: 'socke' },
  'katze-schubs': { id: 'katze-schubs', group: 'werkstatt', rarity: 'R', name: 'Gerade noch gefangen', caption: 'Ein Stups mit der Pfote, ein Hechtsprung – nichts passiert!', hint: 'Die Katze schaut so verdächtig aufs Regal …' },
  'radio': { id: 'radio', group: 'werkstatt', rarity: 'C', name: 'Werkstattradio', caption: 'Walzer, Polka oder Jazz? Die Werkstatt wippt bei allem mit.', hint: 'Das alte Radio auf dem Regal geht noch.' },
  'teepause': { id: 'teepause', group: 'werkstatt', rarity: 'C', name: 'Teepause', caption: 'Wasser kocht, Becher hoch – auf die Werkstatt!', hint: 'Der Kessel auf dem Ofen pfeift, wenn man ihn lässt.' },
  'lichterkette': { id: 'lichterkette', group: 'werkstatt', rarity: 'C', name: 'Lichterwelle', caption: 'Ein Stups, und die Lichter tanzen einmal quer durch den Raum.', hint: 'Die Lichterkette ist kitzlig.' },
  'pflanze': { id: 'pflanze', group: 'werkstatt', rarity: 'R', name: 'Die Werkstattpflanze blüht', caption: 'Vier Tage Wasser, ein bisschen Geduld – und jetzt das!', hint: 'Der kleine Setzling am Fenster hat Durst. Jeden Tag ein bisschen.', serverOnly: true },
  'maus-1': { id: 'maus-1', group: 'werkstatt', rarity: 'C', name: 'Die Werkstattmaus', caption: 'Hinter der Fußleiste wohnt jemand. Mit sehr kleinen Schuhen.', hint: 'In der Fußleiste ist ein kleines Loch …' },
  'maus-2': { id: 'maus-2', group: 'werkstatt', rarity: 'R', name: 'Ton für die Maus', caption: 'Ein Krümel Ton, kaum größer als eine Erbse. Es ist ein Anfang.', hint: 'Die Maus hat Pläne. Schau in ein paar Tagen wieder nach.', chain: { prev: 'maus-1', minGapMs: MOUSE_GAP_MS } },
  'maus-3': { id: 'maus-3', group: 'werkstatt', rarity: 'R', name: 'Die Mäusescheibe', caption: 'Eine Drehscheibe aus einem Garnröllchen. Sie dreht sich sogar!', hint: 'Die Maus baut an etwas. Ein paar Tage noch.', chain: { prev: 'maus-2', minGapMs: MOUSE_GAP_MS } },
  'maus-4': { id: 'maus-4', group: 'werkstatt', rarity: 'L', name: 'Der Mäusemarkt', caption: 'Winzige Töpfe, winziges Schild: »Alles 1 Krümel«.', hint: 'Was die Maus wohl baut?', chain: { prev: 'maus-3', minGapMs: MOUSE_GAP_MS } },
  'plausch': { id: 'plausch', group: 'werkstatt', rarity: 'C', name: 'Ein Wort im Vorbeigehen', caption: 'Alle hier haben etwas zu erzählen. Man muss nur hinhören.', hint: 'Was deine Leute wohl sagen, wenn du sie anstupst?' },
  'tratsch': { id: 'tratsch', group: 'werkstatt', rarity: 'R', name: 'Werkstatttratsch', caption: 'Eine Katze, ein Herz, ein Topf. Mehr muss man nicht wissen.', hint: 'Wenn zwei gerade nichts zu tun haben …' },
  'gluecksfehler': { id: 'gluecksfehler', group: 'werkstatt', rarity: 'R', name: 'Ein glücklicher Fehlbrand', caption: 'Schief, verlaufen, einzigartig. Er hat jetzt sogar einen Namen.', hint: 'Manchmal macht der Ofen, was er will.' },
  'greta': { id: 'greta', group: 'werkstatt', rarity: 'R', name: 'Die alte Meisterin Greta', caption: 'Nachts am Ofen flüstert sie, was sie über Glasuren weiß.', hint: 'Nachts ist es am Ofen nicht so leer, wie man denkt …' },
  'drache': { id: 'drache', group: 'fenster', rarity: 'R', name: 'Der neugierige Drache', caption: 'Der Drache hat wieder ans Fenster gehaucht. Wer putzt das jetzt?', hint: 'Manchmal beschlägt das Fenster ganz von allein …', decor: 'drachenpluesch' },
  'igel': { id: 'igel', group: 'fenster', rarity: 'C', name: 'Igel auf Wanderschaft', caption: 'Tipp, tapp, tipp. Er hat es nicht eilig.', hint: 'Unten am Fenster raschelt es manchmal.' },
  'fuchs': { id: 'fuchs', group: 'fenster', rarity: 'C', name: 'Der Fuchs', caption: 'Er schaut rein, er schaut raus. Wahrscheinlich wegen der Katze.', hint: 'In der Dämmerung schaut jemand Rotes vorbei.' },
  'brieftaube': { id: 'brieftaube', group: 'fenster', rarity: 'C', name: 'Post per Taube', caption: 'Ein Brief von der Kundschaft – mit sehr eigenen Wünschen.', hint: 'Wer gurrt denn da auf dem Fensterbrett?' },
  'kinder': { id: 'kinder', group: 'fenster', rarity: 'C', name: 'Neugierige Nasen', caption: 'Drei Nasen an der Scheibe. Ob die später auch töpfern?', hint: 'Tagsüber kommen manchmal kleine Besucher ans Fenster.' },
  'schnecke': { id: 'schnecke', group: 'fenster', rarity: 'C', name: 'Schnecke im Regen', caption: 'Langsam, glänzend, glücklich. Endlich Regen!', hint: 'Bei Regen wird das Fenster zum Wanderweg.' },
  'storch': { id: 'storch', group: 'fenster', rarity: 'L', name: 'Der Storch mit dem Paket', caption: 'Ein Paket für die Werkstatt. Was da wohl drin ist?', hint: 'Ganz selten fliegt etwas Großes mit einem Paket vorbei.', decor: 'storchenmobile' },
  'eule': { id: 'eule', group: 'fenster', rarity: 'C', name: 'Die Nachteule', caption: 'Huhu. Sie passt auf, bis morgens alle wieder da sind.', hint: 'Nachts sitzt jemand auf dem Fensterbrett.' },
  'morgenvoegel': { id: 'morgenvoegel', group: 'fenster', rarity: 'C', name: 'Morgenkonzert', caption: 'Früh am Morgen gibt es Musik auf dem Fensterbrett.', hint: 'Wer früh kommt, hört sie singen.' },
  'dorf-storch': { id: 'dorf-storch', group: 'dorf', rarity: 'C', name: 'Storch auf dem Dach', caption: 'Er steht auf einem Bein und schaut, wer im Dorf was macht.', hint: 'Auf den Dächern im Dorf ist manchmal Besuch.' },
  'ballon': { id: 'ballon', group: 'dorf', rarity: 'R', name: 'Der Heißluftballon', caption: 'Ganz langsam treibt er über das Dorf. Jemand winkt!', hint: 'Schau im Dorf auch mal nach oben.' },
  'schaf': { id: 'schaf', group: 'dorf', rarity: 'C', name: 'Das Ausreißerschaf', caption: 'Wie ist es da bloß hinaufgekommen?', hint: 'Die Schafe im Dorf bleiben nicht immer auf der Wiese.' },
  'haendler': { id: 'haendler', group: 'dorf', rarity: 'R', name: 'Der fahrende Händler', caption: 'Einmal die Woche, nur für einen Tag – mit Schönem aus aller Welt.', hint: 'Einmal in der Woche kommt jemand mit einem Wagen ins Dorf.' },
  'abendlicht': { id: 'abendlicht', group: 'jahreszeiten', rarity: 'C', name: 'Feierabendlicht', caption: 'Wenn es dunkel wird, leuchtet die Werkstatt ganz warm.', hint: 'Komm doch mal am Abend vorbei.' },
  'dezember': { id: 'dezember', group: 'jahreszeiten', rarity: 'R', name: 'Winter in der Werkstatt', caption: 'Schnee vor dem Fenster, ein Bäumchen in der Ecke, und im Dorf duftet es nach Zimt.', hint: 'Im Dezember sieht alles ein bisschen anders aus.' },
  'silvester': { id: 'silvester', group: 'jahreszeiten', rarity: 'L', name: 'Feuerwerk', caption: 'Prost Neujahr! Sogar die Katze ist wach geblieben.', hint: 'Nur an einem Abend im Jahr ist der Himmel so bunt.', decor: 'gluecksschwein' },
  'geburtstag': { id: 'geburtstag', group: 'jahreszeiten', rarity: 'L', name: 'Werkstattgeburtstag', caption: 'Ein Jahr Werkstatt! Eine Torte, eine Kerze, ganz viel Ton.', hint: 'Weißt du noch, wann du die Werkstatt eröffnet hast?', decor: 'kerzenkranz' },
};
