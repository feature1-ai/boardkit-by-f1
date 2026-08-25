import { ref } from 'vue';
import { Boardkit } from '@boardkit/engine.js';
import type { BoardkitState, StorageAdapter } from '@boardkit/index.js';

/**
 * Browser storage adapter — the whole engine runs client-side; state
 * persists to localStorage. Same two-method interface as every adapter.
 */
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

export const engine = new Boardkit({ store: new LocalStorageStore() });

/** The demo's acting identity — creator of everything it makes. */
export const CURRENT_USER = 'you';

/**
 * Reactivity bridge: the engine is deliberately not reactive, so every
 * engine event bumps this version ref and views recompute from fresh
 * engine reads. Components depend on `version.value` inside computeds.
 */
export const version = ref(0);
engine.on('*', () => {
  version.value += 1;
});

export const ready = engine.init().then(() => {
  version.value += 1;
});

/** Trello-style flat label palette. */
export const LABEL_COLORS = [
  '#61bd4f', // green
  '#f2d600', // yellow
  '#ff9f1a', // orange
  '#eb5a46', // red
  '#c377e0', // purple
  '#0079bf', // blue
  '#00c2e0', // sky
  '#51e898', // lime
  '#344563', // slate
];

export const initials = (id: string): string =>
  id
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';
