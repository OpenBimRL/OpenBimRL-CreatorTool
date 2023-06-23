<template>
    <Expandable title="Result Sets">
        <form
            @submit.prevent
            v-for="(set, index) in json.graph.value.resultSets"
            class="mx-2 border-default-contrast py-2"
            :class="{ 'border-b-8': openSets[index] }"
        >
            <div class="flex gap-4">
                <div class="border rounded overflow-hidden flex w-full">
                    <label
                        :for="`result-set_no--${index}`"
                        class="p-2 text-sm cursor-text bg-slate-100 border-r"
                    >
                        <span>Name</span>
                    </label>
                    <input
                        :id="`result-set_no--${index}`"
                        placeholder="..."
                        v-model="set.name"
                        class="w-full pl-1"
                    />
                </div>

                <button
                    class="bg-default-dark p-2 rounded"
                    @click="openSets[index] = !openSets[index]"
                >
                    <ArrowDownIcon
                        class="w-6 transition-transform"
                        :class="{ 'rotate-180': !openSets[index] }"
                    />
                </button>
                <button class="bg-danger p-2 rounded" @click="removeResultSet(index)">
                    <TrashIcon class="w-6" />
                </button>
            </div>
            <div v-show="openSets[index]" class="grid w-full grid-cols-2 border-t-2 mt-2 pt-2">
                <div class="border rounded overflow-hidden flex w-full">
                    <label
                        :for="`result-set_no--${index}__elements`"
                        class="p-2 text-sm cursor-text bg-slate-100 border-r"
                    >
                        <span>Elements</span>
                    </label>
                    <input
                        :id="`result-set_no--${index}__elements`"
                        placeholder="..."
                        v-model="set.elements"
                        class="w-full pl-1"
                    />
                </div>
                <div class="border rounded overflow-hidden flex w-full">
                    <label
                        :for="`result-set_no--${index}__filter`"
                        class="p-2 text-sm cursor-text bg-slate-100 border-r"
                    >
                        <span>Filter</span>
                    </label>
                    <input
                        :id="`result-set_no--${index}__filter`"
                        placeholder="..."
                        v-model="set.filter"
                        class="w-full pl-1"
                    />
                </div>
            </div>
        </form>
    </Expandable>
</template>

<script setup lang="ts">
import { graphInjectionKey } from '@/keys';
import { ArrowDownIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { inject, ref } from 'vue';
import type { GraphInject } from '../graph/Types';
import Expandable from './Expandable.vue';

const json = inject(graphInjectionKey) as GraphInject;
const openSets = ref<{ [key: number]: boolean }>({});

const removeResultSet = (index: number) => {
    json.graph.value.resultSets.splice(index, 1);
};
</script>

<style scoped></style>
