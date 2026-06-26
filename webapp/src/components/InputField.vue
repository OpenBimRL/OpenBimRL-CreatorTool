<template>
    <div
        class="flex w-full overflow-hidden rounded-lg border border-slate-300/80 bg-white shadow-soft transition-shadow focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 dark:border-slate-600 dark:bg-slate-900 dark:focus-within:border-accent/40"
        :class="getLabelClasses"
    >
        <label
            :for="key"
            v-bind="invalidMessageProp"
            class="cursor-text select-none border-r border-inherit bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
            <slot />
        </label>
        <input
            :id="key"
            :placeholder="placeholder || '...'"
            :value="modelValue"
            :type="type ?? 'text'"
            v-bind="invalidMessageProp"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            @focusin="focused = true"
            @focusout="focused = false"
            class="w-full bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <slot name="icon" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps(['modelValue', 'placeholder', 'type', 'valid', 'invalidMessage']);
defineEmits(['update:modelValue']);

const focused = ref(false);

const getLabelClasses = computed(() => {
    if (props.valid === false) return ['!border-red-500 focus-within:!ring-red-500/20'];
    return [];
});

const invalidMessageProp = computed(() => {
    if (props.valid === false) return { title: props.invalidMessage };
    return {};
});

const key = self.crypto.randomUUID();
</script>
