<template>
    <aside
        class="flex flex-col h-full bg-default-medium bg-opacity-90 dark:text-default-medium dark:bg-opacity-95 dark:bg-default-dark px-3 py-2"
        :class="
            props.embedded
                ? 'w-full'
                : 'fixed right-0 top-0 z-50 w-1/4'
        "
    >
        <div class="flex justify-between">
            <button v-if="!props.embedded" class="bg-transparent" @click="$emit('close')">
                <XMarkIcon class="inline h-8 w-8" />
            </button>
            <h3 class="text-3xl"><strong>API Connection</strong></h3>
        </div>
        <div class="ml-4">
            <h4 class="text-2xl mb-1">API Settings</h4>
            <InputField
                type="url"
                v-model="tempApiUrl"
                :valid="urlValid"
                invalid-message="Not a valid URL"
            >
                <span>Endpoint</span>
            </InputField>
            <br />

            <button
                class="w-full p-1 border rounded hover:bg-opacity-70 bg-default-contrast dark:bg-default-dark dark:hover:bg-default-darkest disabled:bg-opacity-30"
                @click="testConnection"
                v-bind="{ disabled: connectionLoading || !urlValid }"
            >
                <span v-if="!connectionLoading">Connect</span>
                <VueSpinnerRadio v-else class="inline-block" />
            </button>

            <p>
                <span>connection status:&nbsp;</span>
                <strong :class="statusTextColor">{{ connectionStatusText }}</strong>
            </p>
            <div v-if="apiStatus && connected" class="mt-2 text-sm">
                <p><span>version:&nbsp;</span><strong>{{ apiStatus.version }}</strong></p>
                <p>
                    <span>gpu offload:&nbsp;</span>
                    <strong>{{ apiStatus.gpuOffloadEnabled ? 'enabled' : 'disabled' }}</strong>
                </p>
                <p v-if="apiStatus.gpuOffloadArch">
                    <span>gpu arch:&nbsp;</span><strong>{{ apiStatus.gpuOffloadArch }}</strong>
                </p>
            </div>

            <br />
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

const statusTextColor: Ref<string> = computed(() => {
    if (connectionStatus.value === false) return 'text-red-700';
    if (connectionStatus.value) return 'text-green-700';
    return '';
});

const connected = computed(() => connectionStatus.value ?? false);

watch(tempApiUrl, updateUrl);
watch(apiEndpoint, testConnection);
onMounted(testConnection);
</script>

<style scoped>
td:first-child {
    vertical-align: baseline;
}
</style>
