<template>
    <aside
        class="flex flex-grow-0 fixed inset-y-16 right-4 z-10 w-10 rounded border bg-default-overlay bg-opacity-90 shadow-md transition-all duration-200 selection:shadow-xl"
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
            <hr class="bg-default-light h-[2px] w-full self-end" />
            <menu class="flex w-full gap-2 my-2 justify-end self-end">
                <li>
                    <button>
                        <DocumentPlusIcon />
                    </button>
                </li>
                <li>
                    <button>
                        <FolderPlusIcon />
                    </button>
                </li>
                <li>
                    <button>
                        <CheckCircleIcon />
                    </button>
                </li>
                <div class="self-stretch w-[2px] bg-default-light" />
                <li>
                    <button class="!bg-ease-blue">
                        <span class="px-1">Add SubCheck</span>
                    </button>
                </li>
            </menu>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { CheckCircleIcon, DocumentPlusIcon, FolderPlusIcon } from '@heroicons/vue/24/outline';
import ResultSets from './ResultSets.vue';
import SubChecks from './SubChecks.vue';
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

menu > li > button {
    @apply rounded p-1;
}

menu > li:not(li:last-child) > button {
    @apply bg-success;
}

menu > li > button > * {
    @apply w-6;
}
</style>
