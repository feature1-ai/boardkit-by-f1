<template>
  <div class="modal-section modal-row">
    <div>
      <div class="modal-section-title"><Icon name="calendar" :size="13" /> Due date</div>
      <input
        type="date"
        :value="card.dueDate?.slice(0, 10) ?? ''"
        @change="emit('set-due', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div>
      <div class="modal-section-title"><Icon name="user" :size="13" /> Owner</div>
      <select :value="card.owner ?? ''" @change="emit('set-owner', ($event.target as HTMLSelectElement).value)">
        <option value="">— unassigned —</option>
        <option v-for="member in members" :key="member.id" :value="member.id">{{ member.id }}</option>
      </select>
    </div>
    <div>
      <div class="modal-section-title"><Icon name="link" :size="13" /> Links to board</div>
      <select :value="card.linkedBoardId ?? ''" @change="emit('set-link', ($event.target as HTMLSelectElement).value)">
        <option value="">— none —</option>
        <option v-for="board in otherBoards" :key="board.id" :value="board.id">{{ board.name }}</option>
      </select>
      <button
        v-if="card.linkedBoardId"
        class="btn-subtle"
        style="margin-left: 6px"
        @click="emit('open-board', card.linkedBoardId!)"
      >Open →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Card metadata row: due date, owner (board members only — the engine
// enforces the rule), and the card → board link with a jump action.
import type { Board, Card, Member } from '@boardkit/index.js';
import Icon from '../shared/Icon.vue';

defineProps<{ card: Card; members: Member[]; otherBoards: Board[] }>();
const emit = defineEmits<{
  (e: 'set-due', value: string): void;
  (e: 'set-owner', value: string): void;
  (e: 'set-link', value: string): void;
  (e: 'open-board', boardId: string): void;
}>();
</script>
