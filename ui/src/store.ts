import { ref } from 'vue';
import { Boardkit } from '@boardkit/engine.js';
import type { Board, BoardkitState, Card, Lane, StorageAdapter } from '@boardkit/index.js';

/**
 * The UI talks to a `BoardClient` — one interface, two implementations:
 *
 *  • RemoteClient — the Boardkit REST server (Postgres/file-backed). Sync
 *    reads come from a local snapshot cache hydrated from GET /state; every
 *    mutation calls the API then re-hydrates; SSE keeps the cache live when
 *    other clients mutate.
 *  • Local engine — the Boardkit engine running in the browser against
 *    localStorage. Zero-server demo mode.
 *
 * The engine class already satisfies the interface (same method names), so
 * the fallback is literally the engine instance. Boot pings /health and
 * picks the mode; components import `engine` and never know the difference.
 */
export interface BoardClient {
  listBoards(): Board[];
  getBoard(boardId: string): Board;
  getLane(laneId: string): Lane;
  getCard(cardId: string): Card;
  listCards(laneId: string): Card[];
  createBoard(input: { name: string; createdBy: string; lanes?: string[] }): Promise<Board>;
  addMember(boardId: string, userId: string): Promise<unknown>;
  addLane(boardId: string, input: { name: string; color?: string; index?: number }): Promise<unknown>;
  deleteLane(laneId: string, options?: { moveCardsToLaneId?: string }): Promise<unknown>;
  createCard(laneId: string, input: Record<string, unknown>): Promise<unknown>;
  updateCard(cardId: string, patch: Record<string, unknown>): Promise<unknown>;
  moveCard(cardId: string, input: { toLaneId?: string; toIndex?: number }): Promise<unknown>;
  deleteCard(cardId: string): Promise<unknown>;
  linkCardToBoard(cardId: string, targetBoardId: string): Promise<unknown>;
  unlinkCard(cardId: string): Promise<unknown>;
  addChecklistItem(cardId: string, text: string): Promise<unknown>;
  toggleChecklistItem(cardId: string, itemId: string): Promise<unknown>;
  removeChecklistItem(cardId: string, itemId: string): Promise<unknown>;
}

export const CURRENT_USER = 'you';
export const version = ref(0);
export const mode = ref<'server' | 'local'>('local');
const bump = () => {
  version.value += 1;
};

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4400';

// ── Remote client ─────────────────────────────────────────────────────────

class RemoteClient implements BoardClient {
  private state: BoardkitState = { version: 1, boards: {}, lanes: {}, cards: {} };
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  async hydrate(): Promise<void> {
    const res = await fetch(`${API_URL}/state`);
    if (!res.ok) throw new Error(`GET /state failed: ${res.status}`);
    this.state = (await res.json()) as BoardkitState;
    bump();
  }

  /** SSE keeps this client live when other clients mutate the same server. */
  listen(): void {
    const source = new EventSource(`${API_URL}/events`);
    source.onmessage = () => {
      // Debounced: bursts of events collapse into one re-hydration.
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => void this.hydrate().catch(() => {}), 150);
    };
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-User-Id': CURRENT_USER },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error || `${method} ${path} failed`);
    await this.hydrate();
    return json as T;
  }

  private must<T>(value: T | undefined, what: string): T {
    if (!value) throw new Error(`${what} not found in snapshot`);
    return structuredClone(value);
  }

  // Sync reads — from the snapshot cache.
  listBoards(): Board[] {
    return Object.values(this.state.boards).map((b) => structuredClone(b));
  }
  getBoard(boardId: string): Board {
    return this.must(this.state.boards[boardId], `Board ${boardId}`);
  }
  getLane(laneId: string): Lane {
    return this.must(this.state.lanes[laneId], `Lane ${laneId}`);
  }
  getCard(cardId: string): Card {
    return this.must(this.state.cards[cardId], `Card ${cardId}`);
  }
  listCards(laneId: string): Card[] {
    return this.getLane(laneId).cardIds.map((id) => this.must(this.state.cards[id], `Card ${id}`));
  }

  // Mutations — REST calls followed by re-hydration.
  async createBoard(input: { name: string; lanes?: string[] }): Promise<Board> {
    const { board } = await this.call<{ board: Board }>('POST', '/boards', input);
    return board;
  }
  addMember(boardId: string, userId: string) {
    return this.call('POST', `/boards/${boardId}/members`, { userId });
  }
  addLane(boardId: string, input: { name: string; color?: string; index?: number }) {
    return this.call('POST', `/boards/${boardId}/lanes`, input);
  }
  deleteLane(laneId: string, options: { moveCardsToLaneId?: string } = {}) {
    const query = options.moveCardsToLaneId ? `?moveCardsToLaneId=${options.moveCardsToLaneId}` : '';
    return this.call('DELETE', `/lanes/${laneId}${query}`);
  }
  createCard(laneId: string, input: Record<string, unknown>) {
    return this.call('POST', `/lanes/${laneId}/cards`, input);
  }
  updateCard(cardId: string, patch: Record<string, unknown>) {
    return this.call('PATCH', `/cards/${cardId}`, patch);
  }
  moveCard(cardId: string, input: { toLaneId?: string; toIndex?: number }) {
    return this.call('POST', `/cards/${cardId}/move`, input);
  }
  deleteCard(cardId: string) {
    return this.call('DELETE', `/cards/${cardId}`);
  }
  linkCardToBoard(cardId: string, targetBoardId: string) {
    return this.call('POST', `/cards/${cardId}/link`, { boardId: targetBoardId });
  }
  unlinkCard(cardId: string) {
    return this.call('DELETE', `/cards/${cardId}/link`);
  }
  addChecklistItem(cardId: string, text: string) {
    return this.call('POST', `/cards/${cardId}/checklist`, { text });
  }
  toggleChecklistItem(cardId: string, itemId: string) {
    return this.call('POST', `/cards/${cardId}/checklist/${itemId}/toggle`);
  }
  removeChecklistItem(cardId: string, itemId: string) {
    return this.call('DELETE', `/cards/${cardId}/checklist/${itemId}`);
  }
}

// ── Local fallback ────────────────────────────────────────────────────────

class LocalStorageStore implements StorageAdapter {
  constructor(private readonly key = 'boardkit-demo') {}
  async loadAll(): Promise<BoardkitState | null> {
    const raw = localStorage.getItem(this.key);
    return raw ? (JSON.parse(raw) as BoardkitState) : null;
  }
  async saveAll(state: BoardkitState): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}

// ── Boot: pick the mode ───────────────────────────────────────────────────

export let engine: BoardClient;

export const ready = (async () => {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error('unhealthy');
    const remote = new RemoteClient();
    await remote.hydrate();
    remote.listen();
    engine = remote;
    mode.value = 'server';
  } catch {
    const local = new Boardkit({ store: new LocalStorageStore() });
    local.on('*', bump);
    await local.init();
    engine = local;
    mode.value = 'local';
  }
  bump();
})();

/** Trello-vivid label palette — pops on the dark Feature1 surfaces. */
export const LABEL_COLORS = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0',
  '#0079bf', '#00c2e0', '#51e898', '#7c6dfa',
];

export const initials = (id: string): string =>
  id
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';
