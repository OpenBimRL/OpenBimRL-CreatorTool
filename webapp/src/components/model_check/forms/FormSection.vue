<template>
    <section :class="card ? 'card !p-5' : ''">
        <div v-if="title || description" class="mb-4">
            <h3 v-if="title" class="text-sm font-semibold text-default-dark dark:text-slate-100">
                {{ title }}
            </h3>
            <p v-if="description" class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {{ description }}
            </p>
        </div>
        <div class="space-y-4">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
defineProps<{
    title?: string;
    description?: string;
    card?: boolean;
}>();
</script>
