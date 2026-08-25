import { describe, expect, it } from 'vitest';
import { Boardkit, BoardkitError, MemoryStore } from '../src/index.js';
import type { BoardkitEvent } from '../src/index.js';

const ALICE = 'user-alice';
const BOB = 'user-bob';

const makeEngine = () => {
  let tick = 0;
  return new Boardkit({
    store: new MemoryStore(),
    now: () => new Date(Date.UTC(2026, 7, 25, 12, 0, tick++)),
  });
};

const makeBoard = async (engine: Boardkit, lanes = ['Todo', 'Doing', 'Done']) =>
  engine.createBoard({ name: 'Product', createdBy: ALICE, lanes });

const code = (fn: () => Promise<unknown>) =>
  fn().then(
    () => 'no-error',
    (e) => (e instanceof BoardkitError ? e.code : `unexpected:${e}`)
  );

describe('boards and lanes', () => {
  it('creates a board with configurable lanes in order, creator as member', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);

    expect(board.laneIds).toHaveLength(3);
    expect(board.laneIds.map((id) => engine.getLane(id).name)).toEqual(['Todo', 'Doing', 'Done']);
    expect(board.members.map((m) => m.id)).toEqual([ALICE]);
    expect(board.createdBy).toBe(ALICE);
  });

  it('adds, renames, colors, reorders and deletes lanes', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine, ['A', 'C']);

    const b = await engine.addLane(board.id, { name: 'B', color: '#7c6dfa', index: 1 });
    expect(engine.getBoard(board.id).laneIds.map((id) => engine.getLane(id).name)).toEqual(['A', 'B', 'C']);
    expect(engine.getLane(b.id).color).toBe('#7c6dfa');

    await engine.updateLane(b.id, { name: 'B2', color: null });
    expect(engine.getLane(b.id).name).toBe('B2');
    expect(engine.getLane(b.id).color).toBeUndefined();

    await engine.moveLane(b.id, 0);
    expect(engine.getBoard(board.id).laneIds[0]).toBe(b.id);

    await engine.deleteLane(b.id);
    expect(engine.getBoard(board.id).laneIds).toHaveLength(2);
    expect(await code(async () => engine.getLane(b.id))).toBe('lane_not_found');
  });

  it('refuses to delete a non-empty lane unless cards get a destination', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);
    const [todo, doing] = board.laneIds as [string, string];
    await engine.createCard(todo, { title: 'T1', createdBy: ALICE });
    await engine.createCard(todo, { title: 'T2', createdBy: ALICE });

    expect(await code(() => engine.deleteLane(todo))).toBe('lane_not_empty');

    await engine.deleteLane(todo, { moveCardsToLaneId: doing });
    expect(engine.listCards(doing).map((c) => c.title)).toEqual(['T1', 'T2']);
  });
});

describe('cards', () => {
  it('carries created-by, freeform labels with color, due date, checklist and owner', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);
    await engine.addMember(board.id, BOB);

    const card = await engine.createCard(board.laneIds[0]!, {
      title: 'Ship it',
      createdBy: ALICE,
      owner: BOB,
      labels: [{ text: 'urgent', color: '#ef4444' }, { text: 'growth' }],
      dueDate: '2026-09-01T00:00:00.000Z',
      checklist: [{ text: 'write' }, { text: 'review', done: true }],
    });

    expect(card.createdBy).toBe(ALICE);
    expect(card.owner).toBe(BOB);
    expect(card.labels).toEqual([{ text: 'urgent', color: '#ef4444' }, { text: 'growth' }]);
    expect(card.dueDate).toBe('2026-09-01T00:00:00.000Z');
    expect(card.checklist.map((i) => [i.text, i.done])).toEqual([['write', false], ['review', true]]);
  });

  it('owner must be a board member (and the rule is switchable off)', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);

    expect(
      await code(() => engine.createCard(board.laneIds[0]!, { title: 'X', createdBy: ALICE, owner: BOB }))
    ).toBe('owner_not_member');

    const lax = new Boardkit({ requireOwnerMembership: false });
    const laxBoard = await lax.createBoard({ name: 'B', createdBy: ALICE, lanes: ['L'] });
    const card = await lax.createCard(laxBoard.laneIds[0]!, { title: 'X', createdBy: ALICE, owner: BOB });
    expect(card.owner).toBe(BOB);
  });

  it('updates fields, clears with null, and validates new owners', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);
    const card = await engine.createCard(board.laneIds[0]!, {
      title: 'X', createdBy: ALICE, dueDate: '2026-09-01T00:00:00.000Z',
    });

    const updated = await engine.updateCard(card.id, {
      title: 'Y', description: 'details', dueDate: null, labels: [{ text: 'later' }],
    });
    expect(updated.title).toBe('Y');
    expect(updated.description).toBe('details');
    expect(updated.dueDate).toBeUndefined();
    expect(updated.labels).toEqual([{ text: 'later' }]);

    expect(await code(() => engine.updateCard(card.id, { owner: BOB }))).toBe('owner_not_member');
  });

  it('manages checklists: add, toggle, remove', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);
    const card = await engine.createCard(board.laneIds[0]!, { title: 'X', createdBy: ALICE });

    const item = await engine.addChecklistItem(card.id, 'step one');
    expect((await engine.toggleChecklistItem(card.id, item.id)).done).toBe(true);
    expect((await engine.toggleChecklistItem(card.id, item.id)).done).toBe(false);

    await engine.removeChecklistItem(card.id, item.id);
    expect(engine.getCard(card.id).checklist).toHaveLength(0);
    expect(await code(() => engine.toggleChecklistItem(card.id, item.id))).toBe('checklist_item_not_found');
  });
});

describe('moving cards', () => {
  it('reorders within a lane and moves across lanes at a target index', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);
    const [todo, doing] = board.laneIds as [string, string];
    const a = await engine.createCard(todo, { title: 'A', createdBy: ALICE });
    const b = await engine.createCard(todo, { title: 'B', createdBy: ALICE });
    const c = await engine.createCard(todo, { title: 'C', createdBy: ALICE });

    // Reorder within lane: C to the front.
    await engine.moveCard(c.id, { toIndex: 0 });
    expect(engine.listCards(todo).map((x) => x.title)).toEqual(['C', 'A', 'B']);

    // Across lanes, into the middle.
    const d = await engine.createCard(doing, { title: 'D', createdBy: ALICE });
    await engine.moveCard(a.id, { toLaneId: doing, toIndex: 0 });
    expect(engine.listCards(doing).map((x) => x.title)).toEqual(['A', 'D']);
    expect(engine.listCards(todo).map((x) => x.title)).toEqual(['C', 'B']);
    expect(engine.getCard(a.id).laneId).toBe(doing);

    // Out-of-range indexes clamp instead of throwing.
    await engine.moveCard(b.id, { toLaneId: doing, toIndex: 99 });
    expect(engine.listCards(doing).map((x) => x.title)).toEqual(['A', 'D', 'B']);
    expect(d.id).toBeTruthy();
  });

  it('rejects cross-board moves in v1', async () => {
    const engine = makeEngine();
    const one = await makeBoard(engine);
    const two = await engine.createBoard({ name: 'Other', createdBy: ALICE, lanes: ['L'] });
    const card = await engine.createCard(one.laneIds[0]!, { title: 'X', createdBy: ALICE });

    expect(await code(() => engine.moveCard(card.id, { toLaneId: two.laneIds[0]! }))).toBe(
      'cross_board_move_unsupported'
    );
  });
});

describe('members', () => {
  it('adds members once and unassigns their cards on removal', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine);
    await engine.addMember(board.id, BOB);
    expect(await code(() => engine.addMember(board.id, BOB))).toBe('duplicate_member');

    const card = await engine.createCard(board.laneIds[0]!, { title: 'X', createdBy: ALICE, owner: BOB });
    const events: BoardkitEvent[] = [];
    engine.on('member.removed', (e) => events.push(e));

    await engine.removeMember(board.id, BOB);
    expect(engine.getCard(card.id).owner).toBeUndefined();
    expect(engine.getCard(card.id).createdBy).toBe(ALICE); // createdBy is historical
    expect(events[0]?.detail?.unassignedCardIds).toEqual([card.id]);
  });
});

describe('card → board links', () => {
  it('links a card to another board, never its own', async () => {
    const engine = makeEngine();
    const one = await makeBoard(engine);
    const two = await engine.createBoard({ name: 'Sub', createdBy: ALICE, lanes: ['L'] });
    const card = await engine.createCard(one.laneIds[0]!, { title: 'X', createdBy: ALICE });

    expect(await code(() => engine.linkCardToBoard(card.id, one.id))).toBe('cannot_link_own_board');
    expect(await code(() => engine.linkCardToBoard(card.id, 'nope'))).toBe('board_not_found');

    const linked = await engine.linkCardToBoard(card.id, two.id);
    expect(linked.linkedBoardId).toBe(two.id);
    expect((await engine.unlinkCard(card.id)).linkedBoardId).toBeUndefined();
  });

  it('deleting a board clears links pointing at it and cascades its contents', async () => {
    const engine = makeEngine();
    const one = await makeBoard(engine);
    const two = await engine.createBoard({ name: 'Sub', createdBy: ALICE, lanes: ['L'] });
    const card = await engine.createCard(one.laneIds[0]!, { title: 'X', createdBy: ALICE });
    const subCard = await engine.createCard(two.laneIds[0]!, { title: 'Y', createdBy: ALICE });
    await engine.linkCardToBoard(card.id, two.id);

    const unlinked: BoardkitEvent[] = [];
    engine.on('card.unlinked', (e) => unlinked.push(e));

    await engine.deleteBoard(two.id);
    expect(engine.getCard(card.id).linkedBoardId).toBeUndefined();
    expect(unlinked[0]?.detail?.deletedBoardId).toBe(two.id);
    expect(await code(async () => engine.getCard(subCard.id))).toBe('card_not_found');
    expect(await code(async () => engine.getBoard(two.id))).toBe('board_not_found');
  });
});

describe('events and persistence', () => {
  it('every mutation emits exactly one primary event with board context', async () => {
    const engine = makeEngine();
    const events: string[] = [];
    engine.on('*', (e) => events.push(e.type));

    const board = await makeBoard(engine, ['L1']);
    const card = await engine.createCard(board.laneIds[0]!, { title: 'X', createdBy: ALICE });
    await engine.moveCard(card.id, { toIndex: 0 });
    await engine.addChecklistItem(card.id, 'step');
    await engine.deleteCard(card.id);

    expect(events).toEqual(['board.created', 'card.created', 'card.moved', 'checklist.updated', 'card.deleted']);
  });

  it('a throwing subscriber never breaks the mutation', async () => {
    const engine = makeEngine();
    engine.on('*', () => {
      throw new Error('bad subscriber');
    });
    const board = await makeBoard(engine, ['L']);
    expect(engine.getBoard(board.id).name).toBe('Product');
  });

  it('state survives a restart through the storage adapter', async () => {
    const store = new MemoryStore();
    const first = new Boardkit({ store });
    const board = await first.createBoard({ name: 'Durable', createdBy: ALICE, lanes: ['L'] });
    await first.createCard(board.laneIds[0]!, { title: 'Persisted', createdBy: ALICE });

    const second = new Boardkit({ store });
    await second.init();
    expect(second.getBoard(board.id).name).toBe('Durable');
    expect(second.listCards(board.laneIds[0]!).map((c) => c.title)).toEqual(['Persisted']);
  });

  it('reads return copies — mutating them never corrupts engine state', async () => {
    const engine = makeEngine();
    const board = await makeBoard(engine, ['L']);
    const copy = engine.getBoard(board.id);
    copy.name = 'hacked';
    copy.laneIds.pop();
    expect(engine.getBoard(board.id).name).toBe('Product');
    expect(engine.getBoard(board.id).laneIds).toHaveLength(1);
  });
});
