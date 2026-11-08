import { STICKER_EMOJI } from '../../../shared/village/help';
import type { GuestbookEntry, NewsItem } from '../../../shared/village/types';

const when = (at: number) => new Date(at).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export function Guestbook({ entries }: { entries: GuestbookEntry[] }) {
  if (!entries.length) return <p class="muted">Noch keine Einträge. Wer zuerst kommt …</p>;
  return (
    <div class="guestbook">
      {[...entries].reverse().map((e, i) => (
        <div class="gb-entry" style={{ transform: `rotate(${(i % 3) - 1}deg)` }}>
          <span class="gb-sticker" aria-hidden="true">{STICKER_EMOJI[e.sticker] ?? '✦'}</span>
          <span><strong>{e.fromName}</strong> hat mit angepackt</span>
          <span class="muted">{when(e.at)}</span>
        </div>
      ))}
    </div>
  );
}

export function NewsList({ news, meId, seenAt }: { news: NewsItem[]; meId: string; seenAt: number }) {
  const mine = news.filter((n) => n.for === null || n.for === meId).slice().reverse();
  if (!mine.length) return <p class="muted">Im Dorf ist es noch ruhig.</p>;
  return (
    <ul class="news">
      {mine.map((n) => <li class={n.at > seenAt ? 'new' : ''}><span class="muted">{when(n.at)}</span> {n.text}</li>)}
    </ul>
  );
}
