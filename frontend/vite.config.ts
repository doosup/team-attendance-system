import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // /api → 백엔드. 같은 출처라 CORS 설정이 필요 없다.
    // xfwd: 브라우저의 실제 IP를 X-Forwarded-For로 넘긴다 (백엔드는 loopback에서 온 것만 믿음)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        xfwd: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
