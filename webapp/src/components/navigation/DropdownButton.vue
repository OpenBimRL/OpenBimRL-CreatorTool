<template>
    <button class="nav-button" @click.stop="activateModal">
        <span>
            <slot />
            <ChevronUpIcon v-if="modal?.active" class="inline h-4 w-4" />
            <ChevronDownIcon v-else class="inline h-4 w-4" />
        </span>
    </button>
    <Modal ref="modal" :modal-items="modalItems" />
</template>

<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/20/solid';
import { ref } from 'vue';
import { DropdownModal as Modal, closeAll } from '../modals';
import { DropdownProps } from './Types';

const { modalItems } = defineProps<{ modalItems: DropdownProps }>();

const modal = ref<typeof Modal | null>(null);

const activateModal = () => {
    const oldVal = modal.value?.active;
    closeAll();
    modal.value!.active = !oldVal;
};
</script>

<style scoped></style>
