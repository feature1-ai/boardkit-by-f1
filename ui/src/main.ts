import { createApp } from 'vue';
import App from './App.vue';
import { ready } from './store.js';
import './style.css';

// The engine loads persisted state before the first render.
await ready;
createApp(App).mount('#app');
