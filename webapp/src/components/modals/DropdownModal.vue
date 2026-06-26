<template>
    <div class="anchor">
        <dialog
            class="absolute top-9 z-50 block min-w-[10rem] -translate-x-full overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-panel dark:border-slate-700 dark:bg-slate-900"
            :class="{ hidden: !active }"
        >
            <div class="flex flex-col p-1">
                <form
                    v-for="item in Object.keys(modalItems)"
                    :key="item"
                    @submit.prevent="modalItems[item]"
                >
                    <button
                        type="submit"
                        class="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {{ item }}
                    </button>
                </form>
            </div>
        </dialog>
    </div>
</template>

<script setup lang="ts">
import { registerModal } from '.';
import type { DropdownProps } from '../navigation/Types';

const { modalItems } = defineProps<{ modalItems: DropdownProps }>();

const active = registerModal();
defineExpose({ active });
</script>
