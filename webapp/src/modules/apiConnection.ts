import { ref } from "vue";

export const apiEndpoint = ref(new URL('http://localhost:8080'));

interface ApiAnswer<T> {
    status: string;
    content: T;
}

interface ApiPostData<T> {
    data: T;
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
    return await postApi<string>("/model", {data: await file.text()})
}

export async function getModel(id: string): Promise<Uint8Array> {
    return await getApiBinary("/model/" + id);
}

async function getApi<T>(url: string): Promise<ApiAnswer<T>> {
    const response = await fetch(apiEndpoint.value + url);
    if (!response.ok) throw new Error(response.statusText);

    const data = await (response.json() as Promise<ApiAnswer<T>>);
    return data;
}

async function getApiBinary(url: string): Promise<Uint8Array> {
    const response = await fetch(apiEndpoint.value + url);
    if (!response.ok) throw new Error(response.statusText);

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}

async function postApi<T>(url: string, params: ApiPostData<any>): Promise<ApiAnswer<T>> {
    const response = await fetch(apiEndpoint.value + url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    });
    if (!response.ok) throw new Error(response.statusText);

    const data = await (response.json() as Promise<ApiAnswer<T>>);
    return data;
}
