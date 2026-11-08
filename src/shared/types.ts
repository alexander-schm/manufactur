export type Stage = 'prepare' | 'form' | 'dry' | 'bisque' | 'glaze' | 'glazeFire';
export const STAGES: Stage[] = ['prepare', 'form', 'dry', 'bisque', 'glaze', 'glazeFire'];

export type StationKind = 'prepBench' | 'wheel' | 'dryingRack' | 'kiln' | 'glazeTable' | 'shelf' | 'marketStall';

/** Each value is 0..1. */
export interface ProfileParams { height: number; belly: number; neck: number; foot: number; rim: number }

export type PatternKind = 'none' | 'stripes' | 'dots' | 'waves' | 'leaves';

export interface Design {
  id: string;
  name: string;
  form: string;
  profile: ProfileParams;
  handle: 'none' | 'round' | 'ear' | 'loop';
  rim: 'plain' | 'rolled' | 'flared';
  glazeId: string;
  pattern: PatternKind;
  /** css colour */
  patternColor: string;
  /** set on designs that arrived as gifts: drawn with the giver's mark, never produced here */
  origin?: { playerName: string; makerMark: MakerMark; glazeColor: string };
}

export interface FiringSettings {
  temp: 'niedrig' | 'mittel' | 'hoch';
  atmosphere: 'oxidierend' | 'reduzierend';
  cooling: 'schnell' | 'langsam';
}

export interface GlazeRecipe {
  id: string;
  name: string;
  base: 'transparent' | 'matt' | 'opak';
  colorant: string | null;
  /** 0..10 */
  colorantPct: number;
  firing: FiringSettings;
  color: string;
  effect: string | null;
}

export interface Batch {
  id: string;
  designId: string;
  count: number;
  stage: Stage;
  stationId: string | null;
  startedAt: number | null;
  durationMs: number;
  quality: number;
  /** speed multiplier from a hand-touch for the current stage */
  touch?: number;
  /** finished firing but the shelf is full; waits in the kiln */
  blocked?: boolean;
}

export interface Station { id: string; kind: StationKind; level: number; slot: number }

export interface Worker { id: string; seed: number; name: string; traits: string[]; xp: number; stationId: string | null }

export interface GoodsStack { designId: string; quality: 1 | 2 | 3; effect: string | null; count: number }

export interface Taste { form?: string; colorFamily?: string; pattern?: PatternKind; tall?: boolean; simple?: boolean }

export interface Order {
  id: string;
  customerSeed: number;
  customerName: string;
  customerJob: string;
  taste: Taste;
  form: string;
  count: number;
  minQuality: 1 | 2 | 3;
  rewardTaler: number;
  rewardRuf: number;
  bonusDeadline: number | null;
}

/** Auto-requeue a batch whenever the prepare stage is free. */
export interface StandingOrder { designId: string; batchSize: number; /** buy missing materials from the shop automatically */ autoBuy: boolean }

export interface AwayLog { since: number; made: number; sold: number; talerEarned: number; discoveries: string[] }

export interface MakerMark { shape: 'circle' | 'heart' | 'star' | 'leaf'; letter: string; color: string }

export interface GameState {
  schemaVersion: number;
  version: number;
  playerId: string;
  createdAt: number;
  lastTick: number;
  rng: number;
  taler: number;
  ruf: number;
  materials: Record<string, number>;
  stations: Station[];
  workers: Worker[];
  hirePool: Worker[];
  batches: Batch[];
  designs: Design[];
  glazes: GlazeRecipe[];
  goods: GoodsStack[];
  standing: StandingOrder | null;
  orders: Order[];
  stallDesignIds: string[];
  unlocks: string[];
  milestonesDone: string[];
  /** milestones whose celebration card the player has dismissed */
  milestonesAcked: string[];
  boostUntil: number;
  lastSeen: number;
  away: AwayLog | null;
  cooldowns: Record<string, number>;
  avatarSeed: number;
  makerMark: MakerMark;
  nextId: number;
  /** lifetime counters used by milestones */
  stats: { made: number; sold: number; ordersDone: number; experiments: number; designsSaved: number; effectsFound: number };
  /** game time of last order refill */
  lastOrderAt: number;
  /** fractional pieces sold by the stall, carried between events */
  stallCarry: number;
  /** the player's village, as last written by the village (null for players outside a village) */
  village: VillageSnapshot | null;
  /** decor items owned / placed in the workshop */
  decor: string[];
  decorPlaced: string[];
  /** ids of village operations / deliveries already applied here (exactly-once), newest last */
  appliedOps?: string[];
}

export interface VillageSnapshot {
  villageId: string;
  /** material id of this player's land specialty */
  specialty: string | null;
  buildings: string[];
  /** ×1.25 speed while now < this (friends lending a hand) */
  helpBoostUntil: number;
  /** fractional specialty units carried between catch-ups */
  trickleCarry: number;
  /** member count — foreign specialties only cost more once there's someone to trade with */
  members: number;
}
