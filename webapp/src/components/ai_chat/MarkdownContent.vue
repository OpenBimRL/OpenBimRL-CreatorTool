<template>
    <div class="space-y-2 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        <template v-for="(block, index) in blocks" :key="index">
            <div
                v-if="block.kind === 'code'"
                class="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
            >
                <div
                    class="flex items-center justify-between border-b border-slate-200/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400"
                >
                    <span>{{ block.language || 'code' }}</span>
                    <button
                        type="button"
                        class="hover:text-slate-700 dark:hover:text-slate-200"
                        @click="copy(block.text, index)"
                    >
                        {{ copiedIndex === index ? 'Copied' : 'Copy' }}
                    </button>
                </div>
                <pre
                    class="overflow-x-auto p-2 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-100"
                ><code>{{ block.text }}</code></pre>
            </div>
            <p
                v-else-if="block.kind === 'heading'"
                class="font-semibold text-default-dark dark:text-slate-100"
            >
                <MarkdownInline :tokens="block.inline" />
            </p>
            <ol
                v-else-if="block.kind === 'list' && block.ordered"
                class="list-decimal space-y-1 pl-5"
            >
                <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
                    <MarkdownInline :tokens="item" />
                </li>
            </ol>
            <ul v-else-if="block.kind === 'list'" class="list-disc space-y-1 pl-5">
                <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
                    <MarkdownInline :tokens="item" />
                </li>
            </ul>
            <p v-else>
                <template v-for="(line, lineIndex) in block.lines" :key="lineIndex">
                    <br v-if="lineIndex > 0" />
                    <MarkdownInline :tokens="line" />
                </template>
            </p>
        </template>
    </div>
</template>

<script setup lang="ts">
import { parseMarkdown } from '@/modules/aiChat/markdown';
import { computed, ref } from 'vue';
import MarkdownInline from './MarkdownInline.vue';

const props = defineProps<{
    source: string;
}>();

const blocks = computed(() => parseMarkdown(props.source));
const copiedIndex = ref<number | null>(null);

const copy = async (text: string, index: number) => {
    try {
        await navigator.clipboard.writeText(text);
        copiedIndex.value = index;
        window.setTimeout(() => {
            if (copiedIndex.value === index) copiedIndex.value = null;
        }, 1500);
    } catch (error) {
        console.error(error);
    }
};
</script>
