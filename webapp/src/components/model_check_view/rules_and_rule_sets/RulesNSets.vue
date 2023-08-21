<template>
    <div class="border-2 mt-2 bg-default-contrast">
        <p class="text-center text-xl py-4">
            <span>Rules and RuleSets</span>
        </p>
        <div v-for="ruleOrRuleSet in rulesAndRuleSets">
            <RuleOrRuleSet :={ruleOrRuleSet} />
        </div>
    </div>
</template>

<script setup lang="ts">
import RuleOrRuleSet from './RuleOrRuleSet.vue';
import { RulesOrRuleSets } from '../Types';

const props = defineProps<{ rulesAndRuleSets: RulesOrRuleSets }>();
</script>

<style scoped></style>
