<template>
    <div class="border-2 mt-2">
        <p class="text-center text-xl py-4">
            <span>Rules and RuleSets</span>
        </p>
        <div class="m-2 border-2">
            
        </div>
    </div>
</template>

<script setup lang="ts">
import { RulesOrRuleSets } from './Types';

const props = defineProps<{rulesAndRuleSets: RulesOrRuleSets}>()
</script>

<style scoped></style>
