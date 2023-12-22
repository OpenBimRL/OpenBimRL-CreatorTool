<template>
    <div class="flex">
        <input
            class="hidden"
            type="file"
            accept=".ifc"
            ref="ifcModelInput"
            @change="addModelFunc"
        />
        <button class="nav-button" @click="ifcModelInput?.click()">Add Model</button>
    </div>
</template>

<script setup lang="ts">
import { addModel } from '@/modules/apiConnection';
import { Ref, ref } from 'vue';

const ifcModelInput: Ref<HTMLInputElement | null> = ref(null);
const addModelFunc = (event: Event) => {
    const files = ifcModelInput.value?.files;
    if (!files || !files[0]) return;
    addModel(files[0]);
};
</script>

<style scoped></style>
