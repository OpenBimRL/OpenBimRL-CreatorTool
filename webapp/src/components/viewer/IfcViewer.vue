<template>
    <div class="flex h-full min-h-0 flex-col">
        <ViewerRunBar
            :check-status-text="checkStatusText"
            :check-loading="checkLoading"
            :can-run-check="!!selected"
            :console-open="consoleOpen"
            :has-visuals="hasCheckVisuals"
            @run-check="runCheck"
            @stop-check="stopCheck"
            @toggle-console="toggleConsole"
            @clear-visuals="onClearVisuals"
        />
        <div ref="el" class="grid min-h-0 flex-1 grid-cols-7 bg-slate-100 dark:bg-default-darkest">
            <div ref="viewerContainer" class="relative col-span-6 dark:text-default-darkest">
                <div
                    v-show="loading"
                    class="absolute flex h-full w-full items-center justify-center bg-black/20 backdrop-blur-[1px]"
                >
                    <VueSpinnerCore :color="darkMode ? '#000' : '#fff'" :size="80" />
                </div>
                <GraphConsoleOverlay
                    :open="consoleOpen"
                    :minimized="consoleMinimized"
                    :text="consoleText"
                    @clear="clearConsole()"
                    @minimize="consoleMinimized = true"
                    @restore="consoleMinimized = false"
                />
            </div>
            <aside
                class="flex flex-col border-l border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
                <h4
                    class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                    Models
                </h4>
                <ul class="flex flex-col gap-1 overflow-auto">
                    <li v-for="[id, name] in models" :key="id">
                        <button
                            type="button"
                            class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
                            :class="
                                selected === id
                                    ? 'bg-accent/15 font-medium text-default-dark dark:bg-accent/20 dark:text-accent'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                            "
                            @click="selectModel(id)"
                        >
                            {{ name }}
                        </button>
                    </li>
                </ul>
            </aside>
        </div>
    </div>
</template>

<script setup lang="ts">
import Parser from '@/ParserOpenBIMRL';
import GraphConsoleOverlay from '@/components/graph/GraphConsoleOverlay.vue';
import { graphInjectionKey, parserInjectionKey } from '@/keys';
import {
    checkLoading,
    checkStatusText,
    clearConsole,
    consoleMinimized,
    consoleOpen,
    consoleText,
    toggleConsole,
} from '@/modules/checkSession';
import darkMode from '@/modules/darkmode';
import { getScene, init, loading, models, selected, updateModels } from '@/modules/ifcViewer';
import { runGraphCheck, stopGraphCheck } from '@/modules/runGraphCheck';
import { clearVisuals, hasCheckVisuals } from '@/modules/visualizer';
import type { GraphInject } from '@/components/graph/Types';
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { VueSpinnerCore } from 'vue3-spinners';
import ViewerRunBar from './ViewerRunBar.vue';

const { graph } = inject(graphInjectionKey) as GraphInject;
const parser = inject(parserInjectionKey) as Parser;

const viewerContainer = ref<HTMLElement | null>(null);
const loaded = ref(!!getScene() || false);

const onClearVisuals = () => {
    clearVisuals();
    checkStatusText.value = 'Visuals cleared';
};

const runCheck = async () => {
    if (!selected.value || checkLoading.value) return;
    await runGraphCheck(graph.value, parser, selected.value);
};

const stopCheck = () => {
    stopGraphCheck();
};

const selectModel = (id: string) => {
    selected.value = id;
};

watch(loaded, () => {
    const scene = getScene();
    if (!scene) return;
});

onUnmounted(() => {
    const scene = getScene();
    if (!scene) return;
});

onMounted(async () => {
    if (!viewerContainer.value) return;
    await init(viewerContainer.value);

    updateModels();
});
</script>
