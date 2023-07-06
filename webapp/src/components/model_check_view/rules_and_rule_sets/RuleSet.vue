<template>
    <div>ITS A RULE SET</div>
    
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RuleSet } from '../Types';

const props = defineProps<{ ruleSet: RuleSet }>();

const open = ref(false);
</script>

<style scoped></style>
