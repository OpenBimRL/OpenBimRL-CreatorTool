<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div class="flex h-full min-h-0 flex-col overflow-y-auto">
        <header
            class="sticky top-0 z-10 shrink-0 border-b border-slate-200/80 bg-surface-muted/95 px-6 py-5 backdrop-blur-md dark:border-slate-800 dark:bg-default-darkest/95"
        >
            <h1 class="text-xl font-semibold text-default-dark dark:text-slate-100">Settings</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Configure the Creator Tool and engine connection.
            </p>
        </header>

        <div class="mx-auto w-full max-w-6xl px-6 py-6">
            <div class="settings-grid">
                <SettingsSection
                    title="API Connection"
                    description="OpenBIMRL engine endpoint used for graph checks and model loading."
                >
                    <ApiConnectionSettings />
                </SettingsSection>

                <SettingsSection
                    title="Appearance"
                    description="Visual preferences for the Creator Tool interface."
                >
                    <AppearanceSettings />
                </SettingsSection>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import ApiConnectionSettings from './ApiConnectionSettings.vue';
import AppearanceSettings from './AppearanceSettings.vue';
import SettingsSection from './SettingsSection.vue';
</script>
