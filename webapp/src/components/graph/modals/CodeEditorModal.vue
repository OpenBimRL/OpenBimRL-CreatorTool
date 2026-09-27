<template>
    <Teleport to="body">
        <dialog
            ref="dialogEl"
            class="code-editor-dialog"
            @cancel="onCancel"
            @close="onDialogClose"
        >
            <div class="flex h-full min-h-0 flex-col">
                <div
                    class="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-700"
                >
                    <h2 class="text-lg font-semibold text-default-dark dark:text-slate-100">
                        Code editor — {{ draft.label || 'script.customScript' }}
                    </h2>
                    <div
                        class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400"
                    >
                        <span class="font-semibold" :style="{ color: portColor('input') }">input</span>
                        <span class="font-semibold underline" :style="{ color: portColor('output') }">
                            output
                        </span>
                        <span>Kotlin (.kts) · LSP later</span>
                    </div>
                </div>

                <div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_1fr]">
                    <aside
                        class="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-slate-200/80 p-4 dark:border-slate-700"
                    >
                        <label class="block text-sm">
                            <span class="mb-1 block font-medium">Alias</span>
                            <input
                                v-model="draft.label"
                                class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                type="text"
                            />
                        </label>

                        <section>
                            <div class="mb-2 flex items-center justify-between">
                                <h3 class="text-sm font-semibold">Inputs</h3>
                                <button type="button" class="btn-secondary !text-xs" @click="addInput">
                                    + input
                                </button>
                            </div>
                            <div
                                v-for="(port, i) in draft.inputs"
                                :key="'in-' + i"
                                class="mb-2 space-y-1 rounded border border-slate-200 p-2 dark:border-slate-700"
                            >
                                <input
                                    v-model="port.name"
                                    class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                    placeholder="name"
                                />
                                <select
                                    v-model="port.typeHint"
                                    class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                >
                                    <option v-for="t in SCRIPT_TYPE_OPTIONS" :key="t" :value="t">
                                        {{ t }}
                                    </option>
                                </select>
                                <button
                                    type="button"
                                    class="text-xs text-red-600 dark:text-red-400"
                                    @click="removeInput(i)"
                                >
                                    Remove
                                </button>
                            </div>
                        </section>

                        <section>
                            <div class="mb-2 flex items-center justify-between">
                                <h3 class="text-sm font-semibold">Outputs</h3>
                                <button
                                    type="button"
                                    class="btn-secondary !text-xs"
                                    @click="addOutput"
                                >
                                    + output
                                </button>
                            </div>
                            <div
                                v-for="(port, i) in draft.outputs"
                                :key="'out-' + i"
                                class="mb-2 space-y-1 rounded border border-slate-200 p-2 dark:border-slate-700"
                            >
                                <input
                                    v-model="port.name"
                                    class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                    placeholder="name"
                                />
                                <select
                                    v-model="port.typeHint"
                                    class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                >
                                    <option v-for="t in SCRIPT_TYPE_OPTIONS" :key="t" :value="t">
                                        {{ t }}
                                    </option>
                                </select>
                                <button
                                    type="button"
                                    class="text-xs text-red-600 dark:text-red-400"
                                    :disabled="draft.outputs.length <= 1"
                                    @click="removeOutput(i)"
                                >
                                    Remove
                                </button>
                            </div>
                        </section>
                    </aside>

                    <div class="relative min-h-[320px] min-w-0">
                        <div ref="editorHost" class="absolute inset-0" />
                    </div>
                </div>

                <div
                    class="flex justify-end gap-3 border-t border-slate-200/80 px-4 py-3 dark:border-slate-700"
                >
                    <button type="button" class="btn-secondary" @click="close(DialogReturnValue.cancel)">
                        Cancel
                    </button>
                    <button type="button" class="btn-primary" @click="close(DialogReturnValue.accept)">
                        Apply
                    </button>
                </div>
            </div>
        </dialog>
    </Teleport>
</template>

<script lang="ts" setup>
import {
    CodePort,
    SCRIPT_TYPE_OPTIONS,
    generateCodeScaffold,
    validatePortName,
} from '@/modules/codeScaffold';
import { darkModeKey } from '@/keys';
import {
    installKotlinPortHighlighting,
    kotlinEditorTheme,
    kotlinPortColor,
    loadMonaco,
} from '@/modules/kotlinPortHighlight';
import type { editor as MonacoEditor } from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import { inject, nextTick, reactive, ref, shallowRef, watch, type Ref } from 'vue';
import { DialogReturnValue } from '../../modals';
import type { CodeNodeData } from '../Types';

declare global {
    interface Window {
        MonacoEnvironment?: {
            getWorker(_: string, label: string): Worker;
        };
    }
}

const emit = defineEmits<{
    close: [];
}>();

const darkMode = inject(darkModeKey) as Ref<boolean>;
const dialogEl = ref<HTMLDialogElement | null>(null);
const editorHost = ref<HTMLDivElement | null>(null);
const editor = shallowRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
let lastReturn: DialogReturnValue = DialogReturnValue.cancel;

const draft = reactive({
    label: '',
    language: 'kotlin',
    scriptSource: '',
    inputs: [] as CodePort[],
    outputs: [] as CodePort[],
});

function portColor(kind: 'input' | 'output') {
    return kotlinPortColor(kind, darkMode.value);
}

function portNames() {
    return {
        inputs: draft.inputs.map(port => port.name),
        outputs: draft.outputs.map(port => port.name),
    };
}

async function applyPortHighlighting() {
    const monaco = await loadMonaco();
    const { inputs, outputs } = portNames();
    installKotlinPortHighlighting(monaco, inputs, outputs);
    return monaco;
}

async function applyMonacoTheme() {
    if (!editor.value) return;
    const monaco = await applyPortHighlighting();
    monaco.editor.setTheme(kotlinEditorTheme(darkMode.value));
}

watch(darkMode, () => {
    void applyMonacoTheme();
});

watch(
    () =>
        draft.inputs.map(port => port.name).join('\0') +
        '\n' +
        draft.outputs.map(port => port.name).join('\0'),
    () => {
        if (!editor.value) return;
        void applyPortHighlighting();
    },
);

function reindex(ports: CodePort[]) {
    ports.forEach((p, i) => {
        p.index = String(i);
    });
}

function addInput() {
    const n = draft.inputs.length;
    draft.inputs.push({ index: String(n), name: `in${n}`, typeHint: 'Any' });
}

function removeInput(i: number) {
    draft.inputs.splice(i, 1);
    reindex(draft.inputs);
}

function addOutput() {
    const n = draft.outputs.length;
    draft.outputs.push({ index: String(n), name: n === 0 ? 'result' : `out${n}`, typeHint: 'Any' });
}

function removeOutput(i: number) {
    if (draft.outputs.length <= 1) return;
    draft.outputs.splice(i, 1);
    reindex(draft.outputs);
}

function syncEditorFromDraft() {
    editor.value?.setValue(draft.scriptSource);
}

function syncDraftFromEditor() {
    if (editor.value) {
        draft.scriptSource = editor.value.getValue();
    }
}

async function ensureEditor() {
    if (editor.value || !editorHost.value) return;
    const monaco = await applyPortHighlighting();
    // Vite worker setup (Kotlin highlighting plus port colors; full LSP is out of scope)
    self.MonacoEnvironment = {
        getWorker(_: string, label: string) {
            if (label === 'json') {
                return new JsonWorker();
            }
            return new EditorWorker();
        },
    };
    editor.value = monaco.editor.create(editorHost.value, {
        value: draft.scriptSource,
        language: 'kotlin',
        theme: kotlinEditorTheme(darkMode.value),
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
    });
}

async function open(data: CodeNodeData) {
    draft.label = data.label || 'ScriptName';
    draft.language = data.scriptLanguage || 'kotlin';
    draft.inputs = (data.inputs || []).map((p, i) => ({
        index: String(i),
        name: p.name || `in${i}`,
        typeHint: p.typeHint || 'Any',
        collectionType: p.collectionType,
    }));
    draft.outputs =
        data.outputs && data.outputs.length
            ? data.outputs.map((p, i) => ({
                  index: String(i),
                  name: p.name || (i === 0 ? 'result' : `out${i}`),
                  typeHint: p.typeHint || 'Any',
                  collectionType: p.collectionType,
              }))
            : [{ index: '0', name: 'result', typeHint: 'Any' }];
    draft.scriptSource =
        data.scriptSource || generateCodeScaffold(draft.inputs, draft.outputs);

    lastReturn = DialogReturnValue.cancel;
    dialogEl.value?.showModal();
    await nextTick();
    await ensureEditor();
    await applyMonacoTheme();
    syncEditorFromDraft();
}

function close(value: DialogReturnValue = DialogReturnValue.cancel) {
    lastReturn = value;
    if (value === DialogReturnValue.accept) {
        syncDraftFromEditor();
        for (const p of [...draft.inputs, ...draft.outputs]) {
            const err = validatePortName(p.name);
            if (err) {
                window.alert(`Invalid port name "${p.name}": ${err}`);
                return;
            }
        }
    }
    dialogEl.value?.close(value);
}

function onCancel(event: Event) {
    event.preventDefault();
    close(DialogReturnValue.cancel);
}

function onDialogClose() {
    emit('close');
}

function returnValue() {
    return lastReturn;
}

function getDraft(): Partial<CodeNodeData> {
    reindex(draft.inputs);
    reindex(draft.outputs);
    return {
        label: draft.label,
        scriptLanguage: draft.language,
        scriptSource: draft.scriptSource,
        inputs: draft.inputs.map(p => ({ ...p })),
        outputs: draft.outputs.map(p => ({ ...p })),
    };
}

defineExpose({ open, close, returnValue, getDraft });
</script>