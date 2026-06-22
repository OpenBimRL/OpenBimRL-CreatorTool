<template>
    <aside
        class="flex h-full flex-col border-r border-slate-200/80 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900"
        :class="open ? 'w-52' : 'w-[4.25rem]'"
    >
        <div class="flex h-14 items-center border-b border-slate-200/80 px-3 dark:border-slate-800">
            <button
                type="button"
                class="btn-icon !h-9 !w-9 shrink-0"
                :title="open ? 'Collapse sidebar' : 'Expand sidebar'"
                @click="open = !open"
            >
                <Bars3Icon class="h-5 w-5" />
            </button>
            <span
                v-show="open"
                class="ml-3 truncate text-sm font-semibold tracking-tight text-default-dark dark:text-slate-100"
            >
                OpenBIMRL
            </span>
        </div>

        <ul class="flex flex-1 flex-col gap-1 p-2">
            <li v-for="item in navItems" :key="item.to">
                <RouterLink
                    :to="item.to"
                    :title="item.label"
                    class="nav-link"
                    :class="{ 'nav-link-active': route.path === item.to }"
                >
                    <component :is="item.icon" class="h-5 w-5 shrink-0" />
                    <span v-show="open" class="truncate">{{ item.label }}</span>
                </RouterLink>
            </li>
        </ul>
    </aside>
</template>

<script setup lang="ts">
import {
    Cog6ToothIcon,
    CubeTransparentIcon,
    HomeModernIcon,
    ShieldCheckIcon,
} from '@heroicons/vue/24/outline';
import { Bars3Icon } from '@heroicons/vue/24/solid';
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const open = ref(false);
const route = useRoute();

const navItems = [
    { to: '/', label: 'Graph', icon: CubeTransparentIcon },
    { to: '/checks', label: 'Sub Checks', icon: ShieldCheckIcon },
    { to: '/viewer', label: 'Model Viewer', icon: HomeModernIcon },
    { to: '/api', label: 'API', icon: Cog6ToothIcon },
];
</script>
