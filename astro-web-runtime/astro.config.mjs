import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    tailwind(),
    icon({
      include: {
        'material-symbols': ['*'],
      },
    }),
  ],
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  },
});
