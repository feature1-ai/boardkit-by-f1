import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Boardkit, JsonFileStore } from '../src/index.js';

const dirs: string[] = [];
const tempFile = () => {
  const dir = mkdtempSync(join(tmpdir(), 'boardkit-'));
  dirs.push(dir);
  return join(dir, 'nested', 'state.json');
};

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('JsonFileStore', () => {
  it('returns null before anything is saved', async () => {
    const store = new JsonFileStore(tempFile());
    expect(await store.loadAll()).toBeNull();
  });

  it('round-trips full engine state across restarts, creating directories as needed', async () => {
    const filePath = tempFile();

    const first = new Boardkit({ store: new JsonFileStore(filePath) });
    const board = await first.createBoard({ name: 'Durable', createdBy: 'u1', lanes: ['Todo', 'Done'] });
    const card = await first.createCard(board.laneIds[0]!, {
      title: 'Persist me',
      createdBy: 'u1',
      labels: [{ text: 'infra', color: '#333' }],
      checklist: [{ text: 'a' }],
    });
    await first.moveCard(card.id, { toLaneId: board.laneIds[1]! });

    const second = new Boardkit({ store: new JsonFileStore(filePath) });
    await second.init();
    const reloaded = second.getCard(card.id);
    expect(reloaded.title).toBe('Persist me');
    expect(reloaded.laneId).toBe(board.laneIds[1]);
    expect(reloaded.labels).toEqual([{ text: 'infra', color: '#333' }]);
    expect(second.listCards(board.laneIds[1]!)).toHaveLength(1);
  });
});
