<template>
    <div
        class="min-w-[12rem] rounded border border-black bg-white shadow-black"
        :class="{ shadow: selected }"
        :style="widthStyle"
    >
        <slot />
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    selected: boolean;
    minWidth?: number;
}>();

const widthStyle = props.minWidth ? `width: ${props.minWidth}rem` : '';
</script>

<style scoped></style>
