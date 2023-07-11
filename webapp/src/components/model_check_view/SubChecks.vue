<template>
    <Expandable title="Sub Checks">
        <form
            @submit.prevent
            v-for="(check, index) in json.graph.value.subChecks"
            class="mx-2 border-default-contrast py-2"
            :class="{ 'border-b-8': openChecks[index] }"
        >
            <div class="flex gap-4">
                <InputField v-model="check.name">
                    <span>Name</span>
                </InputField>

                <button
                    class="bg-default-dark p-2 rounded"
                    @click="openChecks[index] = !openChecks[index]"
                >
                    <ArrowDownIcon
                        class="w-6 transition-transform"
                        :class="{ 'rotate-180': !openChecks[index] }"
                    />
                </button>
                <button class="bg-danger p-2 rounded" @click="removeSubCheck(index)">
                    <TrashIcon class="w-6" />
                </button>
            </div>
            <div v-show="openChecks[index]" class="border-t-2 mt-2 pt-2">
                <Applicability :check="check" />
                <RulesAndRuleSets :rules-and-rule-sets="check.rulesOrRuleSets" />
            </div>
        </form>
        <AddElement :kinds="[{ label: 'sub Checks', event: 'subChecks' }]" />
    </Expandable>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import { graphInjectionKey } from '@/keys';
import { ArrowDownIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { inject, ref } from 'vue';
import { AddElement, Applicability, Expandable, RulesAndRuleSets } from '.';
import type { GraphInject } from './Types';

const json = inject(graphInjectionKey) as GraphInject;
const openChecks = ref<{ [key: number]: boolean }>({});

const removeSubCheck = (index: number) => {
    json.graph.value.subChecks.splice(index, 1);
};
</script>

<style scoped></style>
