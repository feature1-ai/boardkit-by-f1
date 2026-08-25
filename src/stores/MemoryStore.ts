import type { BoardkitState } from '../types.js';
import type { StorageAdapter } from './StorageAdapter.js';

/**
 * In-memory adapter — the zero-config default. State lives for the process
 * lifetime. Snapshots are deep-copied on both save and load so engine state
 * and stored state can never alias each other.
 */
export class MemoryStore implements StorageAdapter {
  private state: BoardkitState | null = null;

  async loadAll(): Promise<BoardkitState | null> {
    return this.state ? structuredClone(this.state) : null;
  }

  async saveAll(state: BoardkitState): Promise<void> {
    this.state = structuredClone(state);
  }
}
