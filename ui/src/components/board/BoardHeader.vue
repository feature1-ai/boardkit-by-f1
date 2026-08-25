<template>
  <div class="board-header">
    <h1 class="board-title">{{ board.name }}</h1>
    <div class="board-members">
      <span v-for="member in board.members" :key="member.id" class="avatar" :title="member.id">
        {{ initials(member.id) }}
      </span>
      <form class="member-add" @submit.prevent="add">
        <input v-model.trim="name" placeholder="+ member" />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// Board header: title + member avatars + add-member form.
import { ref } from 'vue';
import type { Board } from '@boardkit/index.js';
import { initials } from '../../store.js';

defineProps<{ board: Board }>();
const emit = defineEmits<{ (e: 'add-member', userId: string): void }>();

const name = ref('');

function add() {
  if (!name.value) return;
  emit('add-member', name.value);
  name.value = '';
}
</script>
