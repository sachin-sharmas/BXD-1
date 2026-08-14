import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  // relative, so a built deck can be opened from a folder or served anywhere
  base: './',
  // the deck's own images are in public/assets; keep the bundle out of there
  build: {
    assetsDir: 'bundle',
    // two entry points onto the same deck, exactly as the static build has
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        selfAssist: resolve(__dirname, 'self-assist.html'),
      },
    },
  },
});
