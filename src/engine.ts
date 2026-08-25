import { BoardkitError, err } from './errors.js';
import { EventBus } from './events.js';
import { MemoryStore } from './stores/MemoryStore.js';
import { emptyState, type StorageAdapter } from './stores/StorageAdapter.js';
import type {
  Board,
  BoardkitEvent,
  BoardkitEventHandler,
  BoardkitEventType,
  BoardkitState,
  Card,
  ChecklistItem,
  CreateBoardInput,
  CreateCardInput,
  CreateLaneInput,
  ID,
  Lane,
  MoveCardInput,
  UpdateCardPatch,
  UserId,
} from './types.js';

export interface BoardkitOptions {
  /** Where state lives. Defaults to an in-memory store. */
  store?: StorageAdapter;
  /**
   * When true (default), a card's owner must be a member of its board.
   * Verticals that manage assignment differently can turn this off.
   */
  requireOwnerMembership?: boolean;
  /** Injectable clock — deterministic tests, no hidden Date.now() calls. */
  now?: () => Date;
  /**
   * Injectable id factory. Defaults to the web-standard
   * globalThis.crypto.randomUUID (Node ≥ 18 and all modern browsers), which
   * keeps the engine runnable in the browser.
   */
  idFactory?: () => ID;
}

/**
 * The Boardkit engine: boards with configurable lanes, movable cards
 * (created-by, freeform labels + color, due date, checklist, owner), board
 * members, and card→board links. Every mutation persists through the storage
 * adapter and emits exactly one typed event — the surface automation rules
 * and vertical domain logic subscribe to.
 *
 * All reads return deep copies: callers can never mutate engine state by
 * accident.
 */
export class Boardkit {
  private state: BoardkitState = emptyState();
  private readonly store: StorageAdapter;
  private readonly bus = new EventBus();
  private readonly requireOwnerMembership: boolean;
  private readonly now: () => Date;
  private readonly newId: () => ID;
  private initialized = false;

  constructor(options: BoardkitOptions = {}) {
    this.store = options.store ?? new MemoryStore();
    this.requireOwnerMembership = options.requireOwnerMembership ?? true;
    this.now = options.now ?? (() => new Date());
    this.newId = options.idFactory ?? (() => globalThis.crypto.randomUUID());
  }

  /** Load persisted state. Safe to call more than once. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.state = (await this.store.loadAll()) ?? emptyState();
    this.initialized = true;
  }

  /**
   * Deep copy of the complete state — for backups, exports, and remote
   * projections (the REST server's GET /state uses this).
   */
  snapshot(): BoardkitState {
    return structuredClone(this.state);
  }

  // ── Events ──────────────────────────────────────────────────────────────

  on(type: BoardkitEventType | '*', handler: BoardkitEventHandler): () => void {
    return this.bus.on(type, handler);
  }

  // ── Boards ──────────────────────────────────────────────────────────────

  async createBoard(input: CreateBoardInput): Promise<Board> {
    await this.init();
    if (!input.name?.trim()) err('invalid_input', 'Board name is required');
    if (!input.createdBy?.trim()) err('invalid_input', 'createdBy is required');

    const at = this.timestamp();
    const board: Board = {
      id: this.newId(),
      name: input.name.trim(),
      createdBy: input.createdBy,
      members: [{ id: input.createdBy, addedAt: at }],
      laneIds: [],
      createdAt: at,
      updatedAt: at,
    };
    this.state.boards[board.id] = board;

    for (const laneName of input.lanes ?? []) {
      const lane: Lane = { id: this.newId(), boardId: board.id, name: laneName, cardIds: [] };
      this.state.lanes[lane.id] = lane;
      board.laneIds.push(lane.id);
    }

    await this.commit({ type: 'board.created', boardId: board.id, userId: input.createdBy, at });
    return this.getBoard(board.id);
  }

  getBoard(boardId: ID): Board {
    return structuredClone(this.mustBoard(boardId));
  }

  listBoards(): Board[] {
    return Object.values(this.state.boards).map((b) => structuredClone(b));
  }

  async renameBoard(boardId: ID, name: string): Promise<Board> {
    await this.init();
    const board = this.mustBoard(boardId);
    if (!name?.trim()) err('invalid_input', 'Board name is required');
    board.name = name.trim();
    board.updatedAt = this.timestamp();
    await this.commit({ type: 'board.updated', boardId, at: board.updatedAt });
    return this.getBoard(boardId);
  }

  /**
   * Deletes the board with its lanes and cards. Cards elsewhere that pointed
   * at this board have their links cleared (a dangling pointer is worse than
   * a cleared one) — each clearing emits card.unlinked before board.deleted.
   */
  async deleteBoard(boardId: ID): Promise<void> {
    await this.init();
    this.mustBoard(boardId);
    const at = this.timestamp();

    for (const card of Object.values(this.state.cards)) {
      if (card.linkedBoardId === boardId && card.boardId !== boardId) {
        delete card.linkedBoardId;
        card.updatedAt = at;
        this.bus.emit({
          type: 'card.unlinked',
          boardId: card.boardId,
          laneId: card.laneId,
          cardId: card.id,
          detail: { reason: 'linked_board_deleted', deletedBoardId: boardId },
          at,
        });
      }
    }

    for (const card of Object.values(this.state.cards)) {
      if (card.boardId === boardId) delete this.state.cards[card.id];
    }
    for (const lane of Object.values(this.state.lanes)) {
      if (lane.boardId === boardId) delete this.state.lanes[lane.id];
    }
    delete this.state.boards[boardId];

    await this.commit({ type: 'board.deleted', boardId, at });
  }

  // ── Members ─────────────────────────────────────────────────────────────

  async addMember(boardId: ID, userId: UserId): Promise<Board> {
    await this.init();
    const board = this.mustBoard(boardId);
    if (!userId?.trim()) err('invalid_input', 'userId is required');
    if (board.members.some((m) => m.id === userId)) {
      err('duplicate_member', `User ${userId} is already a member of board ${boardId}`);
    }
    const at = this.timestamp();
    board.members.push({ id: userId, addedAt: at });
    board.updatedAt = at;
    await this.commit({ type: 'member.added', boardId, userId, at });
    return this.getBoard(boardId);
  }

  /**
   * Removing a member unassigns them as owner from the board's cards
   * (createdBy is historical and stays). The affected card ids ride the
   * member.removed event so subscribers can react per card.
   */
  async removeMember(boardId: ID, userId: UserId): Promise<Board> {
    await this.init();
    const board = this.mustBoard(boardId);
    const index = board.members.findIndex((m) => m.id === userId);
    if (index === -1) err('member_not_found', `User ${userId} is not a member of board ${boardId}`);

    const at = this.timestamp();
    board.members.splice(index, 1);
    board.updatedAt = at;

    const unassignedCardIds: ID[] = [];
    for (const card of Object.values(this.state.cards)) {
      if (card.boardId === boardId && card.owner === userId) {
        delete card.owner;
        card.updatedAt = at;
        unassignedCardIds.push(card.id);
      }
    }

    await this.commit({
      type: 'member.removed',
      boardId,
      userId,
      detail: { unassignedCardIds },
      at,
    });
    return this.getBoard(boardId);
  }

  // ── Lanes ───────────────────────────────────────────────────────────────

  async addLane(boardId: ID, input: CreateLaneInput): Promise<Lane> {
    await this.init();
    const board = this.mustBoard(boardId);
    if (!input.name?.trim()) err('invalid_input', 'Lane name is required');

    const lane: Lane = {
      id: this.newId(),
      boardId,
      name: input.name.trim(),
      ...(input.color !== undefined ? { color: input.color } : {}),
      cardIds: [],
    };
    this.state.lanes[lane.id] = lane;
    board.laneIds.splice(this.clampIndex(input.index, board.laneIds.length), 0, lane.id);
    board.updatedAt = this.timestamp();

    await this.commit({ type: 'lane.created', boardId, laneId: lane.id, at: board.updatedAt });
    return structuredClone(lane);
  }

  getLane(laneId: ID): Lane {
    return structuredClone(this.mustLane(laneId));
  }

  async updateLane(laneId: ID, patch: { name?: string; color?: string | null }): Promise<Lane> {
    await this.init();
    const lane = this.mustLane(laneId);
    if (patch.name !== undefined) {
      if (!patch.name.trim()) err('invalid_input', 'Lane name is required');
      lane.name = patch.name.trim();
    }
    if (patch.color === null) delete lane.color;
    else if (patch.color !== undefined) lane.color = patch.color;

    const at = this.touchBoard(lane.boardId);
    await this.commit({ type: 'lane.updated', boardId: lane.boardId, laneId, at });
    return structuredClone(lane);
  }

  async moveLane(laneId: ID, toIndex: number): Promise<Board> {
    await this.init();
    const lane = this.mustLane(laneId);
    const board = this.mustBoard(lane.boardId);

    const from = board.laneIds.indexOf(laneId);
    board.laneIds.splice(from, 1);
    board.laneIds.splice(this.clampIndex(toIndex, board.laneIds.length), 0, laneId);
    const at = this.touchBoard(board.id);

    await this.commit({
      type: 'lane.moved',
      boardId: board.id,
      laneId,
      detail: { fromIndex: from, toIndex: board.laneIds.indexOf(laneId) },
      at,
    });
    return this.getBoard(board.id);
  }

  /**
   * Deleting a lane that still holds cards requires a destination —
   * `moveCardsToLaneId` on the same board. Cards keep their relative order,
   * appended to the destination.
   */
  async deleteLane(laneId: ID, options: { moveCardsToLaneId?: ID } = {}): Promise<void> {
    await this.init();
    const lane = this.mustLane(laneId);
    const board = this.mustBoard(lane.boardId);
    const at = this.timestamp();

    if (lane.cardIds.length > 0) {
      const targetId = options.moveCardsToLaneId;
      if (!targetId) {
        err('lane_not_empty', `Lane ${laneId} has ${lane.cardIds.length} card(s); pass moveCardsToLaneId`);
      }
      const target = this.mustLane(targetId!);
      if (target.boardId !== lane.boardId) {
        err('lane_board_mismatch', 'moveCardsToLaneId must belong to the same board');
      }
      for (const cardId of lane.cardIds) {
        const card = this.state.cards[cardId]!;
        card.laneId = target.id;
        card.updatedAt = at;
        target.cardIds.push(cardId);
      }
      lane.cardIds = [];
    }

    board.laneIds = board.laneIds.filter((id) => id !== laneId);
    delete this.state.lanes[laneId];
    this.touchBoard(board.id, at);

    await this.commit({
      type: 'lane.deleted',
      boardId: board.id,
      laneId,
      ...(options.moveCardsToLaneId ? { detail: { movedCardsToLaneId: options.moveCardsToLaneId } } : {}),
      at,
    });
  }

  // ── Cards ───────────────────────────────────────────────────────────────

  async createCard(laneId: ID, input: CreateCardInput): Promise<Card> {
    await this.init();
    const lane = this.mustLane(laneId);
    const board = this.mustBoard(lane.boardId);
    if (!input.title?.trim()) err('invalid_input', 'Card title is required');
    if (!input.createdBy?.trim()) err('invalid_input', 'createdBy is required');
    if (input.owner) this.assertOwnerAllowed(board, input.owner);

    const at = this.timestamp();
    const card: Card = {
      id: this.newId(),
      boardId: board.id,
      laneId,
      title: input.title.trim(),
      ...(input.description !== undefined ? { description: input.description } : {}),
      createdBy: input.createdBy,
      ...(input.owner !== undefined ? { owner: input.owner } : {}),
      labels: input.labels ?? [],
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      checklist: (input.checklist ?? []).map((item) => ({
        id: this.newId(),
        text: item.text,
        done: item.done ?? false,
      })),
      createdAt: at,
      updatedAt: at,
    };
    this.state.cards[card.id] = card;
    lane.cardIds.splice(this.clampIndex(input.index, lane.cardIds.length), 0, card.id);
    this.touchBoard(board.id, at);

    await this.commit({
      type: 'card.created',
      boardId: board.id,
      laneId,
      cardId: card.id,
      userId: input.createdBy,
      at,
    });
    return structuredClone(card);
  }

  getCard(cardId: ID): Card {
    return structuredClone(this.mustCard(cardId));
  }

  /** Cards of one lane, in lane order. */
  listCards(laneId: ID): Card[] {
    const lane = this.mustLane(laneId);
    return lane.cardIds.map((id) => structuredClone(this.state.cards[id]!));
  }

  async updateCard(cardId: ID, patch: UpdateCardPatch): Promise<Card> {
    await this.init();
    const card = this.mustCard(cardId);
    const board = this.mustBoard(card.boardId);

    if (patch.title !== undefined) {
      if (!patch.title.trim()) err('invalid_input', 'Card title is required');
      card.title = patch.title.trim();
    }
    if (patch.description === null) delete card.description;
    else if (patch.description !== undefined) card.description = patch.description;
    if (patch.owner === null) delete card.owner;
    else if (patch.owner !== undefined) {
      this.assertOwnerAllowed(board, patch.owner);
      card.owner = patch.owner;
    }
    if (patch.labels !== undefined) card.labels = patch.labels;
    if (patch.dueDate === null) delete card.dueDate;
    else if (patch.dueDate !== undefined) card.dueDate = patch.dueDate;

    card.updatedAt = this.timestamp();
    this.touchBoard(board.id, card.updatedAt);
    await this.commit({
      type: 'card.updated',
      boardId: board.id,
      laneId: card.laneId,
      cardId,
      detail: { fields: Object.keys(patch) },
      at: card.updatedAt,
    });
    return this.getCard(cardId);
  }

  /**
   * Move a card within its lane (reorder) or to another lane on the same
   * board. Cross-board moves are intentionally unsupported in v1 — they raise
   * questions (does the owner remain valid? do links survive?) that deserve
   * their own design pass; see the roadmap.
   */
  async moveCard(cardId: ID, input: MoveCardInput = {}): Promise<Card> {
    await this.init();
    const card = this.mustCard(cardId);
    const fromLane = this.mustLane(card.laneId);
    const toLane = input.toLaneId ? this.mustLane(input.toLaneId) : fromLane;
    if (toLane.boardId !== card.boardId) {
      err('cross_board_move_unsupported', 'Cards can only move within their board in v1');
    }

    const fromIndex = fromLane.cardIds.indexOf(cardId);
    fromLane.cardIds.splice(fromIndex, 1);
    const toIndex = this.clampIndex(input.toIndex, toLane.cardIds.length);
    toLane.cardIds.splice(toIndex, 0, cardId);
    card.laneId = toLane.id;
    card.updatedAt = this.timestamp();
    this.touchBoard(card.boardId, card.updatedAt);

    await this.commit({
      type: 'card.moved',
      boardId: card.boardId,
      laneId: toLane.id,
      cardId,
      detail: { fromLaneId: fromLane.id, fromIndex, toLaneId: toLane.id, toIndex },
      at: card.updatedAt,
    });
    return this.getCard(cardId);
  }

  // ── Card → board links ──────────────────────────────────────────────────

  /** Point a card at another board (sub-board / drill-down). */
  async linkCardToBoard(cardId: ID, targetBoardId: ID): Promise<Card> {
    await this.init();
    const card = this.mustCard(cardId);
    this.mustBoard(targetBoardId);
    if (targetBoardId === card.boardId) {
      err('cannot_link_own_board', 'A card cannot point to the board it lives on');
    }
    card.linkedBoardId = targetBoardId;
    card.updatedAt = this.timestamp();
    await this.commit({
      type: 'card.linked',
      boardId: card.boardId,
      laneId: card.laneId,
      cardId,
      detail: { linkedBoardId: targetBoardId },
      at: card.updatedAt,
    });
    return this.getCard(cardId);
  }

  async unlinkCard(cardId: ID): Promise<Card> {
    await this.init();
    const card = this.mustCard(cardId);
    const previous = card.linkedBoardId;
    delete card.linkedBoardId;
    card.updatedAt = this.timestamp();
    await this.commit({
      type: 'card.unlinked',
      boardId: card.boardId,
      laneId: card.laneId,
      cardId,
      detail: { previousLinkedBoardId: previous ?? null },
      at: card.updatedAt,
    });
    return this.getCard(cardId);
  }

  async deleteCard(cardId: ID): Promise<void> {
    await this.init();
    const card = this.mustCard(cardId);
    const lane = this.mustLane(card.laneId);
    lane.cardIds = lane.cardIds.filter((id) => id !== cardId);
    delete this.state.cards[cardId];
    const at = this.touchBoard(card.boardId);
    await this.commit({ type: 'card.deleted', boardId: card.boardId, laneId: lane.id, cardId, at });
  }

  // ── Checklist ───────────────────────────────────────────────────────────

  async addChecklistItem(cardId: ID, text: string): Promise<ChecklistItem> {
    await this.init();
    const card = this.mustCard(cardId);
    if (!text?.trim()) err('invalid_input', 'Checklist item text is required');
    const item: ChecklistItem = { id: this.newId(), text: text.trim(), done: false };
    card.checklist.push(item);
    await this.commitChecklist(card);
    return structuredClone(item);
  }

  async toggleChecklistItem(cardId: ID, itemId: ID): Promise<ChecklistItem> {
    await this.init();
    const card = this.mustCard(cardId);
    const item = card.checklist.find((i) => i.id === itemId);
    if (!item) err('checklist_item_not_found', `Checklist item ${itemId} not found on card ${cardId}`);
    item!.done = !item!.done;
    await this.commitChecklist(card);
    return structuredClone(item!);
  }

  async removeChecklistItem(cardId: ID, itemId: ID): Promise<void> {
    await this.init();
    const card = this.mustCard(cardId);
    if (!card.checklist.some((i) => i.id === itemId)) {
      err('checklist_item_not_found', `Checklist item ${itemId} not found on card ${cardId}`);
    }
    card.checklist = card.checklist.filter((i) => i.id !== itemId);
    await this.commitChecklist(card);
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private mustBoard(id: ID): Board {
    return this.state.boards[id] ?? err('board_not_found', `Board ${id} not found`);
  }

  private mustLane(id: ID): Lane {
    return this.state.lanes[id] ?? err('lane_not_found', `Lane ${id} not found`);
  }

  private mustCard(id: ID): Card {
    return this.state.cards[id] ?? err('card_not_found', `Card ${id} not found`);
  }

  private assertOwnerAllowed(board: Board, owner: UserId): void {
    if (this.requireOwnerMembership && !board.members.some((m) => m.id === owner)) {
      err('owner_not_member', `Owner ${owner} is not a member of board ${board.id}`);
    }
  }

  private clampIndex(index: number | undefined, length: number): number {
    if (index === undefined) return length;
    return Math.max(0, Math.min(Math.trunc(index), length));
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private touchBoard(boardId: ID, at = this.timestamp()): string {
    const board = this.state.boards[boardId];
    if (board) board.updatedAt = at;
    return at;
  }

  private async commitChecklist(card: Card): Promise<void> {
    card.updatedAt = this.timestamp();
    this.touchBoard(card.boardId, card.updatedAt);
    await this.commit({
      type: 'checklist.updated',
      boardId: card.boardId,
      laneId: card.laneId,
      cardId: card.id,
      detail: { total: card.checklist.length, done: card.checklist.filter((i) => i.done).length },
      at: card.updatedAt,
    });
  }

  /** Persist, then emit. Subscribers only ever observe durable state. */
  private async commit(event: BoardkitEvent): Promise<void> {
    await this.store.saveAll(this.state);
    this.bus.emit(event);
  }
}

export { BoardkitError };
