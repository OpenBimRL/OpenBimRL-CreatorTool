<template>
    <div class="flex items-center justify-between gap-4">
        <div>
            <p class="text-sm font-medium text-default-dark dark:text-slate-200">Color theme</p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Switch between light and dark interface.
            </p>
        </div>
        <Switch
            v-model="darkMode"
            off-label="Light"
            on-label="Dark"
            aria-label="Toggle dark mode"
        />
    </div>
</template>

<script setup lang="ts">
import Switch from '@/components/ui/Switch.vue';
import { darkModeKey } from '@/keys';
import { Ref, inject } from 'vue';

const darkMode = inject(darkModeKey) as Ref<boolean>;
</script>
