import pg from 'pg';
import type { BoardkitState, StorageAdapter } from '../../src/index.js';

/**
 * Postgres storage adapter. v1 uses the coarse document model the adapter
 * interface defines: the full state lives in one JSONB row, upserted
 * transactionally on every mutation. Right for a single server process
 * (which is what this server is); the row-level multi-writer adapter is a
 * separate roadmap item that will come with its own interface.
 *
 * The table is created on demand — point DATABASE_URL at any Postgres and go.
 */
export class PostgresStore implements StorageAdapter {
  private readonly pool: pg.Pool;
  private ready: Promise<void> | null = null;

  constructor(connectionString: string, private readonly stateId = 'default') {
    this.pool = new pg.Pool({ connectionString, max: 5 });
  }

  private ensureTable(): Promise<void> {
    this.ready ??= this.pool
      .query(
        `CREATE TABLE IF NOT EXISTS boardkit_state (
           id TEXT PRIMARY KEY,
           state JSONB NOT NULL,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`
      )
      .then(() => undefined);
    return this.ready;
  }

  async loadAll(): Promise<BoardkitState | null> {
    await this.ensureTable();
    const result = await this.pool.query('SELECT state FROM boardkit_state WHERE id = $1', [this.stateId]);
    return result.rows[0]?.state ?? null;
  }

  async saveAll(state: BoardkitState): Promise<void> {
    await this.ensureTable();
    await this.pool.query(
      `INSERT INTO boardkit_state (id, state, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [this.stateId, JSON.stringify(state)]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
