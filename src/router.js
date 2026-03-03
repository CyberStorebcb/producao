import { createRouter, createWebHistory } from 'vue-router';
import TruckAnimation from './components/TruckAnimation.vue';

const routes = [
  {
    path: '/animacao-caminhao',
    name: 'TruckAnimation',
    component: TruckAnimation
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
