<!-- eslint-disable vue/no-mutating-props -->
<template>
    <div class="space-y-5">
        <FormSection
            card
            title="Identity"
            description="Display name and internal label for this sub check."
        >
            <InputField v-model="subCheck.name">
                <span>Name</span>
            </InputField>
            <InputField v-model="subCheck.label">
                <span>Label</span>
            </InputField>
        </FormSection>

        <FormSection
            card
            title="Rules &amp; results"
            description="Add and organize rules, rule sets, and result sets using the tree on the left."
        />
    </div>
</template>

<script setup lang="ts">
import InputField from '@/components/InputField.vue';
import type { SubCheck } from '@/components/graph/Types';
import FormSection from './FormSection.vue';

defineProps<{ subCheck: SubCheck }>();
</script>
