<template>
    <InputField type="text" v-model="aiChatSettings.baseUrl" :placeholder="KICONNECT_BASE_URL">
        <span>Base URL</span>
    </InputField>
    <p class="text-xs text-slate-500 dark:text-slate-400">
        OpenAI-compatible API root. The browser sends this to the OpenBIMRL Engine, which forwards
        the request. Default: KI:connect NRW.
        <button
            v-if="aiChatSettings.baseUrl !== KICONNECT_BASE_URL"
            type="button"
            class="ml-1 text-accent underline-offset-2 hover:underline"
            @click="resetAiChatBaseUrl"
        >
            Reset
        </button>
    </p>

    <InputField type="password" v-model="aiChatSettings.apiKey" autocomplete="off">
        <span>API key</span>
    </InputField>
    <p class="text-xs text-slate-500 dark:text-slate-400">
        Stored only in this browser. Each chat request sends it to the OpenBIMRL Engine (Settings →
        API Connection), which forwards it to the AI API. The Engine does not save the key.
    </p>

    <div class="space-y-2">
        <SelectField
            v-if="availableAiModels.length && !manualModel"
            v-model="aiChatSettings.model"
            :invalid="!aiChatSettings.model"
        >
            <span>Model</span>
            <template #options>
                <option value="" disabled>Select a model…</option>
                <option
                    v-if="aiChatSettings.model && !availableAiModels.includes(aiChatSettings.model)"
                    :value="aiChatSettings.model"
                >
                    {{ aiChatSettings.model }}
                </option>
                <option v-for="model in availableAiModels" :key="model" :value="model">
                    {{ model }}
                </option>
            </template>
        </SelectField>
        <InputField v-else type="text" v-model="aiChatSettings.model" placeholder="deployment name">
            <span>Model</span>
        </InputField>

        <div class="flex flex-wrap items-center gap-2">
            <button
                type="button"
                class="btn-secondary !text-xs"
                :disabled="modelsLoading || !aiChatSettings.apiKey.trim()"
                @click="loadModels"
            >
                <span v-if="!modelsLoading">Test &amp; load models</span>
                <VueSpinnerRadio v-else class="inline-block" />
            </button>
            <button
                v-if="availableAiModels.length"
                type="button"
                class="text-xs text-accent underline-offset-2 hover:underline"
                @click="manualModel = !manualModel"
            >
                {{ manualModel ? 'Choose from list' : 'Enter manually' }}
            </button>
        </div>
    </div>

    <div class="flex items-center gap-2">
        <span class="text-sm text-slate-500 dark:text-slate-400">Status</span>
        <span :class="statusBadgeClass">{{ statusText }}</span>
    </div>
    <p v-if="modelsError" class="text-xs text-red-600 dark:text-red-400">{{ modelsError }}</p>

    <SelectField v-model="aiChatSettings.toolMode">
        <span>Tool calling</span>
        <template #options>
            <option value="native">Native (OpenAI tools)</option>
            <option value="json">JSON protocol (models without tool support)</option>
        </template>
    </SelectField>

    <div class="grid grid-cols-2 gap-3">
        <InputField type="number" v-model="temperature" placeholder="default">
            <span>Temp.</span>
        </InputField>
        <InputField type="number" v-model="maxTokens" placeholder="default">
            <span>Max tokens</span>
        </InputField>
    </div>
    <p class="text-xs text-slate-500 dark:text-slate-400">
        Leave empty to use the deployment defaults. Some models reject a custom temperature.
    </p>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import SelectField from '@/components/SelectField.vue';
import { listAiModels } from '@/modules/aiChat/client';
import {
    aiChatSettings,
    availableAiModels,
    KICONNECT_BASE_URL,
    resetAiChatBaseUrl,
} from '@/modules/aiChat/settings';
import { computed, onMounted, ref } from 'vue';
import { VueSpinnerRadio } from 'vue3-spinners';

const modelsLoading = ref(false);
const modelsError = ref('');
const connected = ref<boolean | undefined>(undefined);
const manualModel = ref(false);

const statusText = computed(() => {
    if (connected.value === false) return 'not connected';
    if (connected.value) return `connected · ${availableAiModels.value.length} models`;
    return 'unknown';
});

const statusBadgeClass = computed(() => {
    if (connected.value === false) return 'badge-danger';
    if (connected.value) return 'badge-success';
    return 'badge-neutral';
});

const optionalNumber = (key: 'temperature' | 'maxTokens', integer: boolean) =>
    computed({
        get: () => (aiChatSettings[key] === null ? '' : String(aiChatSettings[key])),
        set: (value: string) => {
            const parsed = integer ? parseInt(value, 10) : parseFloat(value);
            aiChatSettings[key] = value.trim() && Number.isFinite(parsed) ? parsed : null;
        },
    });

const temperature = optionalNumber('temperature', false);
const maxTokens = optionalNumber('maxTokens', true);

const loadModels = async () => {
    if (modelsLoading.value || !aiChatSettings.apiKey.trim()) return;
    modelsLoading.value = true;
    modelsError.value = '';
    try {
        availableAiModels.value = await listAiModels();
        connected.value = true;
        if (!aiChatSettings.model && availableAiModels.value.length) {
            aiChatSettings.model = availableAiModels.value[0];
        }
    } catch (error) {
        connected.value = false;
        modelsError.value = (error as Error).message;
    } finally {
        modelsLoading.value = false;
    }
};

onMounted(() => {
    if (aiChatSettings.apiKey.trim() && !availableAiModels.value.length) void loadModels();
});
</script>
