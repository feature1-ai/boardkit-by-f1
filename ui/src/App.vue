<template>
  <div style="height: 100%; display: flex; flex-direction: column;">
    <AppBar :boards="boards" :selected-id="selectedBoard?.id ?? null" @select="selectBoard" @create="createBoard" />

    <BoardView v-if="selectedBoard" :board-id="selectedBoard.id" @open-board="selectBoard" />
    <div v-else class="empty-state">
      <h2>No boards yet</h2>
      <p>Create your first board — it comes with Todo / Doing / Done lanes to start.</p>
      <button class="btn-primary" @click="createBoard('My board')">Create a board</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// App shell: board selection state + the AppBar and the active BoardView.
import { computed, ref } from 'vue';
import { CURRENT_USER, engine, version } from './store.js';
import AppBar from './components/layout/AppBar.vue';
import BoardView from './components/board/BoardView.vue';

const selectedBoardId = ref<string | null>(localStorage.getItem('boardkit-demo-selected'));

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

async function createBoard(name: string) {
  const board = await engine.createBoard({
    name,
    createdBy: CURRENT_USER,
    lanes: ['Todo', 'Doing', 'Done'],
  });
  selectBoard(board.id);
}
</script>
