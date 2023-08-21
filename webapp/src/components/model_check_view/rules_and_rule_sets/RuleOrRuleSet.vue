<template>
    <RuleSet v-if="ruleOrRuleSet.type === 'ruleSet'" :rule-set="(ruleOrRuleSet as RuleSetType)" />
    <Rule v-else-if="ruleOrRuleSet.type === 'rule'" :rule="(ruleOrRuleSet as RuleType)" />
</template>

<script setup lang="ts">
import { Rule, RuleSet } from '.';
import type { RuleSet as RuleSetType, Rule as RuleType } from '../Types';

const props = defineProps<{ ruleOrRuleSet: RuleType | RuleSetType }>();
</script>

<style scoped></style>
