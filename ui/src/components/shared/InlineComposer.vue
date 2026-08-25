<template>
  <form class="composer" @submit.prevent="submit">
    <textarea
      v-if="multiline"
      ref="field"
      v-model.trim="text"
      rows="2"
      :placeholder="placeholder"
      @keydown.enter.exact.prevent="submit"
      @keydown.esc="emit('cancel')"
    />
    <input
      v-else
      ref="field"
      v-model.trim="text"
      :placeholder="placeholder"
      @keydown.esc="emit('cancel')"
    />
    <div class="composer-actions">
      <button type="submit" class="btn-primary">{{ buttonLabel }}</button>
      <button type="button" class="btn-subtle" @click="emit('cancel')"><Icon name="x" /></button>
    </div>
  </form>
</template>

<script setup lang="ts">
// Shared inline composer for boards, lanes and cards: autofocuses, submits on
// Enter, cancels on Esc, clears and refocuses after submit (the parent owns
// whether the composer stays open).
import { onMounted, ref } from 'vue';
import Icon from './Icon.vue';

withDefaults(defineProps<{ placeholder: string; buttonLabel: string; multiline?: boolean }>(), {
  multiline: false,
});
const emit = defineEmits<{ (e: 'submit', text: string): void; (e: 'cancel'): void }>();

const text = ref('');
const field = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

onMounted(() => field.value?.focus());

function submit() {
  if (!text.value) return;
  emit('submit', text.value);
  text.value = '';
  field.value?.focus();
}
</script>
