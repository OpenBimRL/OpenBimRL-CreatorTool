<template>
    <div class="applicability border-2 bg-yellow-200 bg-opacity-30">
        <p class="text-center py-4 text-xl">
            <span>Applicability</span>
        </p>
        <div
            v-show="!check.applicability.length"
            class="dropzone border-2 border-dashed border-default-contrast m-2"
        >
            <p class="text-center py-4 text-lg text-default-dark">
                <strong>Drop Here</strong>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { SubCheck } from './Types';
const props = defineProps<{ check: SubCheck }>();
</script>

<style scoped></style>
