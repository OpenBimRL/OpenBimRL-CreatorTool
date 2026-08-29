import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const creatorToolVersion = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
).version as string;

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        __CREATOR_TOOL_VERSION__: JSON.stringify(creatorToolVersion),
    },
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
