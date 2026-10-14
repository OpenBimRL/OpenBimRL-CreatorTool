import { apiAccessToken, apiEndpoint } from '@/modules/apiConnection';
import { aiChatSettings } from './settings';

export interface AiToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
}

export type AiChatMessage =
    | { role: 'system' | 'user'; content: string }
    | { role: 'assistant'; content: string | null; tool_calls?: AiToolCall[] }
    | { role: 'tool'; tool_call_id: string; content: string };

export interface AiToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface AiCompletion {
    content: string | null;
    toolCalls: AiToolCall[];
    finishReason: string | null;
}

interface ChatCompletionResponse {
    choices?: Array<{
        message?: { content?: string | null; tool_calls?: AiToolCall[] | null };
        finish_reason?: string | null;
    }>;
}

interface ModelListResponse {
    data?: Array<{ id: string }>;
}

interface ApiErrorBody {
    error?: { message?: string; code?: string | null };
}

const SETTINGS_HINT = 'Check Settings → AI Chatbot.';

export class AiApiError extends Error {
    constructor(message: string, readonly status?: number, readonly code?: string) {
        super(message);
        this.name = 'AiApiError';
    }

    /** True when the deployment rejected the `tools` parameter (e.g. no function-calling support). */
    get isToolSupportError(): boolean {
        return this.status === 400 && /\btool|function/i.test(this.message);
    }
}

function networkErrorMessage(): string {
    return 'Could not reach the OpenBIMRL Engine API, which forwards chat requests to the AI service. Check Settings → API Connection.';
}

function isEngineUnauthorized(body: unknown): boolean {
    const record = body as { status?: string; content?: unknown } | null;
    return (
        record?.status === 'unauthorized' &&
        record.content == null &&
        !(body as ApiErrorBody)?.error
    );
}

function errorFromResponse(response: Response, body: unknown, text: string): AiApiError {
    const errorBody = (body as ApiErrorBody | null)?.error;
    const detail = errorBody?.message || text.slice(0, 300) || response.statusText;
    const code = errorBody?.code ?? undefined;
    if (isEngineUnauthorized(body)) {
        return new AiApiError(
            'The OpenBIMRL Engine API rejected the request. Check the access token in Settings → API Connection.',
            response.status,
            'engine_unauthorized',
        );
    }
    switch (response.status) {
        case 401:
            return new AiApiError(`Authentication failed: ${detail} ${SETTINGS_HINT}`, 401, code);
        case 403:
            return new AiApiError(`Access denied: ${detail}`, 403, code);
        case 404:
            if (code === 'model_not_found') {
                return new AiApiError(
                    `${detail} Choose an available model in Settings → AI Chatbot.`,
                    404,
                    code,
                );
            }
            if (!errorBody?.message) {
                return new AiApiError(
                    'The OpenBIMRL Engine API does not expose the AI proxy yet. Update the Engine, then try again.',
                    404,
                    'engine_missing_proxy',
                );
            }
            return new AiApiError(`Not found: ${detail} ${SETTINGS_HINT}`, 404, code);
        case 429:
            return new AiApiError(`Rate or usage limit exceeded: ${detail}`, 429, code);
        default:
            return new AiApiError(
                `AI API error ${response.status}: ${detail}`,
                response.status,
                code,
            );
    }
}

function aiProxyUrl(path: string): string {
    return new URL(`/ai/v1/${path.replace(/^\/+/, '')}`, apiEndpoint.value).toString();
}

function aiProxyHeaders(): Record<string, string> {
    const apiKey = aiChatSettings.apiKey.trim();
    const baseUrl = aiChatSettings.baseUrl.trim().replace(/\/+$/, '');
    let parsed: URL;
    try {
        parsed = new URL(baseUrl);
    } catch {
        throw new AiApiError(
            `The API base URL is not valid. ${SETTINGS_HINT}`,
            undefined,
            'invalid_url',
        );
    }
    if (parsed.protocol !== 'https:') {
        throw new AiApiError(
            `The API base URL must use https. ${SETTINGS_HINT}`,
            undefined,
            'invalid_url',
        );
    }

    const headers: Record<string, string> = {
        'X-AI-Api-Key': apiKey,
        'X-AI-Base-Url': baseUrl,
    };
    const engineToken = apiAccessToken.value.trim();
    if (engineToken) headers.Authorization = `Bearer ${engineToken}`;
    return headers;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const apiKey = aiChatSettings.apiKey.trim();
    if (!apiKey) {
        throw new AiApiError(`No API key configured. ${SETTINGS_HINT}`, undefined, 'no_api_key');
    }

    const headers = aiProxyHeaders();
    const method = (init.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
        response = await fetch(aiProxyUrl(path), {
            ...init,
            headers: {
                ...headers,
                ...init.headers,
            },
        });
    } catch (error) {
        if ((error as Error).name === 'AbortError') throw error;
        throw new AiApiError(networkErrorMessage(), undefined, 'network_error');
    }

    const text = await response.text();
    let body: unknown = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = null;
    }

    if (!response.ok) throw errorFromResponse(response, body, text);
    return body as T;
}

export async function listAiModels(signal?: AbortSignal): Promise<string[]> {
    const response = await request<ModelListResponse>('models', { signal });
    return (response?.data ?? [])
        .map(model => model.id)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
}

export async function createChatCompletion(options: {
    messages: AiChatMessage[];
    tools?: AiToolDefinition[];
    toolChoice?: 'auto' | 'none';
    signal?: AbortSignal;
}): Promise<AiCompletion> {
    const model = aiChatSettings.model.trim();
    if (!model) {
        throw new AiApiError(`No model selected. ${SETTINGS_HINT}`, undefined, 'no_model');
    }

    const body: Record<string, unknown> = {
        model,
        messages: options.messages,
        stream: false,
    };
    if (options.tools?.length) {
        body.tools = options.tools;
        if (options.toolChoice) body.tool_choice = options.toolChoice;
    }
    if (aiChatSettings.temperature !== null) body.temperature = aiChatSettings.temperature;
    if (aiChatSettings.maxTokens !== null) body.max_tokens = aiChatSettings.maxTokens;

    const response = await request<ChatCompletionResponse>('chat/completions', {
        method: 'POST',
        body: JSON.stringify(body),
        signal: options.signal,
    });

    const choice = response?.choices?.[0];
    if (!choice?.message) throw new AiApiError('The AI API returned no message.');

    return {
        content: choice.message.content ?? null,
        toolCalls: choice.message.tool_calls ?? [],
        finishReason: choice.finish_reason ?? null,
    };
}
