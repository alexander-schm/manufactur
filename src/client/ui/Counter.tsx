import { inkStyle } from '../art/ink';

export function CoinIcon() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true">
      <ellipse cx="15" cy="17" rx="12" ry="11" fill="var(--clayDark)" style={inkStyle(2)} />
      <ellipse cx="15" cy="14" rx="12" ry="11" fill="var(--sun)" style={inkStyle(2)} />
      <ellipse cx="15" cy="14" rx="7.5" ry="6.5" fill="none" style={{ ...inkStyle(1.3), opacity: 0.6 }} />
      <text x="15" y="18.5" text-anchor="middle" font-size="12" font-family="var(--font-hand)" fill="var(--line)">T</text>
      <path d="M8 9 q2 -3 5 -3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true">
      <path d="M15 2.5 L18.6 10.6 L27.3 11.4 L20.7 17.2 L22.7 25.8 L15 21.3 L7.3 25.8 L9.3 17.2 L2.7 11.4 L11.4 10.6 Z" fill="var(--g3)" style={inkStyle(2)} />
      <path d="M12 12 l2 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8" />
    </svg>
  );
}

export function Counter({ icon, value, label }: { icon: 'coin' | 'star'; value: number; label: string }) {
  return (
    <span class="counter" title={label} aria-label={`${label}: ${Math.floor(value)}`}>
      {icon === 'coin' ? <CoinIcon /> : <StarIcon />}
      <span>{Math.floor(value).toLocaleString('de-DE')}</span>
    </span>
  );
}
