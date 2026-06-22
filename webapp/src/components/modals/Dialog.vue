<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <dialog
        ref="dialog"
        class="fixed left-1/2 top-1/2 z-[100] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200/80 bg-white p-0 shadow-panel backdrop:bg-slate-900/50 dark:border-slate-700 dark:bg-slate-900"
        @cancel="onCancel"
    >
        <div class="border-b border-slate-200/80 px-6 py-4 dark:border-slate-700">
            <h2 class="text-lg font-semibold text-default-dark dark:text-slate-100">
                <slot name="title" />
            </h2>
        </div>
        <form method="dialog" class="px-6 py-4">
            <div class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <slot name="content" />
            </div>
            <div class="mt-6 flex justify-end gap-2">
                <button
                    type="button"
                    :class="reject_button_class || 'btn-secondary'"
                    @click="close(DialogReturnValue.cancel)"
                >
                    <slot name="reject_button_text" />
                </button>
                <button
                    type="submit"
                    :class="accept_button_class || 'btn-primary'"
                    :value="DialogReturnValue.accept"
                >
                    <slot name="accept_button_text" />
                </button>
            </div>
        </form>
    </dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { DialogReturnValue } from '.';

interface Props {
    accept_button_class?: string;
    reject_button_class?: string;
}

defineProps<Props>();

const dialog = ref<HTMLDialogElement | null>(null);

const open = () => {
    dialog.value?.showModal();
};

const close = (value: DialogReturnValue = DialogReturnValue.cancel) => {
    dialog.value?.close(value);
};

const onCancel = (event: Event) => {
    event.preventDefault();
    close(DialogReturnValue.cancel);
};

const returnValue = () => dialog.value?.returnValue as DialogReturnValue | undefined;

defineExpose({ open, close, returnValue });
</script>
