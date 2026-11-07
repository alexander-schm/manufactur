export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div class="tabs" role="tablist">
      {tabs.map((t) => (
        <button role="tab" class="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}
