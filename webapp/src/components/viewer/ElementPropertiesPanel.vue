<template>
    <section class="flex min-h-0 flex-col border-t border-slate-200/80 pt-3 dark:border-slate-800">
        <div class="mb-2 flex items-center justify-between gap-2">
            <h4
                class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
                Element
            </h4>
            <button
                v-if="panelOpen"
                type="button"
                class="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                @click="panelOpen = false"
            >
                Hide
            </button>
        </div>

        <p v-if="!panelOpen" class="text-xs text-slate-500 dark:text-slate-400">
            Click an element in the model to inspect properties.
            <button
                type="button"
                class="ml-1 text-accent underline-offset-2 hover:underline"
                :disabled="!hasSelection"
                @click="panelOpen = true"
            >
                Show panel
            </button>
        </p>

        <template v-else>
            <p v-if="!hasSelection" class="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Click an element in the 3D view to see its attributes and property sets.
            </p>

            <div
                v-else
                class="mb-2 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/80"
            >
                <div class="font-medium text-slate-700 dark:text-slate-200">GlobalId</div>
                <div class="break-all font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {{ selectedGuid ?? '—' }}
                </div>
            </div>

            <div
                ref="tableHost"
                class="min-h-[8rem] max-h-72 flex-1 overflow-auto rounded-lg border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-950"
            />

            <button
                type="button"
                class="btn-primary mt-3 w-full !py-2 !text-xs"
                :disabled="!selectedGuid"
                @click="onAddAsInput"
            >
                Add as Input
            </button>
            <p v-if="addedHint" class="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                {{ addedHint }}
            </p>
        </template>
    </section>
</template>

<script setup lang="ts">
import { addTextInputNodeToGraph } from '@/modules/addGraphTextInput';
import { graphInjectionKey } from '@/keys';
import { getComponents } from '@/modules/ifcViewer';
import {
    viewerHasSelection,
    viewerSelectedGuid,
    viewerSelectedModelIdMap,
} from '@/modules/viewerElementSelection';
import type { GraphInject } from '@/components/graph/Types';
import * as BUIC from '@thatopen/ui-obc';
import type { ItemsDataState } from '@thatopen/ui-obc';
import { computed, inject, onMounted, onUnmounted, ref, unref, watch } from 'vue';

const { graph } = inject(graphInjectionKey) as GraphInject;

const tableHost = ref<HTMLElement | null>(null);
const panelOpen = ref(false);
const addedHint = ref('');

const hasSelection = computed(() => viewerHasSelection.value);
const selectedGuid = computed(() => viewerSelectedGuid.value);

let updatePropertiesTable: ((state: Partial<ItemsDataState>) => void) | null = null;

function mountPropertiesTable() {
    const components = getComponents();
    if (!components || !tableHost.value || updatePropertiesTable) return;

    const [table, update] = BUIC.tables.itemsData({
        components,
        modelIdMap: {},
        emptySelectionWarning: true,
    });

    table.style.width = '100%';
    table.style.fontSize = '12px';
    tableHost.value.appendChild(table);
    updatePropertiesTable = update;

    const currentMap = unref(viewerSelectedModelIdMap);
    if (!isEmptySelection(currentMap)) {
        update({ modelIdMap: { ...currentMap } });
    }
}

function isEmptySelection(modelIdMap: Record<string, Set<number>>) {
    return !Object.values(modelIdMap).some(ids => ids.size > 0);
}

onMounted(() => {
    mountPropertiesTable();
});

onUnmounted(() => {
    tableHost.value?.replaceChildren();
    updatePropertiesTable = null;
});

watch(
    () => getComponents(),
    () => mountPropertiesTable(),
);

watch(
    viewerSelectedModelIdMap,
    modelIdMap => {
        if (!isEmptySelection(modelIdMap)) {
            panelOpen.value = true;
        }
        updatePropertiesTable?.({ modelIdMap: { ...modelIdMap } });
    },
    { deep: true },
);

const onAddAsInput = () => {
    const guid = selectedGuid.value?.trim();
    if (!guid) return;

    addTextInputNodeToGraph(graph, guid);
    addedHint.value = `Added input.textInput node for ${guid}`;
    window.setTimeout(() => {
        addedHint.value = '';
    }, 4000);
};
</script>
