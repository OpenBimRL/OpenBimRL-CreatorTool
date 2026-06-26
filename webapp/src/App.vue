<template>
    <div
        v-if="anyPanelOpen"
        class="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px] dark:bg-black/40"
        @click="closeAllPanels()"
    />
    <Help
        :class="{ 'translate-x-full': !modals[Panels.Help] }"
        class="transition-transform duration-300 ease-out"
        @close="toggleSidePanel(Panels.Help, false)"
    />
    <GraphNodeMenu
        :class="{ 'translate-x-full': !modals[Panels.NodeLib] }"
        class="transition-transform duration-300 ease-out"
    />
    <Dialog ref="restoreDialog" @close="onRestoreDialogClose">
        <template v-slot:title>Restore previous graph?</template>
        <template v-slot:content>
            <p>A graph saved in this browser was found.</p>
            <p class="mt-2">Do you want to restore it instead of the example graph?</p>
        </template>
        <template v-slot:accept_button_text>Restore</template>
        <template v-slot:reject_button_text>Use example</template>
    </Dialog>
    <main class="grid h-screen overflow-hidden">
        <SideNavigation style="grid-area: side" />
        <TopNavigation
            style="grid-area: nav"
            @showHelp="toggleSidePanel(Panels.Help)"
            @showNodeLib="toggleSidePanel(Panels.NodeLib)"
        />
        <RouterView
            style="grid-area: main"
            class="min-h-0 overflow-hidden bg-surface-muted dark:bg-default-darkest"
            @click="closeAllPanels()"
        />
    </main>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { GraphNodeMenu, SideNavigation, TopNavigation } from './components';
import type { GraphInject } from './components/graph/Types';
import { Dialog, DialogReturnValue } from './components/modals';
import { Help } from './components/side_panels';
import { graphInjectionKey } from './keys';
import {
    defaultExampleGraph,
    enableGraphPersistence,
    isGraphDifferentFromDefault,
    loadStoredGraph,
    saveGraph,
} from './modules/graphStorage';

enum Panels {
    Help,
    NodeLib,
    SideOverlay,
}

const modals = ref<{ [key in Panels]?: boolean }>({});

modals.value[Panels.Help] = false;
modals.value[Panels.NodeLib] = false;

const anyPanelOpen = computed(() => Object.values(modals.value).some(Boolean));

const restoreDialog = ref<typeof Dialog | null>(null);
const { resetGraph } = inject(graphInjectionKey) as GraphInject;

const toggleSidePanel = (panelName: Panels, state?: boolean) => {
    const oldState = modals.value[panelName];
    closeAllPanels();

    modals.value[panelName] = state ?? !oldState;
};

const closeAllPanels = () => {
    for (const [, index] of Object.entries(Panels)) modals.value[index as Panels] = false;
};

const onRestoreDialogClose = () => {
    const storedGraph = loadStoredGraph();
    if (storedGraph && restoreDialog.value?.returnValue() === DialogReturnValue.accept) {
        resetGraph(storedGraph);
    } else {
        saveGraph(defaultExampleGraph);
    }

    enableGraphPersistence();
};

onMounted(() => {
    const storedGraph = loadStoredGraph();
    if (storedGraph && isGraphDifferentFromDefault(storedGraph)) {
        restoreDialog.value?.open();
        return;
    }

    if (storedGraph) {
        saveGraph(defaultExampleGraph);
    }

    enableGraphPersistence();
});
</script>

<style scoped>
main {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas:
        'side nav'
        'side main';
}
</style>
