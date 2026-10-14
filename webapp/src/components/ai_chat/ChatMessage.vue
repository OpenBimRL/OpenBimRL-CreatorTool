<template>
    <div v-if="entry.role === 'user'" class="flex justify-end">
        <div
            class="user-bubble max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm px-3 py-2 text-sm text-default-dark dark:text-slate-100"
        >
            {{ entry.content }}
        </div>
    </div>

    <p
        v-else-if="entry.role === 'notice'"
        class="px-2 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400"
    >
        {{ entry.content }}
    </p>

    <div
        v-else-if="entry.role === 'error'"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
        <p class="whitespace-pre-wrap break-words">{{ entry.content }}</p>
        <RouterLink
            v-if="entry.settingsHint"
            to="/settings"
            class="mt-1 inline-block font-medium underline underline-offset-2"
        >
            Open Settings → AI Chatbot
        </RouterLink>
    </div>

    <div v-else class="space-y-2">
        <details
            v-if="entry.toolCalls.length"
            class="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/40"
            :open="entry.pending"
        >
            <summary
                class="cursor-pointer select-none font-medium text-slate-600 dark:text-slate-300"
            >
                {{ toolSummary }}
            </summary>
            <ul class="mt-1.5 space-y-0.5">
                <li
                    v-for="call in entry.toolCalls"
                    :key="call.id"
                    class="flex min-w-0 items-center gap-1.5 font-mono text-[11px]"
                    :title="
                        call.error ? `${call.name}: ${call.error}` : `${call.name} ${call.args}`
                    "
                >
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="statusClass(call)" />
                    <span class="shrink-0 text-slate-700 dark:text-slate-200">{{ call.name }}</span>
                    <span class="truncate text-slate-400 dark:text-slate-500">
                        {{ call.error ?? argsPreview(call.args) }}
                    </span>
                </li>
            </ul>
        </details>
        <MarkdownContent v-if="entry.content" :source="entry.content" />
        <p
            v-if="entry.changedGraph"
            class="text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
        >
            Graph changed. Use “Undo last AI change” to restore the previous state.
        </p>
    </div>
</template>

<script setup lang="ts">
import type { AgentToolEvent } from '@/modules/aiChat/agent';
import type { ChatEntry } from '@/modules/aiChat/session';
import { computed } from 'vue';
import MarkdownContent from './MarkdownContent.vue';

const props = defineProps<{
    entry: ChatEntry;
}>();

const toolSummary = computed(() => {
    const calls = props.entry.toolCalls;
    if (props.entry.pending) return `Using tools… (${calls.length})`;
    const changes = calls.filter(call => call.mutates && call.status === 'ok').length;
    const failed = calls.filter(call => call.status === 'error').length;
    return [
        `Used ${calls.length} tool${calls.length === 1 ? '' : 's'}`,
        changes ? `${changes} change${changes === 1 ? '' : 's'}` : '',
        failed ? `${failed} failed` : '',
    ]
        .filter(Boolean)
        .join(' · ');
});

const statusClass = (call: AgentToolEvent) => {
    if (call.status === 'running') return 'animate-pulse bg-amber-400';
    if (call.status === 'error') return 'bg-red-500';
    return call.mutates ? 'bg-blue-500' : 'bg-emerald-500';
};

const argsPreview = (args: string) => {
    try {
        const parsed = JSON.parse(args || '{}') as Record<string, unknown>;
        return Object.entries(parsed)
            .map(([key, value]) => {
                const text = typeof value === 'string' ? value : JSON.stringify(value);
                return `${key}=${text.length > 24 ? `${text.slice(0, 24)}…` : text}`;
            })
            .join(' ');
    } catch {
        return args;
    }
};
</script>

<style scoped>
.user-bubble {
    background-color: rgb(252 163 17 / 0.15);
}

:is(.dark) .user-bubble {
    background-color: rgb(252 163 17 / 0.2);
}
</style>
