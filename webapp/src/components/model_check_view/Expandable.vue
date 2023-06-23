<template>
    <div class="border-2 rounded overflow-hidden">
        <button
            class="grid w-full h-12 bg-default-overlay hover:bg-default-contrast"
            :class="{'border-b-2': open}"
            @click="open = !open"
        >
            <p class="m-auto">
                <span>{{ title }}</span>
            </p>
            <div class="m-auto">
                <ArrowDownIcon class="w-6 transition-transform" :class="{ 'rotate-180': !open }" />
            </div>
        </button>
        <div v-show="open">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ArrowDownIcon } from '@heroicons/vue/24/outline';
import { ref } from 'vue';

const open = ref(false);
const props = defineProps<{ title: string }>();
</script>

<style scoped>
button.grid {
    grid-template-columns: 1fr 48px;
}
</style>
