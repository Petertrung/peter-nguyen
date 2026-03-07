import { createWebHistory, createRouter } from 'vue-router'

import Home from './views/Home.vue'
import Portfolio from './views/Portfolio.vue'
import Business from './views/Business.vue'
import Resume from './views/Resume.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/portfolio', component: Portfolio },
  { path: '/resume', component: Resume },
  { path: '/business', component: Business },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})