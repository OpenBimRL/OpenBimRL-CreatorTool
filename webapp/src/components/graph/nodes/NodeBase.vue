<template>
    <div
        class="relative min-w-[12rem] rounded shadow-[0_0_0_1px] aria-selected:shadow-[0_0_0_2px] shadow-gray-500 bg-default-light dark:shadow-default-medium dark:bg-default-darkest"
        :class="{ 'shadow-[0_0_0_2px] !shadow-red-500': invalid }"
        :aria-selected="selected"
        :title="invalidReason || ''"
        :style="widthStyle"
    >
        <span
            v-if="invalid"
            class="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-red-600 text-white text-center leading-6 font-bold"
        >
            !
        </span>
        <slot />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    selected: boolean;
    minWidth?: number;
    invalid?: boolean;
    invalidReason?: string;
}>();

const widthStyle = computed(() => (props.minWidth ? `width: ${props.minWidth}rem` : ''));
</script>

<style scoped></style>
