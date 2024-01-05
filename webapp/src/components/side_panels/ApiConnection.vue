<template>
    <aside
        class="fixed right-0 top-0 z-50 h-full w-1/4 bg-default-medium bg-opacity-90 dark:text-default-medium dark:bg-opacity-95 dark:bg-default-dark px-3 py-2"
    >
        <div class="flex justify-between">
            <button class="bg-transparent" @click="$emit('close')">
                <XMarkIcon class="inline h-8 w-8" />
            </button>
            <h3 class="text-3xl"><strong>API Connection</strong></h3>
        </div>
        <div class="pl-4">
            <h4 class="text-2xl">API Settings</h4>
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
                v-bind="{ disabled: loading || !urlValid }"
            >
                <span v-if="!loading">Test Connection&nbsp;</span>
                <VueSpinnerRadio v-else class="inline-block" />
            </button>

            <p>
                <span>connection status:&nbsp;</span
                ><strong :class="statusTextColor">{{ connectionStatusText }}</strong>
            </p>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import { apiEndpoint, isConnected } from '@/modules/apiConnection';
import { XMarkIcon } from '@heroicons/vue/24/solid';
import { Ref, computed, ref, watch } from 'vue';

import { VueSpinnerRadio } from 'vue3-spinners';

defineEmits(['close']);

const urlValid = ref(true);

const tempApiUrl = ref(apiEndpoint.value);

const connectionStatus = ref<boolean | undefined>(undefined);
const loading = ref(false);

const connectionStatusText: Ref<string> = computed(() => {
    if (connectionStatus.value === false) return 'not connected';
    if (connectionStatus.value) return 'connected';
    return 'unknown';
});

const testConnection = () => {
    connectionStatus.value = undefined;
    loading.value = true;
    isConnected()
        .then(val => (connectionStatus.value = val))
        .catch(() => (connectionStatus.value = false))
        .finally(() => (loading.value = false));
};

const updateUrl = () => {
    try {
        apiEndpoint.value = new URL(tempApiUrl.value);
        urlValid.value = true;
    } catch (e) {
        console.error(e);
        urlValid.value = false;
        connectionStatus.value = undefined;
    }
};

const statusTextColor: Ref<string | undefined> = computed(() => {
    if (connectionStatus.value === false) return 'text-red-700';
    if (connectionStatus.value) return 'text-green-700';
});

watch(tempApiUrl, updateUrl);
watch(apiEndpoint, testConnection);
</script>

<style scoped>
td:first-child {
    vertical-align: baseline;
}
</style>
