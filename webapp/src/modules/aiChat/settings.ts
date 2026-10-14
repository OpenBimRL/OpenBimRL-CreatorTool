import { computed, reactive, ref, watch } from 'vue';

const AI_CHAT_SETTINGS_STORAGE_KEY = 'openbimrl.aiChat.settings';

/** OpenAI-compatible KI:connect API, see https://chat.kiconnect.nrw/app/api-docs/ */
export const KICONNECT_BASE_URL = 'https://chat.kiconnect.nrw/api/v1';

/** `native` uses OpenAI `tools`/`tool_calls`; `json` is a prompt-based fallback for models without tool support. */
export type AiToolMode = 'native' | 'json';

export interface AiChatSettings {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number | null;
    maxTokens: number | null;
    toolMode: AiToolMode;
}

const defaultSettings = (): AiChatSettings => ({
    baseUrl: KICONNECT_BASE_URL,
    apiKey: '',
    model: '',
    temperature: null,
    maxTokens: null,
    toolMode: 'native',
});

function loadSettings(): AiChatSettings {
    const defaults = defaultSettings();
    if (typeof window === 'undefined') return defaults;
    const raw = window.localStorage.getItem(AI_CHAT_SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    try {
        const parsed = JSON.parse(raw) as Partial<AiChatSettings>;
        return {
            baseUrl: parsed.baseUrl?.trim() || defaults.baseUrl,
            apiKey: parsed.apiKey ?? defaults.apiKey,
            model: parsed.model ?? defaults.model,
            temperature: parsed.temperature ?? defaults.temperature,
            maxTokens: parsed.maxTokens ?? defaults.maxTokens,
            toolMode: parsed.toolMode === 'json' ? 'json' : defaults.toolMode,
        };
    } catch {
        return defaults;
    }
}

export const aiChatSettings = reactive<AiChatSettings>(loadSettings());

/** Model ids returned by `GET /models`; not persisted. */
export const availableAiModels = ref<string[]>([]);

export const isAiChatConfigured = computed(
    () =>
        Boolean(aiChatSettings.baseUrl.trim()) &&
        Boolean(aiChatSettings.apiKey.trim()) &&
        Boolean(aiChatSettings.model.trim()),
);

watch(
    aiChatSettings,
    value => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(AI_CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(value));
    },
    { deep: true },
);

export function resetAiChatBaseUrl() {
    aiChatSettings.baseUrl = KICONNECT_BASE_URL;
}
