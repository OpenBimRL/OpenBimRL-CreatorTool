<template>
    <div class="flex h-full min-h-0 flex-col">
        <ViewerRunBar
            :check-status-text="checkStatusText"
            :check-loading="checkLoading"
            :can-run-check="!!selected"
            :can-fit-view="!!selected"
            :console-open="consoleOpen"
            :has-visuals="hasCheckVisuals"
            :visuals-visible="checkVisualsVisible"
            @run-check="runCheck"
            @stop-check="stopCheck"
            @fit-view="fitView"
            @toggle-console="toggleConsole"
            @toggle-visuals="toggleCheckVisuals"
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
                class="flex min-h-0 flex-col gap-3 overflow-hidden border-l border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
                <div class="flex min-h-0 flex-col">
                    <h4
                        class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                        Models
                    </h4>
                    <ul class="flex max-h-40 flex-col gap-1 overflow-auto">
                        <li
                            v-for="[id, name] in models"
                            :key="id"
                            class="group/model-row flex items-center gap-1"
                        >
                            <button
                                type="button"
                                class="min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                                :class="
                                    selected === id
                                        ? 'bg-accent/15 font-medium text-default-dark dark:bg-accent/20 dark:text-accent'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                "
                                @click="selectModel(id)"
                            >
                                <span class="block truncate">{{ name }}</span>
                            </button>
                            <button
                                type="button"
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-red-500/15 hover:text-red-600 group-hover/model-row:opacity-100 dark:hover:text-red-400"
                                title="Delete model"
                                :disabled="deleting"
                                @click.stop="requestDeleteModel(id, name)"
                            >
                                <TrashIcon class="h-3.5 w-3.5" />
                            </button>
                        </li>
                    </ul>
                </div>

                <ElementPropertiesPanel class="min-h-0 flex-1" />
            </aside>
        </div>

        <Dialog ref="deleteDialog" accept_button_class="btn-danger" @close="confirmDeleteModel">
            <template #title>Delete model</template>
            <template #content>
                <p>
                    Delete
                    <span class="font-medium text-default-dark dark:text-slate-100">{{
                        pendingDeleteName
                    }}</span>
                    from the server?
                </p>
                <p class="mt-2">This cannot be undone.</p>
            </template>
            <template #accept_button_text>Delete</template>
            <template #reject_button_text>Cancel</template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import Parser from '@/ParserOpenBIMRL';
import GraphConsoleOverlay from '@/components/graph/GraphConsoleOverlay.vue';
import { Dialog, DialogReturnValue } from '@/components/modals';
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
import { deleteModel } from '@/modules/apiConnection';
import {
    detachViewer,
    fitViewToDisplayedModel,
    getScene,
    init,
    loading,
    models,
    removeModelLocally,
    selected,
    updateModels,
} from '@/modules/ifcViewer';
import { runGraphCheck, stopGraphCheck } from '@/modules/runGraphCheck';
import { checkVisualsVisible, hasCheckVisuals, toggleCheckVisuals } from '@/modules/visualizer';
import type { GraphInject } from '@/components/graph/Types';
import { TrashIcon } from '@heroicons/vue/24/outline';
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { VueSpinnerCore } from 'vue3-spinners';
import ViewerRunBar from './ViewerRunBar.vue';
import ElementPropertiesPanel from './ElementPropertiesPanel.vue';

const { graph } = inject(graphInjectionKey) as GraphInject;
const parser = inject(parserInjectionKey) as Parser;

const viewerContainer = ref<HTMLElement | null>(null);
const loaded = ref(!!getScene() || false);
const deleteDialog = ref<typeof Dialog | null>(null);
const pendingDeleteId = ref<string | null>(null);
const pendingDeleteName = ref('');
const deleting = ref(false);

const runCheck = async () => {
    if (!selected.value || checkLoading.value) return;
    await runGraphCheck(graph.value, parser, selected.value);
};

const stopCheck = () => {
    stopGraphCheck();
};

const fitView = () => {
    void fitViewToDisplayedModel();
};

const selectModel = (id: string) => {
    selected.value = id;
};

const requestDeleteModel = (id: string, name: string) => {
    pendingDeleteId.value = id;
    pendingDeleteName.value = name;
    deleteDialog.value?.open();
};

const confirmDeleteModel = async () => {
    if (deleteDialog.value?.returnValue() !== DialogReturnValue.accept) {
        pendingDeleteId.value = null;
        pendingDeleteName.value = '';
        return;
    }

    const id = pendingDeleteId.value;
    pendingDeleteId.value = null;
    pendingDeleteName.value = '';
    if (!id || deleting.value) return;

    deleting.value = true;
    try {
        await deleteModel(id);
        await removeModelLocally(id);
    } catch (error) {
        console.error('Failed to delete model', error);
        updateModels();
    } finally {
        deleting.value = false;
    }
};

watch(loaded, () => {
    const scene = getScene();
    if (!scene) return;
});

onUnmounted(() => {
    detachViewer();
});

onMounted(async () => {
    if (!viewerContainer.value) return;
    await init(viewerContainer.value);

    updateModels();
});
</script>
