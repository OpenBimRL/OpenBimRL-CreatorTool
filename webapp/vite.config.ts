import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        port: 8000,
        host: '0.0.0.0',
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
        // ThatOpen + app code must share one three.js instance (peer dependency).
        dedupe: ['three'],
    },
    optimizeDeps: {
        include: ['three'],
    },
});
