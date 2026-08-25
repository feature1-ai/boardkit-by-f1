import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Boardkit, MemoryStore } from '../../src/index.js';
import { createApp } from '../src/app.js';

const makeApp = () => createApp(new Boardkit({ store: new MemoryStore() }));

describe('boardkit server API', () => {
  it('drives the full board lifecycle over HTTP with X-User-Id identity', async () => {
    const app = makeApp();
    const as = (userId: string) => ({ 'X-User-Id': userId });

    // Board with lanes; creator identity from the header.
    const created = await request(app)
      .post('/boards')
      .set(as('alice'))
      .send({ name: 'Product', lanes: ['Todo', 'Done'] });
    expect(created.status).toBe(201);
    const board = created.body.board;
    expect(board.createdBy).toBe('alice');
    expect(board.laneIds).toHaveLength(2);

    // Member + card with owner.
    await request(app).post(`/boards/${board.id}/members`).send({ userId: 'bob' }).expect(201);
    const cardRes = await request(app)
      .post(`/lanes/${board.laneIds[0]}/cards`)
      .set(as('alice'))
      .send({ title: 'Ship it', owner: 'bob', labels: [{ text: 'urgent', color: '#eb5a46' }] });
    expect(cardRes.status).toBe(201);
    const card = cardRes.body.card;
    expect(card.owner).toBe('bob');

    // Move across lanes, checklist, link to another board.
    await request(app).post(`/cards/${card.id}/move`).send({ toLaneId: board.laneIds[1] }).expect(200);
    const item = (await request(app).post(`/cards/${card.id}/checklist`).send({ text: 'step' }).expect(201)).body.item;
    await request(app).post(`/cards/${card.id}/checklist/${item.id}/toggle`).expect(200);

    const other = (await request(app).post('/boards').set(as('alice')).send({ name: 'Sub' })).body.board;
    const linked = await request(app).post(`/cards/${card.id}/link`).send({ boardId: other.id }).expect(200);
    expect(linked.body.card.linkedBoardId).toBe(other.id);

    // Snapshot reflects everything.
    const state = (await request(app).get('/state').expect(200)).body;
    expect(Object.keys(state.boards)).toHaveLength(2);
    expect(state.cards[card.id].laneId).toBe(board.laneIds[1]);
    expect(state.cards[card.id].checklist[0].done).toBe(true);
  });

  it('maps engine error codes to HTTP statuses', async () => {
    const app = makeApp();
    const board = (await request(app).post('/boards').send({ name: 'B', lanes: ['L'] })).body.board;

    // 404 family.
    expect((await request(app).get('/boards/nope')).status).toBe(404);
    expect((await request(app).get('/cards/nope')).status).toBe(404);

    // 400: owner not a member.
    const badOwner = await request(app)
      .post(`/lanes/${board.laneIds[0]}/cards`)
      .send({ title: 'X', owner: 'stranger' });
    expect(badOwner.status).toBe(400);
    expect(badOwner.body.code).toBe('owner_not_member');

    // 409: duplicate member (creator is already a member).
    const dup = await request(app).post(`/boards/${board.id}/members`).send({ userId: 'anonymous' });
    expect(dup.status).toBe(409);

    // 400: deleting a non-empty lane without a destination.
    await request(app).post(`/lanes/${board.laneIds[0]}/cards`).send({ title: 'X' }).expect(201);
    const laneDelete = await request(app).delete(`/lanes/${board.laneIds[0]}`);
    expect(laneDelete.status).toBe(400);
    expect(laneDelete.body.code).toBe('lane_not_empty');
  });
});
