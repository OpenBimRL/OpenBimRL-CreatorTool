<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <dialog ref="dialog" class="-translate-y-full rounded border border-black p-12" @cancel="onCancel">
        <div>
            <span class="text-2xl">
                <slot name="title" />
            </span>
        </div>
        <hr class="my-4" />
        <form method="dialog" class="text-lg">
            <slot name="content" />
            <div class="mt-4 flex justify-end gap-4">
                <button
                    type="button"
                    :class="reject_button_class"
                    @click="close(DialogReturnValue.cancel)"
                >
                    <span class="text-lg">
                        <slot name="reject_button_text" />
                    </span>
                </button>
                <button type="submit" :class="accept_button_class" :value="DialogReturnValue.accept">
                    <span class="text-lg">
                        <slot name="accept_button_text" />
                    </span>
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

withDefaults(defineProps<Props>(), {
    accept_button_class: 'bg-blue-600',
    reject_button_class: 'bg-red-600',
});

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

<style scoped>
form button {
    @apply rounded-sm px-3 py-[0.125rem];
}
</style>
