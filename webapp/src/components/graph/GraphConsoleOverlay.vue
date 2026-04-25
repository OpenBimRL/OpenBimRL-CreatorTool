<template>
    <div
        v-if="open && !minimized"
        class="absolute left-2 right-2 bottom-2 h-40 border rounded bg-default-light/95 dark:bg-default-darkest/95 shadow-lg z-20 flex flex-col"
    >
        <div
            class="h-7 min-h-7 px-2 border-b flex items-center justify-between bg-default-medium dark:bg-default-dark"
        >
            <span class="text-xs font-semibold">Check Console</span>
            <div class="flex items-center gap-1">
                <button
                    class="text-xs px-2 py-0.5 rounded border hover:bg-default-light dark:hover:bg-default-darkest"
                    @click="$emit('minimize')"
                >
                    _
                </button>
                <button
                    class="text-xs px-2 py-0.5 rounded border hover:bg-default-light dark:hover:bg-default-darkest"
                    @click="$emit('clear')"
                >
                    Clear
                </button>
            </div>
        </div>
        <pre class="text-xs p-2 overflow-auto flex-1 whitespace-pre-wrap">{{ text }}</pre>
    </div>
    <button
        v-else-if="open && minimized"
        class="absolute right-2 bottom-2 z-20 border rounded bg-default-medium dark:bg-default-dark px-3 py-1 text-xs shadow-lg hover:bg-default-light dark:hover:bg-default-darkest"
        @click="$emit('restore')"
        title="Restore console"
    >
        Check Console
    </button>
</template>

<script setup lang="ts">
defineProps<{
    open: boolean;
    minimized: boolean;
    text: string;
}>();

defineEmits<{
    (event: 'clear'): void;
    (event: 'minimize'): void;
    (event: 'restore'): void;
}>();
</script>
