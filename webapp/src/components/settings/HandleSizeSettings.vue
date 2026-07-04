<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between gap-4">
            <div>
                <p class="text-sm font-medium text-default-dark dark:text-slate-200">
                    Connection handle size
                </p>
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Adjust how large graph input/output ports appear and how easy they are to grab.
                </p>
            </div>
            <span class="shrink-0 text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
                {{ handleSizeScale }}%
            </span>
        </div>
        <input
            v-model.number="handleSizeScale"
            type="range"
            class="handle-size-slider w-full"
            :min="MIN_HANDLE_SIZE_SCALE"
            :max="MAX_HANDLE_SIZE_SCALE"
            step="5"
            aria-label="Connection handle size"
        />
        <div class="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>Smaller</span>
            <span>Default</span>
            <span>Larger</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    MAX_HANDLE_SIZE_SCALE,
    MIN_HANDLE_SIZE_SCALE,
    handleSizeScale,
} from '@/modules/handleSize';
</script>

<style scoped>
.handle-size-slider {
    @apply h-2 cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700;
}

.handle-size-slider::-webkit-slider-thumb {
    @apply h-4 w-4 appearance-none rounded-full bg-accent shadow-sm;
}

.handle-size-slider::-moz-range-thumb {
    @apply h-4 w-4 rounded-full border-0 bg-accent shadow-sm;
}
</style>
