<template>
  <header class="lane-header">
    <span v-if="lane.color" class="lane-color-dot" :style="{ background: lane.color }" />
    <span class="lane-name">{{ lane.name }}</span>
    <span class="lane-count">{{ count }}</span>
    <button class="lane-delete" :title="deleteTitle" @click="emit('delete')"><Icon name="trash" :size="14" /></button>
  </header>
</template>

<script setup lang="ts">
// Lane header: color dot, name, card count, delete action.
import { computed } from 'vue';
import type { Lane } from '@boardkit/index.js';
import Icon from '../shared/Icon.vue';

const props = defineProps<{ lane: Lane; count: number }>();
const emit = defineEmits<{ (e: 'delete'): void }>();

const deleteTitle = computed(() =>
  props.count ? 'Delete lane (cards move to the first other lane)' : 'Delete lane');
</script>
