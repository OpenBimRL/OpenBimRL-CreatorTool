<template>
    <nav
        class="relative z-30 flex h-12 items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-default-dark/90"
    >
        <ul class="flex w-full items-center gap-1">
            <template v-if="route.name == Routes.GRAPH">
                <li><NewGraph /></li>
                <li><Upload /></li>
                <li><Download /></li>
                <li>
                    <button type="button" class="btn-ghost !py-1.5" @click="$emit('showNodeLib')">
                        Create Nodes
                    </button>
                </li>
                <li>
                    <button type="button" class="btn-ghost !py-1.5">Create Group</button>
                </li>
            </template>
            <template v-if="route.name == Routes.VIEWER">
                <li><AddModel /></li>
                <li v-if="hasViewerSelection">
                    <button type="button" class="btn-ghost !py-1.5" @click="resetViewerSelection">
                        Reset selection
                    </button>
                </li>
            </template>
            <li>
                <button type="button" class="btn-ghost !py-1.5" @click="$emit('showHelp')">
                    Help
                </button>
            </li>
            <li class="ml-auto">
                <Switch
                    v-model="darkMode"
                    off-label="Light"
                    on-label="Dark"
                    aria-label="Toggle dark mode"
                />
            </li>
        </ul>
    </nav>
</template>

<script setup lang="ts">
import Switch from '@/components/ui/Switch.vue';
import { darkModeKey } from '@/keys';
import { displayedGuidsReadonly, setDisplayedGuids } from '@/modules/ifcViewerInteraction';
import { Routes, default as router } from '@/modules/router';
import { Ref, computed, inject } from 'vue';
import { AddModel, Download, NewGraph, Upload } from './buttons';

defineEmits(['showNodeLib', 'showHelp']);

const darkMode = inject(darkModeKey) as Ref<boolean>;
const route = router.currentRoute;
const hasViewerSelection = computed(() => displayedGuidsReadonly.value.length > 0);

const resetViewerSelection = () => {
    void setDisplayedGuids([]);
};
</script>
