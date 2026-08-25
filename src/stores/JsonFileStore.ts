import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BoardkitState } from '../types.js';
import type { StorageAdapter } from './StorageAdapter.js';

/**
 * Durable single-file adapter. Writes are atomic: state is written to a
 * temp file in the same directory, then renamed over the target, so a crash
 * mid-write can never leave a truncated state file behind.
 */
export class JsonFileStore implements StorageAdapter {
  constructor(private readonly filePath: string) {}

  async loadAll(): Promise<BoardkitState | null> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(raw) as BoardkitState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async saveAll(state: BoardkitState): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = join(dirname(this.filePath), `.boardkit-${randomUUID()}.tmp`);
    await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tmpPath, this.filePath);
  }
}
