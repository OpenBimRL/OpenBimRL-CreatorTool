<script setup lang="ts">
import { ref } from 'vue';
import { Graph, Help, SideOverlay } from './components';
import Navigation from './components/navigation';

const showHelp = ref(false);
</script>

<template>
    <Navigation @showHelp="showHelp = !showHelp" />
    <SideOverlay />
    <Help v-show="showHelp" @close="showHelp = false" />
    <main>
        <Graph class="h-screen" />
    </main>
</template>

<style scoped></style>
