import { ref } from 'vue';
import { models } from './ifcViewer';

export const apiEndpoint = ref(new URL('http://localhost:8080'));

interface ApiAnswer<T> {
    status: string;
    content: T;
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

    // update model ID in Map
    models.push(response.content);

    return response;
}

export async function getModel(id: string): Promise<Uint8Array> {
    return await getApiBinary('/model/' + id);
}

export async function getModels(): Promise<Array<string>> {
    try {
        const response = await getApi<Array<string>>('/models');
        return response.content;
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function getApi<T>(path: string): Promise<ApiAnswer<T>> {
    const response = await fetch(new URL(path, apiEndpoint.value));
    if (!response.ok) throw new Error(response.statusText);

    const data = await (response.json() as Promise<ApiAnswer<T>>);
    return data;
}

async function getApiBinary(path: string): Promise<Uint8Array> {
    const response = await fetch(new URL(path, apiEndpoint.value));
    if (!response.ok) throw new Error(response.statusText);

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}

async function postApi<T>(path: string, params: FormData): Promise<ApiAnswer<T>> {
    const response = await fetch(new URL(path, apiEndpoint.value), {
        method: 'POST',
        body: params,
    });
    if (!response.ok) throw new Error(response.statusText);

    const data = await (response.json() as Promise<ApiAnswer<T>>);
    return data;
}
