<script setup lang="ts">
import { ref } from 'vue';
import { Graph, Help, SideOverlay } from './components';
import GraphNodeMenu from './components/graph/modals/GraphNodeMenu.vue';
import Navigation from './components/navigation';

enum Modal {
    Help,
    NodeLib,
    SideOverlay,
}
const modals = ref<{ [key in Modal]?: boolean }>({});

modals.value[Modal.Help] = false;
modals.value[Modal.NodeLib] = false;

const toggleModal = (modalName: Modal) => {
    const oldState = modals.value[modalName];
    closeAllModals();
    modals.value[modalName] = !oldState;
};

const closeAllModals = () => {
    for (const [, index] of Object.entries(Modal)) modals.value[index as Modal] = false;
};
</script>

<template>
    <Navigation @showHelp="toggleModal(Modal.Help)" @showNodeLib="toggleModal(Modal.NodeLib)" />
    <SideOverlay
        :class="{ open: modals[Modal.SideOverlay] }"
        @open="toggleModal(Modal.SideOverlay)"
        @close="toggleModal(Modal.SideOverlay)"
    />
    <Help
        :class="{ 'translate-x-full': !modals[Modal.Help] }"
        class="transition-transform"
        @close="toggleModal(Modal.Help)"
    />
    <GraphNodeMenu
        :class="{ 'translate-x-full': !modals[Modal.NodeLib] }"
        class="transition-transform"
    />
    <main @click="closeAllModals()">
        <Graph class="h-screen" />
    </main>
</template>

<style scoped></style>
