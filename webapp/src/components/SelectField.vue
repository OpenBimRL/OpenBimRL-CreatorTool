<template>
    <div
        class="flex w-full overflow-hidden rounded-lg border border-slate-300/80 bg-white shadow-soft transition-shadow focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 dark:border-slate-600 dark:bg-slate-900 dark:focus-within:border-accent/40"
        :class="invalid ? '!border-red-500 focus-within:!ring-red-500/20' : ''"
    >
        <label
            :for="fieldId"
            class="cursor-default select-none border-r border-inherit bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
            <slot />
        </label>
        <select
            :id="fieldId"
            :value="modelValue"
            class="w-full appearance-none bg-transparent px-3 py-2 text-sm text-slate-900 focus-visible:outline-none dark:text-slate-100"
            @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        >
            <slot name="options" />
        </select>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: string | number;
    invalid?: boolean;
}>();

defineEmits<{
    (event: 'update:modelValue', value: string): void;
}>();

const fieldId = self.crypto.randomUUID();
</script>
