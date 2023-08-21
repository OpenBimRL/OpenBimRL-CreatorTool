<template>
    <div class="rule-set">
        <div class="flex flex-row gap-4 p-2">
            <InputField class="w-full" v-model="ruleSet.label">
                <span>Label</span>
            </InputField>
            <button class="bg-danger p-2 rounded">
                <TrashIcon class="w-6" />
            </button>
        </div>
        <div v-for="element in ruleSet.rulesOrRuleSets" class="border p-4">
            <button
                @click="openRules.set(element, !openRules.get(element))"
                class="bg-transparent w-full"
            >
                <p class="text-center">
                    <span>{{ element.type }} : {{ element.label }}</span>
                </p>
            </button>
            <RuleOrRuleSet v-show="openRules.get(element)" :rule-or-rule-set="element" />
        </div>
        <AddElement :kinds="['rule', 'ruleSet']" @addRule="addRule" @addRuleSet="addRuleSet" />
    </div>
</template>

<script setup lang="ts">
import { InputField } from '@/components';
import { TrashIcon } from '@heroicons/vue/24/outline';
import { ref } from 'vue';
import { RuleOrRuleSet } from '.';
import { AddElement, createRule, createRuleSet } from '..';
import { Rule, RuleSet } from '../Types';

const props = defineProps<{ ruleSet: RuleSet }>();
const openRules = ref(new Map<Rule | RuleSet, boolean>());

const addRule = () => props.ruleSet.rulesOrRuleSets.push(createRule());

const addRuleSet = () => props.ruleSet.rulesOrRuleSets.push(createRuleSet());
</script>

<style scoped></style>
