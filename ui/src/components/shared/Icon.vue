<template>
  <!-- Flat single-color icon set, drawn from primitive shapes (no path-data
       dependencies, no icon font, no external assets). Inherits currentColor. -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'plus'">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </template>
    <template v-else-if="name === 'x'">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </template>
    <template v-else-if="name === 'trash'">
      <line x1="3" y1="5" x2="13" y2="5" />
      <line x1="6.5" y1="3" x2="9.5" y2="3" />
      <rect x="4.5" y="5" width="7" height="8" rx="1" />
      <line x1="6.8" y1="7.5" x2="6.8" y2="10.5" />
      <line x1="9.2" y1="7.5" x2="9.2" y2="10.5" />
    </template>
    <template v-else-if="name === 'pencil'">
      <line x1="3" y1="13" x2="6" y2="12.4" />
      <line x1="3" y1="13" x2="3.6" y2="10" />
      <line x1="3.6" y1="10" x2="10.5" y2="3.1" />
      <line x1="10.5" y1="3.1" x2="12.9" y2="5.5" />
      <line x1="12.9" y1="5.5" x2="6" y2="12.4" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="2.5" y="4" width="11" height="9.5" rx="1.5" />
      <line x1="2.5" y1="7" x2="13.5" y2="7" />
      <line x1="5.5" y1="2.5" x2="5.5" y2="5" />
      <line x1="10.5" y1="2.5" x2="10.5" y2="5" />
    </template>
    <template v-else-if="name === 'check'">
      <polyline points="3.5,8.5 6.5,11.5 12.5,4.5" />
    </template>
    <template v-else-if="name === 'checklist'">
      <polyline points="2.5,4.5 3.7,5.7 5.8,3.4" />
      <line x1="8" y1="4.5" x2="13.5" y2="4.5" />
      <polyline points="2.5,10.5 3.7,11.7 5.8,9.4" />
      <line x1="8" y1="10.5" x2="13.5" y2="10.5" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="8" cy="5.5" r="2.8" />
      <polyline points="2.8,13.5 3.4,10.9 5.9,9.6" fill="none" />
      <polyline points="13.2,13.5 12.6,10.9 10.1,9.6" fill="none" />
      <line x1="2.8" y1="13.5" x2="13.2" y2="13.5" />
    </template>
    <template v-else-if="name === 'board'">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <line x1="6.2" y1="2.5" x2="6.2" y2="13.5" />
      <line x1="9.8" y1="2.5" x2="9.8" y2="9.5" />
    </template>
    <template v-else-if="name === 'link'">
      <rect x="1.8" y="6" width="6" height="4" rx="2" />
      <rect x="8.2" y="6" width="6" height="4" rx="2" />
      <line x1="6" y1="8" x2="10" y2="8" />
    </template>
    <template v-else-if="name === 'dots'">
      <circle cx="3.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'tag'">
      <polygon points="2.5,2.5 8,2.5 13.5,8 8,13.5 2.5,8" fill="none" />
      <circle cx="5.6" cy="5.6" r="1" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 16 });
</script>
