<!-- eslint-disable vue/no-mutating-props -->
<template>
    <div class="space-y-5">
        <FormSection
            card
            title="Identity"
            description="How this result set appears in the tree and reports."
        >
            <InputField v-model="resultSet.name">
                <span>Name</span>
            </InputField>
            <InputField v-model="resultSet.label">
                <span>Label</span>
            </InputField>
        </FormSection>

        <FormSection
            card
            title="Graph binding"
            description="Link this result set to a rule identifier node and a filter rule from the sub checks."
        >
            <div class="grid gap-4 lg:grid-cols-2">
                <SelectField v-model="resultSet.elements">
                    <span>Elements</span>
                    <template #options>
                        <option value="" disabled>Select graph element…</option>
                        <option
                            v-for="value in graphNodes.filter(element => element.type === 'ruleIdentifier')"
                            :value="value.data?.label"
                            :key="value.id"
                        >
                            {{ value.data?.label }}
                        </option>
                    </template>
                </SelectField>

                <SelectField v-model="resultSet.filter">
                    <span>Filter rule</span>
                    <template #options>
                        <option value="" disabled>Select filter rule…</option>
                        <option v-for="(value, index) in filter" :value="value.label" :key="index">
                            {{ value.label }}
                        </option>
                    </template>
                </SelectField>
            </div>
        </FormSection>
    </div>
</template>

<script setup lang="ts">
import InputField from '@/components/InputField.vue';
import SelectField from '@/components/SelectField.vue';
import type {
    CustomNode,
    ResultSet,
    Rule,
    RuleSet,
    RulesOrRuleSets,
    SubChecks,
} from '@/components/graph/Types';
import { RuleOrRuleSetType } from '@/components/graph/enums';
import { Edge } from '@vue-flow/core';
import { computed } from 'vue';
import FormSection from './FormSection.vue';

const props = defineProps<{
    resultSet: ResultSet;
    subChecks: SubChecks;
    graphNodes: Array<CustomNode | Edge>;
}>();

const filter = computed((): Array<Rule> => {
    const returnArray: Array<Rule> = [];
    props.subChecks.forEach(element =>
        returnArray.push(...filterRecursive(element.rulesOrRuleSets)),
    );
    return returnArray;
});

const filterRecursive = (rulesOrRuleSets: RulesOrRuleSets): Array<Rule> => {
    const returnArray: Array<Rule> = [];
    rulesOrRuleSets.forEach(element => {
        switch (element.type) {
            case RuleOrRuleSetType.RULE:
                returnArray.push(element as Rule);
                break;

            case RuleOrRuleSetType.RULESET:
                returnArray.push(...filterRecursive((element as RuleSet).rulesOrRuleSets));
                break;
        }
    });

    return returnArray;
};
</script>
