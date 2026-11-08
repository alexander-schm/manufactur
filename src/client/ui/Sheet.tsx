import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export function Sheet({ title, onClose, children, icon, wide }: { title: string; onClose: () => void; children: ComponentChildren; icon?: ComponentChildren; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div class="sheet-backdrop" onClick={onClose} />
      <section class={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <header class="sheet-head">
          {icon}
          <h2>{title}</h2>
          <button class="sheet-close" onClick={onClose} aria-label="Schließen">×</button>
        </header>
        <div class="sheet-body">{children}</div>
      </section>
    </>
  );
}
