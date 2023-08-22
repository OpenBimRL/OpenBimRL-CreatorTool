<template>
    <div>{{ title }}</div>
</template>

<script setup lang="ts">
import { graphInjectionKey } from '@/keys';
import { inject } from 'vue';
import { GraphInject } from '../graph/Types';
import { ModelCheckProps } from './Types';

const props = defineProps<ModelCheckProps>();

const { graph } = inject(graphInjectionKey) as GraphInject;
</script>

<style scoped></style>
