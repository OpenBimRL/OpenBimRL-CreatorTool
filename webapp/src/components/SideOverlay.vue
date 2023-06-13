<template>
    <aside
        class="fixed inset-y-16 right-4 z-10 w-10 rounded border bg-neutral-200 bg-opacity-90 shadow-md transition-all duration-200 selection:shadow-xl"
    >
        <button
            class="relative h-full w-10 transition-colors duration-300 hover:bg-neutral-300"
            @click="$emit('open')"
        >
            <div class="absolute -left-2 block -rotate-90 text-xl" />
        </button>
    </aside>
</template>

<style scoped>
aside.open {
    @apply w-1/2;
}

aside:not(.open) div::before {
    content: 'open';
}

aside.open div::before {
    content: 'close';
}
</style>
