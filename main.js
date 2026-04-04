import { createApp } from 'vue';
import { MotionPlugin } from '@vueuse/motion';
import App from './src/App.vue';
import router from './src/router';

createApp(App).use(router).use(MotionPlugin).mount('#app');
