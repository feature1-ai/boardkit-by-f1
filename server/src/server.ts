import { Boardkit, JsonFileStore } from '../../src/index.js';
import { createApp } from './app.js';
import { PostgresStore } from './PostgresStore.js';

/**
 * Boardkit server entry point.
 *
 * Storage selection:
 *   DATABASE_URL set        → Postgres (boardkit_state table, auto-created)
 *   otherwise               → JSON file (BOARDKIT_DATA_FILE, default ./data/boardkit.json)
 *
 * PORT defaults to 4400.
 */
const databaseUrl = process.env.DATABASE_URL;
const store = databaseUrl
  ? new PostgresStore(databaseUrl)
  : new JsonFileStore(process.env.BOARDKIT_DATA_FILE || './data/boardkit.json');

const engine = new Boardkit({ store });
await engine.init();

const app = createApp(engine);
const port = Number(process.env.PORT) || 4400;

app.listen(port, () => {
  console.log(`boardkit-server listening on :${port} (storage: ${databaseUrl ? 'postgres' : 'json file'})`);
});
