import type { Design, MakerMark } from '../types';

export interface Member {
  playerId: string;
  name: string;
  avatarSeed: number;
  makerMark: MakerMark;
  specialty: string;
  joinedAt: number;
  lastSeen: number;
  houseSlot: number;
}

/** Finished pieces travelling between workshops carry their design with them. */
export interface TransferStack {
  design: Design;
  quality: 1 | 2 | 3;
  effect: string | null;
  count: number;
  makerName: string;
  makerMark: MakerMark;
}

export type Give =
  | { kind: 'material'; material: string; count: number }
  | { kind: 'goods'; stack: TransferStack }
  | { kind: 'taler'; amount: number };

/** What a player offers from their own shelf (resolved to a TransferStack server-side). */
export type GiveRef =
  | { kind: 'material'; material: string; count: number }
  | { kind: 'goods'; designId: string; quality: 1 | 2 | 3; effect: string | null; count: number }
  | { kind: 'taler'; amount: number };

export interface Offer { id: string; from: string; give: Give; want: GiveRef & { kind: 'material' | 'taler' }; createdAt: number }
export interface RequestNote { id: string; from: string; material: string; count: number; createdAt: number }

export type JointPart =
  | { kind: 'goods'; form: string; count: number; minQuality: 1 | 2 | 3; colorFamily?: string }
  | { kind: 'material'; material: string; count: number };

export interface JointOrder {
  id: string;
  templateId: string;
  title: string;
  client: string;
  clientSeed: number;
  parts: (JointPart & { filled: number })[];
  /** value points per playerId */
  contributions: Record<string, number>;
  reward: { taler: number; ruf: number; decor: string };
  createdAt: number;
}

export interface NewsItem { id: string; at: number; text: string; for: string | null }
export interface GuestbookEntry { from: string; fromName: string; sticker: string; at: number }

export interface VillageState {
  schemaVersion: 1;
  version: number;
  villageId: string;
  name: string;
  nextId: number;
  rng: number;
  members: Member[];
  offers: Offer[];
  requests: RequestNote[];
  jointOrders: JointOrder[];
  completedJoint: number;
  buildings: string[];
  news: NewsItem[];
  guestbooks: Record<string, GuestbookEntry[]>;
  /** key `${helper}>${target}@${day}` → count */
  helpsGiven: Record<string, number>;
  /** current helping-hand boost end per player */
  helpBoostUntil: Record<string, number>;
}

export type VillageAction =
  | { type: 'postOffer'; give: GiveRef; want: GiveRef & { kind: 'material' | 'taler' } }
  | { type: 'cancelOffer'; offerId: string }
  | { type: 'acceptOffer'; offerId: string }
  | { type: 'gift'; to: string; give: GiveRef }
  | { type: 'postRequest'; material: string; count: number }
  | { type: 'removeRequest'; requestId: string }
  | { type: 'contribute'; jointId: string; part: number; count: number; source: 'own' | 'store'; designId?: string; quality?: 1 | 2 | 3; effect?: string | null }
  | { type: 'help'; target: string; sticker: string };

export const VILLAGE_ACTION_TYPES: VillageAction['type'][] = ['postOffer', 'cancelOffer', 'acceptOffer', 'gift', 'postRequest', 'removeRequest', 'contribute', 'help'];

export const STICKERS = ['herz', 'stern', 'blume', 'daumen', 'katze', 'vase'] as const;
export type Sticker = (typeof STICKERS)[number];

/** What a village operation does to one member's workshop. Applied by applyDelta. */
export interface WorkshopDelta {
  taler?: number;
  ruf?: number;
  materials?: Record<string, number>;
  goods?: TransferStack[];
  decor?: string[];
  helpBoostUntil?: number;
  village?: { specialty?: string | null; buildings?: string[]; members?: number; villageId?: string };
}

export interface Delivery { to: string; delta: WorkshopDelta }

/** What a member sees of the village. */
export type VillageView = Omit<VillageState, 'helpsGiven' | 'rng' | 'nextId' | 'helpBoostUntil'> & { helpsLeft: Record<string, number> };
