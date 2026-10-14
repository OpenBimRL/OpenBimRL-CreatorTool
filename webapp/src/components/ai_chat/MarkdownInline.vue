<template>
    <template v-for="(token, index) in tokens" :key="index">
        <code
            v-if="token.kind === 'code'"
            class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.8em] text-default-dark dark:bg-slate-800 dark:text-slate-100"
            >{{ token.text }}</code
        >
        <strong
            v-else-if="token.kind === 'strong'"
            class="font-semibold text-default-dark dark:text-slate-100"
            >{{ token.text }}</strong
        >
        <em v-else-if="token.kind === 'em'">{{ token.text }}</em>
        <template v-else>{{ token.text }}</template>
    </template>
</template>

<script setup lang="ts">
import type { MarkdownInline } from '@/modules/aiChat/markdown';

defineProps<{
    tokens: MarkdownInline[];
}>();
</script>
