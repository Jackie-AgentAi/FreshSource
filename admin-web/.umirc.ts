import { defineConfig } from '@umijs/max';

export default defineConfig({
  routes: [
    {
      path: '/login',
      component: '@/pages/Login',
      layout: false,
    },
    {
      path: '/',
      component: '@/pages/Home',
      routes: [
        { path: '/', component: '@/pages/Home' },
        { path: '/users', component: '@/pages/Users' },
        { path: '/shops', component: '@/pages/Shops' },
        { path: '/products', component: '@/pages/Products' },
        { path: '/categories', component: '@/pages/Categories' },
        { path: '/orders', component: '@/pages/Orders' },
        { path: '/banners', component: '@/pages/Banners' },
        { path: '/configs', component: '@/pages/Configs' },
      ],
    },
  ],
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
  npmClient: 'npm',
});
