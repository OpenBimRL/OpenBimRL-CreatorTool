<template>
    <div>
        <InputField v-model="rule.label">
            <span>Label</span>
        </InputField>
        
    </div>
</template>

<script setup lang="ts">
import InputField from '@/components/InputField.vue';
import { Rule } from '../Types';

const props = defineProps<{rule: Rule}>()
</script>

<style scoped></style>
