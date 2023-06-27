<template>
    <div class="border rounded overflow-hidden flex w-full">
        <label :for="key" class="p-2 text-sm cursor-text bg-slate-100 border-r">
            <slot />
        </label>
        <input
            :id="key"
            :placeholder="placeholder || '...'"
            :value="modelValue"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            class="w-full pl-1"
        />
        <slot name="icon" />
    </div>
</template>

<script setup lang="ts">
defineProps(['modelValue', 'placeholder']);
defineEmits(['update:modelValue']);

const key = self.crypto.randomUUID();
</script>

<style scoped></style>
