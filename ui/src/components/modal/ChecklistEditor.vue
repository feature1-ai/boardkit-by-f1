<template>
  <div class="modal-section">
    <div class="modal-section-title">
      <Icon name="checklist" :size="13" /> Checklist
      <span v-if="items.length" class="checklist-progress">{{ done }}/{{ items.length }}</span>
    </div>
    <div v-for="item in items" :key="item.id" class="checklist-item" :class="{ 'is-done': item.done }">
      <button class="checklist-check" @click="emit('toggle', item.id)">
        <Icon v-if="item.done" name="check" :size="12" />
      </button>
      <span class="checklist-text">{{ item.text }}</span>
      <button class="checklist-remove" @click="emit('remove', item.id)"><Icon name="x" :size="12" /></button>
    </div>
    <form style="display: flex; gap: 6px; margin-top: 6px" @submit.prevent="add">
      <input v-model.trim="text" type="text" placeholder="Add an item" style="flex: 1" />
      <button type="submit" class="btn-primary">Add</button>
    </form>
  </div>
</template>

<script setup lang="ts">
// Checklist editor: toggleable items with progress, remove on hover, add form.
import { computed, ref } from 'vue';
import type { ChecklistItem } from '@boardkit/index.js';
import Icon from '../shared/Icon.vue';

const props = defineProps<{ items: ChecklistItem[] }>();
const emit = defineEmits<{
  (e: 'add', text: string): void;
  (e: 'toggle', itemId: string): void;
  (e: 'remove', itemId: string): void;
}>();

const text = ref('');
const done = computed(() => props.items.filter((i) => i.done).length);

function add() {
  if (!text.value) return;
  emit('add', text.value);
  text.value = '';
}
</script>
