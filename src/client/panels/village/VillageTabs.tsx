import { clockOffset, me, now, view } from '../../store';
import { village } from '../../villageStore';
import { GiftPanel } from './GiftPanel';
import { GreatKilnPanel } from './GreatKilnPanel';
import { JointOrdersPanel } from './JointOrdersPanel';
import { ProjectPanel } from './ProjectPanel';
import { TradePanel } from './TradePanel';

export function VillageTabs({ tab, onOpenMuseum }: { tab: 'joint' | 'project' | 'kiln' | 'trade' | 'gift'; onOpenMuseum?: () => void }) {
  const v = village.value, s = view.value, meId = me.value?.playerId ?? '';
  if (!v || !s) return null;
  const t = now.value + clockOffset.value;
  if (tab === 'joint') return <JointOrdersPanel v={v} s={s} meId={meId} />;
  if (tab === 'project') return <ProjectPanel v={v} s={s} meId={meId} now={t} onOpenMuseum={onOpenMuseum} />;
  if (tab === 'kiln') return <GreatKilnPanel v={v} s={s} meId={meId} now={t} />;
  if (tab === 'trade') return <TradePanel v={v} s={s} meId={meId} />;
  return <GiftPanel v={v} s={s} meId={meId} />;
}
