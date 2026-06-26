<template>
    <InputField type="url" v-model="tempApiUrl" :valid="urlValid" invalid-message="Not a valid URL">
        <span>Endpoint</span>
    </InputField>

    <InputField type="password" v-model="tempAccessToken" autocomplete="off">
        <span>Access token</span>
    </InputField>
    <p class="text-xs text-slate-500 dark:text-slate-400">
        Sent as <code class="font-mono">Authorization: Bearer …</code> when the API requires it.
    </p>

    <button
        type="button"
        class="btn-primary"
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

    <div
        v-if="apiStatus && connected"
        class="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40"
    >
        <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-4">
                <dt class="text-slate-500 dark:text-slate-400">Version</dt>
                <dd class="font-medium">{{ apiStatus.version }}</dd>
            </div>
            <div class="flex justify-between gap-4">
                <dt class="text-slate-500 dark:text-slate-400">GPU offload</dt>
                <dd class="font-medium">
                    {{ apiStatus.gpuOffloadEnabled ? 'enabled' : 'disabled' }}
                </dd>
            </div>
            <div v-if="apiStatus.gpuOffloadArch" class="flex justify-between gap-4">
                <dt class="text-slate-500 dark:text-slate-400">GPU arch</dt>
                <dd class="font-mono text-xs font-medium">{{ apiStatus.gpuOffloadArch }}</dd>
            </div>
        </dl>
    </div>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import { apiConnectionInjectionKey } from '@/keys';
import {
    apiEndpoint,
    apiAccessToken,
    getStatus,
    isConnected,
    setApiEndpoint,
    setApiAccessToken,
    type ApiStatus,
} from '@/modules/apiConnection';
import { Ref, computed, inject, onMounted, ref, watch } from 'vue';
import { VueSpinnerRadio } from 'vue3-spinners';

const urlValid = ref(true);
const tempApiUrl = ref(apiEndpoint.value);
const tempAccessToken = ref(apiAccessToken.value);

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
watch(tempAccessToken, token => setApiAccessToken(token));
watch(apiEndpoint, testConnection);
watch(apiAccessToken, testConnection);
onMounted(testConnection);
</script>
