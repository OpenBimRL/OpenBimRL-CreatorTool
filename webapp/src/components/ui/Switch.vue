<template>
    <label class="inline-flex cursor-pointer select-none items-center gap-2.5">
        <span v-if="offLabel" class="text-xs font-medium text-slate-500 dark:text-slate-400">{{
            offLabel
        }}</span>
        <button
            type="button"
            role="switch"
            :aria-checked="modelValue"
            :aria-label="ariaLabel"
            class="relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-default-darkest"
            :class="modelValue ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'"
            @click="$emit('update:modelValue', !modelValue)"
        >
            <span
                class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
            />
        </button>
        <span v-if="onLabel" class="text-xs font-medium text-slate-500 dark:text-slate-400">{{
            onLabel
        }}</span>
    </label>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: boolean;
    onLabel?: string;
    offLabel?: string;
    ariaLabel?: string;
}>();

defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
}>();
</script>
