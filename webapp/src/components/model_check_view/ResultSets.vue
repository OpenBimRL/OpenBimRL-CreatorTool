<template>
    <Expandable title="Result Sets">
        <form
            @submit.prevent
            v-for="(set, index) in json.graph.value.resultSets"
            class="mx-2 border-default-contrast py-2"
            :class="{ 'border-b-8': openSets[index] }"
        >
            <div class="flex gap-4">
                <InputField v-model="set.name">
                    <span>Name</span>
                </InputField>
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
            <div v-show="openSets[index]" class="grid gap-4 grid-cols-2 border-t-2 mt-2 pt-2">
                <div class="border rounded overflow-hidden flex w-full">
                    <div class="border rounded overflow-hidden flex w-full">
                        <label
                            :for="`select-element_for--set__${index}`"
                            class="p-2 text-sm cursor-text bg-slate-100 border-r"
                        >
                            <span>Element</span>
                        </label>
                        <select
                            :id="`select-element_for--set__${index}`"
                            class="w-full pl-1 bg-primary invalid:text-slate-500"
                            required
                        >
                            <option value="" disabled :selected="!set.elements">
                                select Element
                            </option>
                            <option
                                v-for="identifier in identifiers"
                                class="text-secondary"
                                :value="identifier.data?.label"
                                v-text="identifier.data?.label"
                                :selected="identifier.data?.label === set.elements"
                            />
                        </select>
                    </div>
                </div>
                <div class="border rounded overflow-hidden flex w-full">
                    <InputField v-model="set.filter">
                        <span>Filter</span>
                    </InputField>
                </div>
            </div>
        </form>
        <AddElement
            :kinds="[{ label: 'result Set', event: 'resultSet' }]"
            @addResultSet="addResultSet"
        />
    </Expandable>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import { graphInjectionKey } from '@/keys';
import { ArrowDownIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { computed, inject, ref } from 'vue';
import { AddElement, Expandable } from '.';
import type { CustomNode, GraphInject, ResultSet } from './Types';

const json = inject(graphInjectionKey) as GraphInject;
const openSets = ref<{ [key: number]: boolean }>({});

const removeResultSet = (index: number) => {
    json.graph.value.resultSets.splice(index, 1);
};

const addResultSet = () => {
    json.graph.value.resultSets.push({} as ResultSet);
};

const identifiers = computed(
    () =>
        json.graph.value.elements.filter(
            element => element.type === 'ruleIdentifier',
        ) as Array<CustomNode>,
);
</script>

<style scoped></style>
