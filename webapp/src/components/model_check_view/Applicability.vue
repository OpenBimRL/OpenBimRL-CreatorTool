<template>
    <div class="applicability border-2 bg-yellow-200 bg-opacity-30">
        <p class="text-center py-4 text-xl">
            <span>Applicability</span>
        </p>
        <AddElement :kinds="[{ label: 'rule Set', event: 'ruleSet' }, 'rule']" />
    </div>
</template>

<script setup lang="ts">
import { AddElement } from './internal_components';
import type { SubCheck } from './Types';
const props = defineProps<{ check: SubCheck }>();
</script>

<style scoped></style>
