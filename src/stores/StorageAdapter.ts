import type { BoardkitState } from '../types.js';

/**
 * Storage is a coarse-grained document adapter: the engine keeps state in
 * memory and hands the full state to `saveAll` after every mutation.
 *
 * This is deliberately simple for v1 — it makes adapters trivial to write
 * (memory, JSON file, S3 object, browser storage) and is fine for the
 * single-writer scenarios a task engine embedded in one process serves.
 * A row-level SQL adapter interface is on the roadmap for multi-writer
 * deployments; the engine's mutation methods are already the transaction
 * boundaries that adapter will map onto.
 */
export interface StorageAdapter {
  /** Return the persisted state, or null when nothing has been saved yet. */
  loadAll(): Promise<BoardkitState | null>;
  saveAll(state: BoardkitState): Promise<void>;
}

export const emptyState = (): BoardkitState => ({
  version: 1,
  boards: {},
  lanes: {},
  cards: {},
});
