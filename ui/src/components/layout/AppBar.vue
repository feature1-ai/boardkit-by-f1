<template>
  <header class="appbar">
    <span class="appbar-logo"><Icon name="board" :size="18" /> Boardkit</span>
    <nav class="appbar-boards">
      <button
        v-for="board in boards"
        :key="board.id"
        class="appbar-board-btn"
        :class="{ 'is-active': board.id === selectedId }"
        @click="emit('select', board.id)"
      >{{ board.name }}</button>

      <form v-if="composing" style="display: inline-flex; gap: 6px;" @submit.prevent="create">
        <input ref="input" v-model.trim="name" class="appbar-input" placeholder="Board name" @keydown.esc="composing = false" />
        <button type="submit" class="btn-primary">Create</button>
      </form>
      <button v-else class="appbar-add" @click="open"><Icon name="plus" :size="14" /> Board</button>
    </nav>

    <span
      class="appbar-mode"
      :class="{ 'is-server': mode === 'server' }"
      :title="mode === 'server'
        ? 'Connected to the Boardkit server — state persists in its database'
        : 'No server detected — running in-browser against localStorage'"
    >{{ mode }}</span>
  </header>
</template>

<script setup lang="ts">
// App bar: brand, board switcher with inline new-board composer, and the
// storage-mode chip (server = REST + DB, local = in-browser engine).
import { nextTick, ref } from 'vue';
import type { Board } from '@boardkit/index.js';
import { mode } from '../../store.js';
import Icon from '../shared/Icon.vue';

defineProps<{ boards: Board[]; selectedId: string | null }>();
const emit = defineEmits<{ (e: 'select', boardId: string): void; (e: 'create', name: string): void }>();

const composing = ref(false);
const name = ref('');
const input = ref<HTMLInputElement | null>(null);

async function open() {
  composing.value = true;
  await nextTick();
  input.value?.focus();
}

function create() {
  if (!name.value) return;
  emit('create', name.value);
  name.value = '';
  composing.value = false;
}
</script>
