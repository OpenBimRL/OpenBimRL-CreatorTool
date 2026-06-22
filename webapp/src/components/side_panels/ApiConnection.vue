<template>
    <aside
        class="flex h-full flex-col"
        :class="props.embedded ? 'w-full bg-transparent' : 'panel-drawer w-full max-w-md p-0'"
    >
        <div :class="props.embedded ? 'px-1 py-2' : 'panel-header'">
            <div>
                <h2 class="text-lg font-semibold text-default-dark dark:text-slate-100">
                    API Connection
                </h2>
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Configure the OpenBIMRL engine endpoint
                </p>
            </div>
            <button
                v-if="!props.embedded"
                type="button"
                class="btn-icon !h-9 !w-9"
                @click="$emit('close')"
            >
                <XMarkIcon class="h-5 w-5" />
            </button>
        </div>

        <div class="flex flex-1 flex-col gap-4 overflow-auto p-5">
            <InputField
                type="url"
                v-model="tempApiUrl"
                :valid="urlValid"
                invalid-message="Not a valid URL"
            >
                <span>Endpoint</span>
            </InputField>

            <button
                type="button"
                class="btn-primary w-full"
                @click="testConnection"
                :disabled="connectionLoading || !urlValid"
            >
                <span v-if="!connectionLoading">Connect</span>
                <VueSpinnerRadio v-else class="inline-block" />
            </button>

            <div class="flex items-center gap-2">
                <span class="text-sm text-slate-500 dark:text-slate-400">Status</span>
                <span :class="statusBadgeClass">{{ connectionStatusText }}</span>
            </div>

            <div v-if="apiStatus && connected" class="card space-y-2 !p-4">
                <div class="flex justify-between text-sm">
                    <span class="text-slate-500 dark:text-slate-400">Version</span>
                    <span class="font-medium">{{ apiStatus.version }}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-slate-500 dark:text-slate-400">GPU offload</span>
                    <span class="font-medium">{{
                        apiStatus.gpuOffloadEnabled ? 'enabled' : 'disabled'
                    }}</span>
                </div>
                <div v-if="apiStatus.gpuOffloadArch" class="flex justify-between text-sm">
                    <span class="text-slate-500 dark:text-slate-400">GPU arch</span>
                    <span class="font-mono text-xs font-medium">{{ apiStatus.gpuOffloadArch }}</span>
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import {
    apiEndpoint,
    getStatus,
    isConnected,
    setApiEndpoint,
    type ApiStatus,
} from '@/modules/apiConnection';
import { XMarkIcon } from '@heroicons/vue/24/solid';
import { Ref, computed, inject, onMounted, ref, watch } from 'vue';

import { VueSpinnerRadio } from 'vue3-spinners';

import { apiConnectionInjectionKey } from '@/keys';

const props = withDefaults(
    defineProps<{
        embedded?: boolean;
    }>(),
    {
        embedded: false,
    },
);

defineEmits(['close']);

const urlValid = ref(true);

const tempApiUrl = ref(apiEndpoint.value);

const connectionStatus = inject(apiConnectionInjectionKey)!;
const connectionLoading = ref(false);

const apiStatus = ref<ApiStatus | null>(null);

const connectionStatusText: Ref<string> = computed(() => {
    if (connectionStatus.value === false) return 'not connected';
    if (connectionStatus.value) return 'connected';
    return 'unknown';
});

const statusBadgeClass = computed(() => {
    if (connectionStatus.value === false) return 'badge-danger';
    if (connectionStatus.value) return 'badge-success';
    return 'badge-neutral';
});

const connected = computed(() => connectionStatus.value ?? false);

const testConnection = () => {
    if (connectionLoading.value || !urlValid.value) return;
    connectionStatus.value = undefined;
    apiStatus.value = null;
    connectionLoading.value = true;
    isConnected()
        .then(async val => {
            connectionStatus.value = val;
            if (val) apiStatus.value = await getStatus();
        })
        .catch(() => (connectionStatus.value = false))
        .finally(() => (connectionLoading.value = false));
};

const updateUrl = () => {
    try {
        setApiEndpoint(new URL(tempApiUrl.value));
        urlValid.value = true;
    } catch (e) {
        console.error(e);
        urlValid.value = false;
        connectionStatus.value = undefined;
    }
};

watch(tempApiUrl, updateUrl);
watch(apiEndpoint, testConnection);
onMounted(testConnection);
</script>
