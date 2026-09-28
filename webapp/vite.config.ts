import vue from '@vitejs/plugin-vue';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const creatorToolVersion = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
).version as string;

function git(command: string): string {
    try {
        return execSync(command, {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return '';
    }
}

const gitSha = (process.env.GITHUB_SHA || git('git rev-parse HEAD')).slice(0, 7);
const gitBranch = process.env.GITHUB_REF_NAME || git('git rev-parse --abbrev-ref HEAD');

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        __CREATOR_TOOL_VERSION__: JSON.stringify(creatorToolVersion),
        __CREATOR_TOOL_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
        __CREATOR_TOOL_GIT_SHA__: JSON.stringify(gitSha),
        __CREATOR_TOOL_GIT_BRANCH__: JSON.stringify(gitBranch),
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
