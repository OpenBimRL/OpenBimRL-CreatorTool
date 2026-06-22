<template>
    <section class="card !p-5" :class="span === 'full' ? 'md:col-span-2' : ''">
        <div class="mb-4">
            <h2 class="text-sm font-semibold text-default-dark dark:text-slate-100">
                {{ title }}
            </h2>
            <p v-if="description" class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {{ description }}
            </p>
        </div>
        <div class="settings-fields">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
defineProps<{
    title: string;
    description?: string;
    span?: 'default' | 'full';
}>();
</script>
