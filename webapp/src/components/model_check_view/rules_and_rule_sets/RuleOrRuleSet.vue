<template>
    <div v-for="ruleOrRuleSet in rulesAndRuleSets" class="m-2 border-2">
            <RuleSet
                v-if="ruleOrRuleSet.type === 'ruleSet'"
                :rule-set="(ruleOrRuleSet as RuleSetType)"
            />
            <Rule v-else-if="ruleOrRuleSet.type === 'rule'" :rule="(ruleOrRuleSet as RuleType)" />
        </div>
</template>

<script setup lang="ts">
import Rule from './Rule.vue';
import RuleSet from './RuleSet.vue';
import type { RulesOrRuleSets, Rule as RuleType, RuleSet as RuleSetType } from '../Types';

const props = defineProps<{rulesAndRuleSets: RulesOrRuleSets}>()
</script>

<style scoped>

</style>