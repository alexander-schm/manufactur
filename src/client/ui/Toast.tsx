import { signal } from '@preact/signals';

export type ToastKind = 'info' | 'error' | 'discovery';
export type ToastItem = { id: number; text: string; kind: ToastKind };
export const toasts = signal<ToastItem[]>([]);
let next = 1;

export function toast(text: string, kind: ToastKind = 'info', ms = 3800) {
  const id = next++;
  toasts.value = [...toasts.value.slice(-3), { id, text, kind }];
  if (typeof window !== 'undefined') window.setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id); }, ms);
}

export function ToastStack() {
  return (
    <div class="toast-stack" aria-live="polite">
      {toasts.value.map((t) => <div key={t.id} class={`toast ${t.kind}`}>{t.text}</div>)}
    </div>
  );
}
