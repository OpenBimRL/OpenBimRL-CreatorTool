<template>
    <Handle class="openbimrl-handle flex items-center">
        <span class="px-4 pointer-events-none" style="display: ruby">
            <slot />
        </span>
    </Handle>
</template>

<script setup lang="ts">
import { Handle } from '@vue-flow/core';
</script>

<style>
.openbimrl-handle {
    width: var(--openbimrl-handle-size, 1rem) !important;
    height: var(--openbimrl-handle-size, 1rem) !important;
    min-width: var(--openbimrl-handle-size, 1rem);
    min-height: var(--openbimrl-handle-size, 1rem);
    border-width: 2px;
}

/* Invisible hit area — easier to grab without oversized dots. */
.openbimrl-handle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--openbimrl-handle-hit, 1.75rem);
    height: var(--openbimrl-handle-hit, 1.75rem);
    transform: translate(-50%, -50%);
    border-radius: 9999px;
}

div.vue-flow__handle-left,
div.vue-flow__handle-right {
    transform: translateY(-50%);
}

div.vue-flow__handle-left {
    left: calc(-1 * var(--openbimrl-handle-offset, 8px));
}

div.vue-flow__handle-right {
    right: calc(-1 * var(--openbimrl-handle-offset, 8px));
    @apply justify-end;
}

div.vue-flow__handle:hover > span {
    @apply text-blue-600;
}
</style>
