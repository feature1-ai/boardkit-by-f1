<template>
  <div class="modal-section">
    <div class="modal-section-title"><Icon name="tag" :size="13" /> Labels</div>
    <div v-if="labels.length" class="label-chips">
      <span
        v-for="(label, i) in labels"
        :key="i"
        class="label-chip"
        :style="{ background: label.color || '#b3bac5' }"
      >
        {{ label.text }}
        <button @click="emit('remove', i)"><Icon name="x" :size="11" /></button>
      </span>
    </div>
    <div class="label-composer">
      <input v-model.trim="text" type="text" placeholder="Label text" style="width: 140px" @keydown.enter.prevent="add" />
      <button
        v-for="color in LABEL_COLORS"
        :key="color"
        class="label-swatch"
        :class="{ 'is-picked': picked === color }"
        :style="{ background: color }"
        :title="color"
        @click="picked = color"
      />
      <button class="btn-primary" @click="add">Add</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Freeform label editor: removable chips + text-and-palette composer.
import { ref } from 'vue';
import type { Label } from '@boardkit/index.js';
import { LABEL_COLORS } from '../../store.js';
import Icon from '../shared/Icon.vue';

defineProps<{ labels: Label[] }>();
const emit = defineEmits<{ (e: 'add', label: Label): void; (e: 'remove', index: number): void }>();

const text = ref('');
const picked = ref(LABEL_COLORS[0]!);

function add() {
  if (!text.value) return;
  emit('add', { text: text.value, color: picked.value });
  text.value = '';
}
</script>
