<template>
    <aside
        class="flex h-full min-h-0 flex-col border-l border-slate-200/80 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900"
        :class="chatPanelOpen ? 'w-[26rem]' : 'w-[4.25rem]'"
    >
        <div
            class="flex h-14 shrink-0 items-center border-b border-slate-200/80 dark:border-slate-800"
            :class="chatPanelOpen ? 'gap-2 px-3' : 'justify-center px-2'"
        >
            <button
                type="button"
                class="btn-icon !h-9 !w-9 shrink-0"
                :title="chatPanelOpen ? 'Collapse AI assistant' : 'Expand AI assistant'"
                @click="togglePanel"
            >
                <ChatBubbleLeftRightIcon class="h-5 w-5" />
            </button>
            <template v-if="chatPanelOpen">
                <span
                    class="truncate text-sm font-semibold tracking-tight text-default-dark dark:text-slate-100"
                >
                    AI Assistant
                </span>
                <span
                    v-if="aiChatSettings.model"
                    class="badge-neutral min-w-0 max-w-[9rem] truncate"
                    :title="aiChatSettings.model"
                >
                    {{ aiChatSettings.model }}
                </span>
                <div class="ml-auto flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        class="btn-ghost !p-1.5"
                        title="Clear chat"
                        :disabled="chatBusy || !chatEntries.length"
                        @click="clearChat"
                    >
                        <TrashIcon class="h-4 w-4" />
                    </button>
                    <RouterLink to="/settings" class="btn-ghost !p-1.5" title="AI Chatbot settings">
                        <Cog6ToothIcon class="h-4 w-4" />
                    </RouterLink>
                </div>
            </template>
        </div>

        <div v-if="!chatPanelOpen" class="flex flex-col items-center gap-2 p-2">
            <button
                type="button"
                class="btn-icon !h-9 !w-9"
                :title="undoTitle"
                :disabled="!canUndoLastAiChange"
                @click="undo"
            >
                <ArrowUturnLeftIcon class="h-5 w-5" />
            </button>
            <span v-if="chatBusy" :title="chatStatusText || 'AI assistant is working'">
                <VueSpinnerDots size="20" :color="ACCENT_COLOR" />
            </span>
        </div>

        <template v-else>
            <div ref="scroller" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                <div
                    v-if="!isAiChatConfigured"
                    class="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200"
                >
                    Add an API key and choose a model in
                    <RouterLink to="/settings" class="font-medium underline underline-offset-2">
                        Settings → AI Chatbot
                    </RouterLink>
                    to start chatting.
                </div>

                <div v-if="!chatEntries.length" class="space-y-3 pt-2">
                    <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        Ask about the graph, the console or a node, let the assistant add and rewire
                        nodes, or have it write and fix custom Kotlin scripts. Changes of the last
                        prompt can be reverted with “Undo last AI change”.
                    </p>
                    <div class="flex flex-col items-stretch gap-1.5">
                        <button
                            v-for="example in examplePrompts"
                            :key="example"
                            type="button"
                            class="rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-left text-xs text-slate-600 transition-colors hover:border-accent/50 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            @click="useExample(example)"
                        >
                            {{ example }}
                        </button>
                    </div>
                </div>

                <ChatMessage v-for="entry in chatEntries" :key="entry.id" :entry="entry" />

                <div
                    v-if="chatBusy"
                    class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                >
                    <VueSpinnerDots size="16" :color="ACCENT_COLOR" />
                    <span class="truncate">{{ chatStatusText || 'Working…' }}</span>
                </div>
            </div>

            <div class="shrink-0 space-y-2 border-t border-slate-200/80 p-3 dark:border-slate-800">
                <button
                    type="button"
                    class="btn-secondary w-full !text-xs"
                    :title="undoTitle"
                    :disabled="!canUndoLastAiChange"
                    @click="undo"
                >
                    <ArrowUturnLeftIcon class="h-4 w-4" />
                    Undo last AI change
                </button>
                <div class="flex items-end gap-2">
                    <textarea
                        ref="input"
                        v-model="draft"
                        rows="3"
                        class="min-h-[4.5rem] w-full resize-none rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-soft placeholder:text-slate-400 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Ask the assistant… (Enter to send, Shift+Enter for a new line)"
                        @keydown="onInputKeydown"
                    />
                    <button
                        v-if="chatBusy"
                        type="button"
                        class="btn-danger !h-9 !w-9 shrink-0 !p-0"
                        title="Stop"
                        @click="stopChatPrompt"
                    >
                        <StopIcon class="h-4 w-4" />
                    </button>
                    <button
                        v-else
                        type="button"
                        class="btn-primary !h-9 !w-9 shrink-0 !p-0"
                        title="Send"
                        :disabled="!draft.trim()"
                        @click="send"
                    >
                        <PaperAirplaneIcon class="h-4 w-4" />
                    </button>
                </div>
            </div>
        </template>
    </aside>
</template>

<script setup lang="ts">
import { graphInjectionKey, parserInjectionKey } from '@/keys';
import type { EditorContext } from '@/modules/aiChat/graphOps';
import {
    canUndoLastAiChange,
    chatBusy,
    chatEntries,
    chatPanelOpen,
    chatStatusText,
    clearChat,
    sendChatPrompt,
    stopChatPrompt,
    undoLastAiChange,
    undoPromptText,
} from '@/modules/aiChat/session';
import { aiChatSettings, isAiChatConfigured } from '@/modules/aiChat/settings';
import {
    ArrowUturnLeftIcon,
    ChatBubbleLeftRightIcon,
    Cog6ToothIcon,
    PaperAirplaneIcon,
    StopIcon,
    TrashIcon,
} from '@heroicons/vue/24/outline';
import { computed, inject, nextTick, ref, watch } from 'vue';
import { VueSpinnerDots } from 'vue3-spinners';
import ChatMessage from './ChatMessage.vue';
import TWConf from '@/../tailwind.config';

const ACCENT_COLOR = TWConf.theme.extend.colors.default.contrast;

const ctx: EditorContext = {
    graph: inject(graphInjectionKey)!,
    parser: inject(parserInjectionKey)!,
};

const draft = ref('');
const scroller = ref<HTMLElement | null>(null);
const input = ref<HTMLTextAreaElement | null>(null);

const examplePrompts = [
    'Explain what the current graph checks.',
    'Why did the last check fail? Look at the console.',
    'Add a script node that rounds the selected node’s output to two decimals.',
];

const undoTitle = computed(() =>
    canUndoLastAiChange.value
        ? `Restore the graph as it was before: “${undoPromptText.value}”`
        : 'Nothing to undo: the last AI prompts did not change the graph.',
);

const togglePanel = () => {
    chatPanelOpen.value = !chatPanelOpen.value;
    if (chatPanelOpen.value) void nextTick(() => input.value?.focus());
};

const send = () => {
    const text = draft.value.trim();
    if (!text || chatBusy.value) return;
    draft.value = '';
    void sendChatPrompt(text, ctx);
};

const onInputKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    send();
};

const useExample = (example: string) => {
    draft.value = example;
    input.value?.focus();
};

const undo = () => {
    undoLastAiChange(ctx);
};

const scrollToBottom = () => {
    void nextTick(() => {
        if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
    });
};

watch(
    () => [
        chatEntries.value.length,
        chatEntries.value[chatEntries.value.length - 1]?.content,
        chatEntries.value[chatEntries.value.length - 1]?.toolCalls.length,
        chatStatusText.value,
        chatPanelOpen.value,
    ],
    scrollToBottom,
);
</script>
