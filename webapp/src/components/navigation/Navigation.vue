<template>
    <nav class="fixed z-10 w-full bg-default-dark pl-8 text-primary text-lg">
        <ul class="flex">
            <li></li>
            <li>
                <NewGraph />
            </li>
            <li>
                <Upload />
            </li>
            <li>
                <Download />
            </li>
            <li>
                <button class="nav-button" @click="$emit('showNodeLib')">Create Nodes</button>
            </li>
            <li>
                <button class="nav-button">Create Group</button>
            </li>
            <li>
                <button class="nav-button" @click="$emit('showHelp')">Help?</button>
            </li>
        </ul>
    </nav>
</template>

<script setup lang="ts">
import { graphInjectionKey } from '@/keys';

import { inject, Ref, ref } from 'vue';
import { xml2js } from 'xml-js';

import type { GraphInject, ParseOptions } from '../graph/Types';
import { NewGraph, Download, Upload } from './buttons';

defineEmits(['showNodeLib', 'showHelp']);

const { graph, resetGraph } = inject(graphInjectionKey) as GraphInject;


</script>

<style>
button.nav-button {
    @apply rounded !px-2 !py-1 hover:bg-slate-700;
}

li {
    @apply my-1;
}
</style>
