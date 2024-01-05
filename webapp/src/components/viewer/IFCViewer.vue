<template>
    <div ref="viewerContainer" class="relative dark:text-default-darkest" />
</template>

<script setup lang="ts">
import { getModel } from '@/modules/apiConnection';
import { createLoader, getSelected } from '@/modules/ifcViewer';
import { onMounted, ref } from 'vue';

const viewerContainer = ref<HTMLElement | null>(null);

onMounted(() => {
    if (!viewerContainer.value) return;

    const loader = createLoader(viewerContainer.value);

    getModel("8f1f535b-87e6-4e3d-83a7-f0f64a88d2d2").then(async data => console.log(await loader.load(data, "test")));
    
    
});
</script>

<style></style>
