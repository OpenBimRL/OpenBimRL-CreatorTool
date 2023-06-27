<template>
    <aside
        class="flex flex-grow-0 fixed inset-y-16 right-4 z-10 w-10 rounded border bg-default-overlay bg-opacity-90 shadow-md transition-all duration-200 selection:shadow-xl overflow-scroll"
    >
        <button
            class="relative h-full w-10 transition-colors duration-300 bg-default-light hover:bg-default-dark hover:bg-opacity-40 flex-shrink-0 text-secondary rounded"
            @click="$emit('open')"
        >
            <div class="absolute -left-2 block -rotate-90 text-xl" />
        </button>

        <div class="content flex flex-col w-full h-full transition-opacity pr-4 pl-2">
            <span class="sr-only">Model Check View</span>
            <div class="w-full h-full p-2">
                <ResultSets />
                <SubChecks class="mt-4" />
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { ResultSets, SubChecks } from './internal_components';

defineEmits(['open']);
</script>

<style scoped>
/* Please do not look at this too close, it may make your eyes bleed */
/* I might include SCSS later to make this a bit cleaner but for now it will stay... */

aside.open {
    @apply w-1/2;
}

aside:not(.open) > button > div::before {
    content: 'open';
}

aside.open > button > div::before {
    content: 'close';
}

aside.open > button {
    @apply bg-transparent hover:bg-default-dark hover:bg-opacity-40;
}

aside:not(.open) > button ~ div.content {
    opacity: 0;
}
</style>
