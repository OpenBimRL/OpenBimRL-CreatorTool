<!-- eslint-disable vue/no-mutating-props -->
<template>
    <div class="space-y-5">
        <FormSection card title="Identity" description="Unique label used to reference this rule.">
            <InputField v-model="rule.label">
                <span>Label</span>
            </InputField>
        </FormSection>

        <FormSection
            card
            title="Condition"
            description="Define how operands are compared when the rule runs."
        >
            <div class="grid gap-4 sm:grid-cols-2">
                <SelectField v-model="rule.quantifier">
                    <span>Quantifier</span>
                    <template #options>
                        <option v-for="(value, name) in RuleQuantifier" :value="value" :key="value">
                            {{ name }}
                        </option>
                    </template>
                </SelectField>

                <SelectField v-model="rule.operator">
                    <span>Operator</span>
                    <template #options>
                        <option v-for="(value, name) in RuleOperator" :value="value" :key="value">
                            {{ name }}
                        </option>
                    </template>
                </SelectField>
            </div>
        </FormSection>

        <FormSection
            card
            title="Operands"
            description="Values or expressions evaluated by the rule."
        >
            <div class="grid gap-4 sm:grid-cols-2">
                <InputField v-model="rule.operand1">
                    <span>Operand 1</span>
                </InputField>
                <InputField v-model="rule.operand2">
                    <span>Operand 2</span>
                </InputField>
            </div>
        </FormSection>
    </div>
</template>

<script setup lang="ts">
import InputField from '@/components/InputField.vue';
import SelectField from '@/components/SelectField.vue';
import { Rule } from '@/components/graph/Types';
import { RuleOperator, RuleQuantifier } from '@/components/graph/enums';
import FormSection from './FormSection.vue';

defineProps<{ rule: Rule }>();
</script>
