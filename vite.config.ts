import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages のようにサブパスで配信する場合は BASE_PATH を指定する
  // 例: BASE_PATH=/pokemonfrienda_pickbattle_repos/ npm run build
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
});
