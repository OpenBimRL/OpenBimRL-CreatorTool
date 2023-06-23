<template>
    <aside
        class="flex flex-grow-0 fixed inset-y-16 right-4 z-10 w-10 rounded border bg-neutral-200 bg-opacity-90 shadow-md transition-all duration-200 selection:shadow-xl"
    >
        <button
            class="relative h-full w-10 transition-colors duration-300 hover:bg-neutral-300 flex-shrink-0"
            @click="$emit('open')"
        >
            <div class="absolute -left-2 block -rotate-90 text-xl" />
        </button>

        <div class="content w-full transition-opacity">
            <ResultSets />
        </div>
    </aside>
</template>

<script setup lang="ts">
import ResultSets from './ResultSets.vue';

</script>

<style scoped>
aside.open {
    @apply w-1/2;
}

aside:not(.open) button > div::before {
    content: 'open';
}

aside.open button > div::before {
    content: 'close';
}

aside:not(.open) > button ~ div.content {
    
    opacity: 0;
}
</style>
