import { useState } from 'preact/hooks';
import { Button } from '../ui/Button';
import { Counter } from '../ui/Counter';
import { Paper } from '../ui/Paper';
import { Sheet } from '../ui/Sheet';
import { Tabs } from '../ui/Tabs';
import { toast } from '../ui/Toast';

export function KitPage() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  return (
    <div style={{ padding: '24px', display: 'grid', gap: '24px', maxWidth: '820px' }}>
      <h1>Papier-Baukasten</h1>
      <div class="row">
        <Counter icon="coin" value={1234} label="Taler" />
        <Counter icon="star" value={42} label="Ruf" />
      </div>
      <div class="row">
        <Button variant="primary" onClick={() => toast('Gebrannt! Drei neue Vasen im Regal.')}>Brennen!</Button>
        <Button onClick={() => toast('Entdeckt: Seladon!', 'discovery')}>Entdecken</Button>
        <Button variant="quiet" onClick={() => toast('Nicht genug Taler', 'error')}>Leise</Button>
        <Button variant="good" small>Liefern</Button>
        <Button disabled>Gesperrt</Button>
      </div>
      <Tabs tabs={[{ id: 'a', label: 'Aufträge' }, { id: 'b', label: 'Werkstatt' }, { id: 'c', label: 'Leute' }]} value={tab} onChange={setTab} />
      <div class="grid2">
        <Paper tape tilt="l" seed={3}><h3>Frau Holzapfel</h3><p class="muted">Bäckerin</p><p>„Sechs gelbe Becher, bitte!“</p></Paper>
        <Paper seed={5} tilt="r"><h3>Herr Krummbein</h3><p class="muted">Wirt</p><p>„Krüge! Viele Krüge!“</p></Paper>
      </div>
      <div class="field"><label>Name deiner Manufaktur</label><input placeholder="z. B. Tonhausen" /></div>
      {open && <Sheet title="Töpferscheibe" onClose={() => setOpen(false)}><p>Hier wird gedreht.</p><Button variant="primary">Ausbauen</Button></Sheet>}
    </div>
  );
}
