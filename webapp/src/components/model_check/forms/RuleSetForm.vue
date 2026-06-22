<!-- eslint-disable vue/no-mutating-props -->
<template>
    <div class="space-y-5">
        <FormSection card title="Identity" description="Unique label used to reference this rule set.">
            <InputField v-model="ruleSet.label">
                <span>Label</span>
            </InputField>
        </FormSection>

        <FormSection
            card
            title="Composition"
            description="How child rules are combined when this set is evaluated."
        >
            <SelectField v-model="ruleSet.operator">
                <span>Operator</span>
                <template #options>
                    <option v-for="(value, name) in RuleSetOperator" :value="value" :key="value">
                        {{ name }}
                    </option>
                </template>
            </SelectField>

            <p class="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                Nested rules are managed in the tree. Use the
                <span class="font-medium text-slate-700 dark:text-slate-300">+</span>
                button on a rule set row to add child rules.
            </p>
        </FormSection>
    </div>
</template>

<script setup lang="ts">
import InputField from '@/components/InputField.vue';
import SelectField from '@/components/SelectField.vue';
import { RuleSet } from '@/components/graph/Types';
import { RuleSetOperator } from '@/components/graph/enums';
import FormSection from './FormSection.vue';

defineProps<{ ruleSet: RuleSet }>();
</script>
