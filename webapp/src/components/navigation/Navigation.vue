<script setup lang="ts">
    import { ref } from 'vue';
    import { DropdownButton } from '.';
    import { Dialog } from '../modals';

    const uploadModalItems = {
        XML: () => console.log('XML'),
        JSON: () => console.log('JSON'),
    };
    const downloadModalItems = {
        XML: () => console.log('XML'),
        JSON: () => console.log('JSON'),
    };

    const dialog = ref<typeof Dialog | null>(null);
</script>

<template>
    <nav class="fixed z-10 w-full bg-gray-300 p-1 pl-8 text-white">
        <ul class="mt-1 flex gap-4">
            <li>
                <button class="nav-button" @click.prevent="dialog?.open()">
                    <span>New</span>
                </button>
                <Dialog ref="dialog" @close="">
                    <template v-slot:title>Creating new Project</template>
                    <template v-slot:content>
                        <p>Are you sure to create a new project?</p>
                        <p>Unsaved changes will be lost.</p>
                    </template>
                    <template v-slot:accept_button_text>Go Back</template>
                    <template v-slot:reject_button_text>Continue</template>
                </Dialog>
            </li>
            <li>
                <div class="flex gap-1">
                    <DropdownButton :modal-items="uploadModalItems">
                        <span>Upload</span>
                    </DropdownButton>
                    <DropdownButton :modal-items="downloadModalItems">
                        <span>Download</span>
                    </DropdownButton>
                </div>
            </li>
            <li>
                <button class="blue nav-button bg-blue-600">Create Nodes</button>
            </li>
            <li>
                <button class="nav-button" @click="$emit('showHelp')">Help?</button>
            </li>
        </ul>
    </nav>
</template>

<style>
    button.nav-button {
        @apply rounded-sm px-2 py-1;
    }

    button.nav-button:not(.blue) {
        @apply bg-gray-500;
    }
</style>
