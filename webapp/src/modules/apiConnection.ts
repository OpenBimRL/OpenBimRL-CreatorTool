import { ref } from 'vue';

const API_ENDPOINT_STORAGE_KEY = 'openbimrl.apiEndpoint';
const API_ACCESS_TOKEN_STORAGE_KEY = 'openbimrl.apiAccessToken';

const getInitialApiEndpoint = () => {
    if (typeof window === 'undefined') return new URL('http://localhost:8080');
    const stored = window.localStorage.getItem(API_ENDPOINT_STORAGE_KEY);
    if (!stored) return new URL('http://localhost:8080');
    try {
        return new URL(stored);
    } catch {
        return new URL('http://localhost:8080');
    }
};

const getInitialApiAccessToken = () => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(API_ACCESS_TOKEN_STORAGE_KEY) ?? '';
};

export const apiEndpoint = ref(getInitialApiEndpoint());
export const apiAccessToken = ref(getInitialApiAccessToken());

export function setApiEndpoint(url: URL) {
    apiEndpoint.value = url;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(API_ENDPOINT_STORAGE_KEY, url.toString());
}

export function setApiAccessToken(token: string) {
    apiAccessToken.value = token;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(API_ACCESS_TOKEN_STORAGE_KEY, token);
}

function authHeaders(): HeadersInit {
    const token = apiAccessToken.value.trim();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

interface ApiAnswer<T> {
    status: string;
    content: T;
}

interface Node {
    inputs: Array<unknown>;
    outputs: Array<unknown>;
}

interface CheckResult {
    nodes: { [key: string]: Node };
    results: { [key: string]: unknown };
    checks: string;
}

interface ApiFunctionHandle {
    index: string;
    name: string;
}

interface ApiFunctionData {
    name: string;
    icon: string;
    description: string;
    label: string;
    inputs: Array<ApiFunctionHandle>;
    outputs: Array<ApiFunctionHandle>;
    selected: boolean;
}

interface ApiFunctionItem {
    id: string;
    type: string;
    data: ApiFunctionData;
}

export interface ApiFunctionGroup {
    id: string;
    name: string;
    color: string;
    items: Array<ApiFunctionItem>;
}

export interface ApiStatus {
    version: string;
    gpuOffloadEnabled: boolean;
    gpuOffloadArch: string | null;
}

type Error = unknown;

export async function checkGraph(
    modelUUID: string,
    graph: string,
    signal?: AbortSignal,
): Promise<ApiAnswer<CheckResult | Error | null>> {
    const fd = new FormData();

    fd.append('file', graph);

    const graphUUID = (await postApi<string>('/graph', fd, signal)).content;

    const getParams = `graphIDs=${graphUUID}`;

    const requestEndpoint = `/check/${modelUUID}?${getParams}`;

    return await getApi<CheckResult | Error | null>(requestEndpoint, signal);
}

export async function isConnected(): Promise<boolean> {
    try {
        const response = await getApi<boolean>('/connection');
        return response.content;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function addModel(file: File): Promise<ApiAnswer<string>> {
    const fd = new FormData();

    fd.append('file', file);
    const response = await postApi<string>('/model', fd);

    return response;
}

export async function getModel(id: string): Promise<Uint8Array> {
    return await getApiBinary('/model/' + id);
}

export async function getModels(): Promise<Map<string, string>> {
    try {
        const response = await getApi<{ [key: string]: string }>('/models');
        return new Map(Object.entries(response.content));
    } catch (e) {
        console.error(e);
        return new Map();
    }
}

export async function getFunctions(): Promise<Array<ApiFunctionGroup>> {
    const response = await getApi<Array<ApiFunctionGroup>>('/functions');
    return response.content;
}

export async function getStatus(): Promise<ApiStatus> {
    const response = await getApi<ApiStatus>('/status');
    return response.content;
}

async function getApi<T>(path: string, signal?: AbortSignal): Promise<ApiAnswer<T>> {
    const response = await fetch(new URL(path, apiEndpoint.value), {
        headers: authHeaders(),
        signal,
    });
    if (!response.ok) throw new Error(response.statusText);

    const data = await (response.json() as Promise<ApiAnswer<T>>);
    return data;
}

async function getApiBinary(path: string, signal?: AbortSignal): Promise<Uint8Array> {
    const response = await fetch(new URL(path, apiEndpoint.value), {
        headers: authHeaders(),
        signal,
    });
    if (!response.ok) throw new Error(response.statusText);

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}

async function postApi<T>(
    path: string,
    params: FormData,
    signal?: AbortSignal,
): Promise<ApiAnswer<T>> {
    const response = await fetch(new URL(path, apiEndpoint.value), {
        method: 'POST',
        headers: authHeaders(),
        body: params,
        signal,
    });
    if (!response.ok) throw new Error(response.statusText);

    const data = await (response.json() as Promise<ApiAnswer<T>>);
    return data;
}
