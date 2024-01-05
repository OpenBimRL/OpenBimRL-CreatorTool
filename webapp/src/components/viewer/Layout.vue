<template>
    <div ref="el" class="bg-default-light dark:bg-default-dark h-full flex flex-row">
        <IFCViewer class="w-full h-full" />
        <div class="w-1/6 p-4">
            <h4 class="text-xl">Models:</h4>
            <p v-for="model in models">{{ model }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getModels } from '@/modules/apiConnection';
import { onMounted, ref } from 'vue';
import IFCViewer from './IFCViewer.vue';

const el = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

const models = ref<Array<string>>([]);

onMounted(() => {
    const filteredElements = el.value?.getElementsByTagName('canvas');
    if (!filteredElements?.length) return;

    canvas.value = filteredElements[0];

    getModels().then(result => (models.value = result));
});
</script>

<style scoped></style>
