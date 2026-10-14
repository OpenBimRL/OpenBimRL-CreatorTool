import type { GraphJSON } from '@/components/graph/Types';
import { getLiveGraphEditor } from '@/modules/graphEditorBridge';
import router from '@/modules/router';
import { computed, ref, shallowRef } from 'vue';
import { AgentToolEvent, runAgent } from './agent';
import { AiApiError, AiChatMessage } from './client';
import {
    captureGraph,
    EditorContext,
    graphEdges,
    graphNodes,
    graphSignature,
    restoreGraph,
    selectedGraphNodeId,
} from './graphOps';
import { aiChatSettings, isAiChatConfigured } from './settings';
import { editorContextNote } from './systemPrompt';

export type ChatEntryRole = 'user' | 'assistant' | 'error' | 'notice';

export interface ChatEntry {
    id: number;
    role: ChatEntryRole;
    content: string;
    toolCalls: AgentToolEvent[];
    pending?: boolean;
    changedGraph?: boolean;
    /** Show a link to the AI Chatbot settings below the message. */
    settingsHint?: boolean;
}

/** Graph state before the most recent prompt that changed the graph (single slot, no history). */
interface UndoSnapshot {
    graph: GraphJSON;
    afterSignature: string;
    prompt: string;
}

const MAX_HISTORY_MESSAGES = 20;
const SETTINGS_ERROR_CODES = new Set([
    'no_api_key',
    'no_model',
    'invalid_url',
    'network_error',
    'engine_unauthorized',
    'upstream_not_allowed',
]);

export const chatPanelOpen = ref(false);
export const chatEntries = ref<ChatEntry[]>([]);
export const chatBusy = ref(false);
export const chatStatusText = ref('');

const undoSnapshot = shallowRef<UndoSnapshot | null>(null);
export const canUndoLastAiChange = computed(() => undoSnapshot.value !== null && !chatBusy.value);
export const undoPromptText = computed(() => undoSnapshot.value?.prompt ?? '');

let apiHistory: AiChatMessage[] = [];
let pendingNotes: string[] = [];
let abortController: AbortController | null = null;
let nextEntryId = 1;

function pushEntry(entry: Omit<ChatEntry, 'id' | 'toolCalls'>): ChatEntry {
    chatEntries.value.push({ ...entry, id: nextEntryId++, toolCalls: [] });
    return chatEntries.value[chatEntries.value.length - 1];
}

function excerpt(text: string, length = 60) {
    const singleLine = text.replace(/\s+/g, ' ').trim();
    return singleLine.length > length ? `${singleLine.slice(0, length)}…` : singleLine;
}

function isSettingsError(error: unknown) {
    if (!(error instanceof AiApiError)) return false;
    return (
        SETTINGS_ERROR_CODES.has(error.code ?? '') ||
        error.status === 401 ||
        error.code === 'model_not_found'
    );
}

function contextNote(ctx: EditorContext) {
    return editorContextNote({
        view: String(router.currentRoute.value.name ?? ''),
        graphViewOpen: Boolean(getLiveGraphEditor()),
        nodeCount: graphNodes(ctx).length,
        edgeCount: graphEdges(ctx).length,
        selectedNodeId: selectedGraphNodeId(),
    });
}

export async function sendChatPrompt(text: string, ctx: EditorContext) {
    const prompt = text.trim();
    if (!prompt || chatBusy.value) return;

    pushEntry({ role: 'user', content: prompt });
    if (!isAiChatConfigured.value) {
        pushEntry({
            role: 'error',
            content:
                'The AI Chatbot is not configured yet. Add the API key and choose a model in the settings.',
            settingsHint: true,
        });
        return;
    }

    const before = captureGraph(ctx);
    const beforeSignature = graphSignature(before);
    const assistant = pushEntry({ role: 'assistant', content: '', pending: true });
    const userContent = [...pendingNotes, contextNote(ctx), prompt].join('\n\n');
    pendingNotes = [];

    chatBusy.value = true;
    chatStatusText.value = 'Thinking…';
    abortController = new AbortController();
    let completed = false;

    try {
        const result = await runAgent({
            history: apiHistory,
            prompt: userContent,
            ctx,
            toolMode: aiChatSettings.toolMode,
            signal: abortController.signal,
            callbacks: {
                onStatus: status => (chatStatusText.value = status),
                onToolStart: event => assistant.toolCalls.push({ ...event }),
                onToolEnd: event => {
                    const call = assistant.toolCalls.find(entry => entry.id === event.id);
                    if (call) Object.assign(call, event);
                },
                onNotice: notice => pushEntry({ role: 'notice', content: notice }),
            },
        });
        assistant.content = result.content;
        apiHistory.push(
            { role: 'user', content: userContent },
            { role: 'assistant', content: result.content },
        );
        apiHistory = apiHistory.slice(-MAX_HISTORY_MESSAGES);
        completed = true;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            assistant.content = '_Stopped._';
            pendingNotes.push('[Note: the user stopped your previous answer before it finished.]');
        } else {
            console.error(error);
            pushEntry({
                role: 'error',
                content: (error as Error).message || String(error),
                settingsHint: isSettingsError(error),
            });
        }
    } finally {
        assistant.pending = false;
        chatBusy.value = false;
        chatStatusText.value = '';
        abortController = null;

        const afterSignature = graphSignature(captureGraph(ctx));
        if (afterSignature !== beforeSignature) {
            undoSnapshot.value = { graph: before, afterSignature, prompt };
            assistant.changedGraph = true;
            if (!completed) {
                pendingNotes.push(
                    '[Note: your previous answer was interrupted after it had already changed the graph. Re-inspect the graph before continuing.]',
                );
            }
        }
        if (!assistant.content && !assistant.toolCalls.length) {
            chatEntries.value = chatEntries.value.filter(entry => entry.id !== assistant.id);
        }
    }
}

export function stopChatPrompt() {
    abortController?.abort();
}

/** Restores the graph captured before the last graph-changing prompt and drops the snapshot. */
export function undoLastAiChange(ctx: EditorContext): boolean {
    const snapshot = undoSnapshot.value;
    if (!snapshot || chatBusy.value) return false;

    const editedSince = graphSignature(captureGraph(ctx)) !== snapshot.afterSignature;
    if (
        editedSince &&
        !window.confirm(
            'The graph was edited after the AI change. Restoring the earlier state also discards those edits. Continue?',
        )
    ) {
        return false;
    }

    restoreGraph(ctx, snapshot.graph);
    undoSnapshot.value = null;
    pushEntry({
        role: 'notice',
        content: `Restored the graph to the state before “${excerpt(snapshot.prompt)}”.`,
    });
    pendingNotes.push(
        '[Note: the user pressed "Undo last AI change"; every graph change from your previous answer was reverted. Re-inspect the graph before relying on earlier results.]',
    );
    return true;
}

export function clearChat() {
    if (chatBusy.value) return;
    chatEntries.value = [];
    apiHistory = [];
    pendingNotes = [];
}
