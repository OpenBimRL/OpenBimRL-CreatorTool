<template>
    <aside class="panel-drawer w-full max-w-md p-0">
        <div class="panel-header">
            <div>
                <h2 class="text-lg font-semibold text-default-dark dark:text-slate-100">
                    API Connection
                </h2>
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Configure the OpenBIMRL engine endpoint
                </p>
            </div>
            <button type="button" class="btn-icon !h-9 !w-9" @click="$emit('close')">
                <XMarkIcon class="h-5 w-5" />
            </button>
        </div>

        <div class="overflow-auto p-5">
            <div class="settings-fields">
                <ApiConnectionSettings />
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import ApiConnectionSettings from '@/components/settings/ApiConnectionSettings.vue';
import { XMarkIcon } from '@heroicons/vue/24/solid';

defineEmits(['close']);
</script>
