<template>
    <Handle class="flex items-center w-3 h-3">
        <span class="px-4 pointer-events-none" style="display: ruby">
            <slot />
        </span>
    </Handle>
</template>

<script setup lang="ts">
import { Handle } from '@vue-flow/core';
</script>

<style scoped></style>
