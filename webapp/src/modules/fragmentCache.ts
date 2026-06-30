import { apiEndpoint } from './apiConnection';

const DB_NAME = 'openbimrl.fragments';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const CACHE_SCHEMA_VERSION = 1;

type StoredFragmentRecord = {
    schemaVersion: number;
    modelId: string;
    apiOrigin: string;
    savedAt: number;
    buffer: ArrayBuffer;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDbAvailable() {
    return typeof window !== 'undefined' && 'indexedDB' in window;
}

function fragmentCacheKey(modelId: string) {
    return `${apiEndpoint.value.origin}::${modelId}`;
}

function openDb(): Promise<IDBDatabase> {
    if (!isIndexedDbAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available'));
    }

    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('Failed to open fragment cache'));
        });
    }

    return dbPromise;
}

function runTransaction<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return openDb().then(
        db =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, mode);
                const store = tx.objectStore(STORE_NAME);
                const request = run(store);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error ?? new Error('Fragment cache transaction failed'));
                tx.onerror = () => reject(tx.error ?? new Error('Fragment cache transaction failed'));
            }),
    );
}

function toArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
    if (buffer instanceof ArrayBuffer) return buffer.slice(0);
    const view = new Uint8Array(buffer);
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

export async function getStoredFragment(modelId: string): Promise<ArrayBuffer | null> {
    if (!isIndexedDbAvailable()) return null;

    try {
        const record = await runTransaction<StoredFragmentRecord | undefined>('readonly', store =>
            store.get(fragmentCacheKey(modelId)),
        );

        if (!record || record.schemaVersion !== CACHE_SCHEMA_VERSION) return null;
        if (record.apiOrigin !== apiEndpoint.value.origin) return null;
        if (!(record.buffer instanceof ArrayBuffer) || record.buffer.byteLength === 0) return null;

        return record.buffer;
    } catch (error) {
        console.warn('Failed to read cached fragments', error);
        return null;
    }
}

export async function storeFragment(modelId: string, buffer: ArrayBufferLike): Promise<void> {
    if (!isIndexedDbAvailable()) return;

    const record: StoredFragmentRecord = {
        schemaVersion: CACHE_SCHEMA_VERSION,
        modelId,
        apiOrigin: apiEndpoint.value.origin,
        savedAt: Date.now(),
        buffer: toArrayBuffer(buffer),
    };

    try {
        await runTransaction<IDBValidKey>('readwrite', store => store.put(record, fragmentCacheKey(modelId)));
    } catch (error) {
        console.warn('Failed to store cached fragments', error);
    }
}

export async function deleteStoredFragment(modelId: string): Promise<void> {
    if (!isIndexedDbAvailable()) return;

    try {
        await runTransaction<undefined>('readwrite', store => store.delete(fragmentCacheKey(modelId)));
    } catch (error) {
        console.warn('Failed to delete cached fragments', error);
    }
}

export async function clearStoredFragments(): Promise<void> {
    if (!isIndexedDbAvailable()) return;

    try {
        await runTransaction<undefined>('readwrite', store => store.clear());
    } catch (error) {
        console.warn('Failed to clear cached fragments', error);
    }
}
