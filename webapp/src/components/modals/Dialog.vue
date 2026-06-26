<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <Teleport to="body">
        <dialog ref="dialog" class="app-dialog" @cancel="onCancel">
            <div class="border-b border-slate-200/80 px-6 py-4 dark:border-slate-700">
                <h2 class="text-lg font-semibold text-default-dark dark:text-slate-100">
                    <slot name="title" />
                </h2>
            </div>
            <form method="dialog" class="px-6 py-4">
                <div class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <slot name="content" />
                </div>
                <div class="mt-6 flex flex-wrap justify-end gap-3">
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
    </Teleport>
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
