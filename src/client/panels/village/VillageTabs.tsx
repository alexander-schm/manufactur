import { me, view } from '../../store';
import { village } from '../../villageStore';
import { GiftPanel } from './GiftPanel';
import { JointOrdersPanel } from './JointOrdersPanel';
import { TradePanel } from './TradePanel';

export function VillageTabs({ tab }: { tab: 'joint' | 'trade' | 'gift' }) {
  const v = village.value, s = view.value, meId = me.value?.playerId ?? '';
  if (!v || !s) return null;
  if (tab === 'joint') return <JointOrdersPanel v={v} s={s} meId={meId} />;
  if (tab === 'trade') return <TradePanel v={v} s={s} meId={meId} />;
  return <GiftPanel v={v} s={s} meId={meId} />;
}
