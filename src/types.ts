/**
 * Boardkit core types.
 *
 * The engine is identity-agnostic: `UserId` is an opaque string owned by the
 * host application (your auth system, your tenant model). Boardkit stores and
 * validates relationships between ids; it never authenticates anyone.
 */

export type ID = string;
export type UserId = string;

/** ISO 8601 timestamp string. */
export type Timestamp = string;

export interface Member {
  id: UserId;
  addedAt: Timestamp;
}

/** Freeform label: any text, optional color (any CSS color string). */
export interface Label {
  text: string;
  color?: string;
}

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export interface Card {
  id: ID;
  boardId: ID;
  laneId: ID;
  title: string;
  description?: string;
  createdBy: UserId;
  owner?: UserId;
  labels: Label[];
  dueDate?: Timestamp;
  checklist: ChecklistItem[];
  /** A card can point to another board (sub-board / drill-down pattern). */
  linkedBoardId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Lane {
  id: ID;
  boardId: ID;
  name: string;
  color?: string;
  /** Ordered card ids — the single source of truth for card order. */
  cardIds: ID[];
}

export interface Board {
  id: ID;
  name: string;
  createdBy: UserId;
  members: Member[];
  /** Ordered lane ids — the single source of truth for lane order. */
  laneIds: ID[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** The complete persisted state, as handed to storage adapters. */
export interface BoardkitState {
  version: 1;
  boards: Record<ID, Board>;
  lanes: Record<ID, Lane>;
  cards: Record<ID, Card>;
}

// ── Inputs ────────────────────────────────────────────────────────────────

export interface CreateBoardInput {
  name: string;
  createdBy: UserId;
  /** Initial lane names, in order. */
  lanes?: string[];
}

export interface CreateLaneInput {
  name: string;
  color?: string;
  /** Insertion index into the board's lane order; defaults to the end. */
  index?: number;
}

export interface CreateCardInput {
  title: string;
  createdBy: UserId;
  description?: string;
  owner?: UserId;
  labels?: Label[];
  dueDate?: Timestamp;
  checklist?: Array<{ text: string; done?: boolean }>;
  /** Insertion index into the lane's card order; defaults to the end. */
  index?: number;
}

export interface UpdateCardPatch {
  title?: string;
  description?: string | null;
  owner?: UserId | null;
  labels?: Label[];
  dueDate?: Timestamp | null;
}

export interface MoveCardInput {
  /** Target lane (must belong to the card's board); defaults to the current lane. */
  toLaneId?: ID;
  /** Target index in the destination lane's order; defaults to the end. */
  toIndex?: number;
}

// ── Events ────────────────────────────────────────────────────────────────

export type BoardkitEventType =
  | 'board.created'
  | 'board.updated'
  | 'board.deleted'
  | 'member.added'
  | 'member.removed'
  | 'lane.created'
  | 'lane.updated'
  | 'lane.moved'
  | 'lane.deleted'
  | 'card.created'
  | 'card.updated'
  | 'card.moved'
  | 'card.linked'
  | 'card.unlinked'
  | 'card.deleted'
  | 'checklist.updated';

/**
 * Every mutation emits exactly one event. This is the extension surface the
 * workflow-automation layer (and any vertical's domain rules) subscribes to.
 */
export interface BoardkitEvent {
  type: BoardkitEventType;
  boardId: ID;
  laneId?: ID;
  cardId?: ID;
  userId?: UserId;
  /** Event-specific detail (e.g. from/to lane on card.moved). */
  detail?: Record<string, unknown>;
  at: Timestamp;
}

export type BoardkitEventHandler = (event: BoardkitEvent) => void;
