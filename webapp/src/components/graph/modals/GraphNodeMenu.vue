<template>
    <aside class="panel-drawer min-w-[25%] max-w-full grid gap-4 p-0 transition-transform" :style="`width: ${width}px`">
        <button class="absolute border-2 h-full cursor-col-resize opacity-0 hover:opacity-100" @mousedown="mouseResizeStart" />
        <div class="panel-header">
            <h2 class="text-lg font-semibold text-default-dark dark:text-slate-100">Node Library</h2>
        </div>
        <div class="flex flex-col gap-4 px-4 pb-4 flex-1 min-h-0">
        <form>
            <InputField v-model="search" placeholder="ifc.get...">
                <span>Search</span>
                <template v-slot:icon>
                    <span class="relative">
                        <MagnifyingGlassIcon class="text-gray-400 w-6 absolute top-2 right-2" />
                    </span>
                </template>
            </InputField>
        </form>

        <div class="flex min-h-0 flex-1 flex-col max-w-full">
            <div class="flex items-center justify-center py-1">
                <Switch
                    v-model="showLibsAsList"
                    off-label="Icons"
                    on-label="List"
                    aria-label="Toggle library view mode"
                />
            </div>
            <div class="flex">
                <ul
                    class="flex flex-row overflow-x-auto overflow-y-hidden rounded-t-lg border border-slate-200/80 dark:border-slate-700"
                >
                    <li
                        v-for="(libname, index) in loadedLibraries"
                        :key="index"
                        class="border-r border-slate-200/80 p-2 last:border-r-0 dark:border-slate-700"
                        :class="
                            libname === currentSelection
                                ? 'bg-white dark:bg-slate-800'
                                : 'bg-slate-50 dark:bg-slate-900'
                        "
                    >
                        <button
                            type="button"
                            class="bg-transparent text-sm font-medium text-slate-600 hover:text-default-dark dark:text-slate-400 dark:hover:text-slate-200"
                            @click="currentSelection = libname"
                        >
                            <span>{{ libname }}</span>
                        </button>
                    </li>
                </ul>
            </div>
            <div
                class="h-full overflow-y-auto overflow-x-hidden rounded-b-lg border border-t-0 border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
                <div
                    v-for="(libname, index) in loadedLibraries"
                    :key="index"
                    class=""
                    v-show="libname === currentSelection"
                >
                    <GraphItemGroup
                        v-for="group in availableLibraries[libname]"
                        :search="search"
                        :key="group.id"
                        :group="group"
                        :show-as-list="showLibsAsList"
                    />
                </div>
            </div>
        </div>

        <hr class="border-slate-200/80 dark:border-slate-700" />

        <div class="flex flex-col gap-3">
            <form class="flex items-center gap-2">
                <div class="flex w-full overflow-hidden rounded-lg border border-slate-300/80 dark:border-slate-600">
                    <label
                        for="lib-select"
                        class="inline-block border-r border-inherit bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <span>Library</span>
                    </label>
                    <select
                        id="lib-select"
                        class="w-full bg-transparent px-3 py-2 text-sm dark:text-slate-200"
                        v-model="currentSelection"
                    >
                        <option
                            v-for="lib in Object.keys(availableLibraries)"
                            :key="lib"
                            v-text="lib"
                        />
                    </select>
                </div>
                <button
                    type="button"
                    class="btn-icon !h-10 !w-10 bg-emerald-600 text-white hover:bg-emerald-700"
                    @click="createLibrary"
                >
                    <PlusIcon class="h-5 w-5" />
                </button>
            </form>
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="btn-secondary !text-xs"
                    :disabled="fetchingApiLibrary"
                    @click="fetchApiFunctionLibrary"
                >
                    {{
                        fetchingApiLibrary ? 'Fetching...' : 'Fetch API supported function library'
                    }}
                </button>
                <span v-if="fetchStatusText" class="text-xs text-slate-500">{{ fetchStatusText }}</span>
            </div>

            <button type="button" class="btn-primary w-full" @click="handleUpload">
                Upload Library
            </button>
            <input
                id="uploadLibraryJSONAnchorElem"
                class="hidden"
                type="file"
                @change="uploaderOnChange($event, 'json')"
            />
        </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import Switch from '@/components/ui/Switch.vue';
import { graphInjectionKey } from '@/keys';
import { getFunctions } from '@/modules/apiConnection';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/vue/20/solid';
import { isNode } from '@vue-flow/core';
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import type { GraphInject, NodeData } from '../Types';
import GraphItemGroup from './GraphItemGroup.vue';
import type { ImportedRuleSet, RuleSetElement } from './Types';

const width = ref(window.innerWidth / 4);

const updateListener = (e: MouseEvent) => {
    width.value = window.innerWidth - e.x;
    window.addEventListener('mouseup', mouseResizeStop);
};

const mouseResizeStart = () => {
    window.addEventListener('mousemove', updateListener);
};

const mouseResizeStop = () => {
    window.removeEventListener('mousemove', updateListener);
    window.removeEventListener('mouseup', mouseResizeStop);
};

const showLibsAsList = ref(false);

const importedLibraries: Record<string, ImportedRuleSet> = import.meta.glob(
    '@/assets/graph/libs/*.json',
    {
        eager: true,
    },
);

const availableLibraries: { [key: string]: Array<RuleSetElement> } = {};

for (const file in importedLibraries) {
    const baseName = file.split('/').pop()?.split('.')[0];
    if (!baseName) continue;
    availableLibraries[baseName] = importedLibraries[file].default;
}

const search = ref<string>('');
const loadedLibraries = Object.keys(availableLibraries);
const currentSelection = ref(loadedLibraries[0]);
const fetchingApiLibrary = ref(false);
const fetchStatusText = ref('');
const { graph, resetGraph } = inject(graphInjectionKey) as GraphInject;

const createLibrary = () => {
    loadedLibraries.push(currentSelection.value);
};

const handleUpload = () => {
    document.getElementById('uploadLibraryJSONAnchorElem')?.click();
};

const uploaderOnChange = (event: Event, filetype: string) => {
    const file = (event.target as HTMLInputElement).files![0];
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
        if (filetype !== 'json') return;

        let obj = JSON.parse((event.target?.result as string | null) || '{}');
        availableLibraries[file.name] = obj;
    };
    reader.readAsText(file);
};

interface NodeHandleLike {
    index?: string;
    name?: string;
}

const handleSignature = (handles: Array<NodeHandleLike> = []) =>
    [...handles]
        .map(handle => `${handle.index ?? ''}:${handle.name ?? ''}`)
        .sort()
        .join('|');

const validateGraphAgainstLibrary = (libraryName: string): number => {
    const selectedLibrary = availableLibraries[libraryName] ?? [];
    const allLibraryItems = selectedLibrary.flatMap(group => group.items ?? []);
    const libraryMap = new Map<string, (typeof allLibraryItems)[number]>(
        allLibraryItems.map(item => {
            const data = item.data as NodeData<NodeHandleLike, NodeHandleLike>;
            return [`${item.type}::${data.name}`, item];
        }),
    );

    let invalidCount = 0;
    const updatedElements = graph.value.elements.map(element => {
        if (!isNode(element)) return element;
        const nodeData = element.data as NodeData<NodeHandleLike, NodeHandleLike>;
        const signatureKey = `${element.type}::${nodeData.name}`;
        const libraryNode = libraryMap.get(signatureKey);

        if (!libraryNode) {
            invalidCount += 1;
            return {
                ...element,
                data: {
                    ...nodeData,
                    invalid: true,
                    invalidReason: `Function '${nodeData.name}' does not exist in '${libraryName}'.`,
                },
            };
        }

        const libraryData = libraryNode.data as NodeData<NodeHandleLike, NodeHandleLike>;
        // RuleIdentifier handles are user-editable labels, so names can legitimately differ.
        const skipHandleValidation = element.type === 'ruleIdentifier';
        const inputsEqual =
            skipHandleValidation ||
            handleSignature(nodeData.inputs as Array<NodeHandleLike>) ===
                handleSignature(libraryData.inputs as Array<NodeHandleLike>);
        const outputsEqual =
            skipHandleValidation ||
            handleSignature(nodeData.outputs as Array<NodeHandleLike>) ===
                handleSignature(libraryData.outputs as Array<NodeHandleLike>);

        if (!inputsEqual || !outputsEqual) {
            invalidCount += 1;
            return {
                ...element,
                data: {
                    ...nodeData,
                    invalid: true,
                    invalidReason: `Handle mismatch for '${nodeData.name}' in '${libraryName}'.`,
                },
            };
        }

        return {
            ...element,
            data: {
                ...nodeData,
                invalid: false,
                invalidReason: '',
            },
        };
    });

    resetGraph({
        ...graph.value,
        elements: updatedElements,
    });
    return invalidCount;
};

const fetchApiFunctionLibrary = async () => {
    if (fetchingApiLibrary.value) return;
    fetchingApiLibrary.value = true;
    fetchStatusText.value = '';
    try {
        const apiGroups = await getFunctions();
        const libraryName = 'API Supported Functions';
        availableLibraries[libraryName] = apiGroups as unknown as Array<RuleSetElement>;
        if (!loadedLibraries.includes(libraryName)) loadedLibraries.push(libraryName);
        currentSelection.value = libraryName;
        fetchStatusText.value = `Loaded ${apiGroups.length} groups from API.`;
    } catch (error) {
        console.error(error);
        fetchStatusText.value = 'Failed to fetch function library from API.';
    } finally {
        fetchingApiLibrary.value = false;
    }
};

watch(currentSelection, libraryName => {
    if (!libraryName) return;
    validateGraphAgainstLibrary(libraryName);
});

const onCompileGraph = () => {
    const libraryName = currentSelection.value;
    const invalidCount = validateGraphAgainstLibrary(libraryName);
    window.dispatchEvent(
        new CustomEvent('openbimrl:compile-graph:done', {
            detail: { invalidCount, libraryName },
        }),
    );
};

onMounted(() => {
    window.addEventListener('openbimrl:compile-graph', onCompileGraph);
});

onUnmounted(() => {
    window.removeEventListener('openbimrl:compile-graph', onCompileGraph);
});
</script>

<style scoped>
aside {
    grid-template-rows: auto 80% auto auto;
}

aside.grid > * {
    min-width: 0px;
}
</style>
