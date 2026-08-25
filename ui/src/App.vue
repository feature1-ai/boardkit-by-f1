<template>
  <div style="height: 100%; display: flex; flex-direction: column;">
    <header class="appbar">
      <span class="appbar-logo"><Icon name="board" :size="18" /> Boardkit</span>
      <nav class="appbar-boards">
        <button
          v-for="board in boards"
          :key="board.id"
          class="appbar-board-btn"
          :class="{ 'is-active': board.id === selectedBoardId }"
          @click="selectBoard(board.id)"
        >{{ board.name }}</button>
        <form v-if="composing" style="display: inline-flex; gap: 6px;" @submit.prevent="createBoard">
          <input ref="boardInput" v-model.trim="newBoardName" class="appbar-input" placeholder="Board name" @keydown.esc="composing = false" />
          <button type="submit" class="btn-primary">Create</button>
        </form>
        <button v-else class="appbar-add" @click="openComposer"><Icon name="plus" :size="14" /> Board</button>
      </nav>
      <span class="appbar-mode" :class="{ 'is-server': mode === 'server' }" :title="mode === 'server' ? 'Connected to the Boardkit server — state persists in its database' : 'No server detected — running in-browser against localStorage'">
        {{ mode === 'server' ? 'server' : 'local' }}
      </span>
    </header>

    <BoardView v-if="selectedBoard" :board-id="selectedBoard.id" @open-board="selectBoard" />
    <div v-else class="empty-state">
      <h2>No boards yet</h2>
      <p>Create your first board — it comes with Todo / Doing / Done lanes to start.</p>
      <button class="btn-primary" @click="openComposer">Create a board</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { CURRENT_USER, engine, mode, version } from './store.js';
import BoardView from './components/BoardView.vue';
import Icon from './components/Icon.vue';

const selectedBoardId = ref<string | null>(localStorage.getItem('boardkit-demo-selected'));
const composing = ref(false);
const newBoardName = ref('');
const boardInput = ref<HTMLInputElement | null>(null);

const boards = computed(() => {
  void version.value;
  return engine.listBoards();
});

const selectedBoard = computed(() => {
  void version.value;
  const list = engine.listBoards();
  return list.find((b) => b.id === selectedBoardId.value) ?? list[0] ?? null;
});

function selectBoard(id: string) {
  selectedBoardId.value = id;
  localStorage.setItem('boardkit-demo-selected', id);
}

async function openComposer() {
  composing.value = true;
  await nextTick();
  boardInput.value?.focus();
}

async function createBoard() {
  if (!newBoardName.value) return;
  const board = await engine.createBoard({
    name: newBoardName.value,
    createdBy: CURRENT_USER,
    lanes: ['Todo', 'Doing', 'Done'],
  });
  newBoardName.value = '';
  composing.value = false;
  selectBoard(board.id);
}
</script>
