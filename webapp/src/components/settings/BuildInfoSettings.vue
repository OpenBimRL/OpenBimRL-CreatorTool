<template>
    <dl class="space-y-2 text-sm">
        <div class="flex justify-between gap-4">
            <dt class="text-slate-500 dark:text-slate-400">Version</dt>
            <dd class="font-mono text-sm font-medium">{{ creatorToolVersion }}</dd>
        </div>
        <div class="flex justify-between gap-4">
            <dt class="shrink-0 text-slate-500 dark:text-slate-400">Built</dt>
            <dd class="text-right font-medium">{{ formattedBuildDate }}</dd>
        </div>
        <div class="flex justify-between gap-4">
            <dt class="text-slate-500 dark:text-slate-400">Environment</dt>
            <dd class="font-medium">{{ environmentLabel }}</dd>
        </div>
        <div v-if="creatorToolGitSha" class="flex justify-between gap-4">
            <dt class="text-slate-500 dark:text-slate-400">Commit</dt>
            <dd class="font-mono text-xs font-medium">{{ creatorToolGitSha }}</dd>
        </div>
        <div v-if="showBranch" class="flex justify-between gap-4">
            <dt class="text-slate-500 dark:text-slate-400">Branch</dt>
            <dd class="text-right font-medium">{{ creatorToolGitBranch }}</dd>
        </div>
    </dl>
</template>

<script setup lang="ts">
import {
    creatorToolBuildDate,
    creatorToolGitBranch,
    creatorToolGitSha,
    creatorToolVersion,
    formatBuildDate,
} from '@/modules/appInfo';

const formattedBuildDate = formatBuildDate(creatorToolBuildDate);
const environmentLabel = import.meta.env.PROD ? 'Production' : 'Development';
const showBranch = Boolean(creatorToolGitBranch && creatorToolGitBranch !== 'HEAD');
</script>
