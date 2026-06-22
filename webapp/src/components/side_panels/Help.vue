<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <aside class="panel-drawer w-1/5 min-w-[18rem] overflow-auto p-0">
        <div class="panel-header">
            <h2 class="text-lg font-semibold text-default-dark dark:text-slate-100">Information</h2>
            <button type="button" class="btn-icon !h-9 !w-9" @click="$emit('close')">
                <XMarkIcon class="h-5 w-5" />
            </button>
        </div>
        <div class="space-y-4 px-5 py-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <section>
            <h3 class="mb-2 text-base font-semibold text-default-dark dark:text-slate-100">Über OpenBimRL Creator</h3>
            <p class="text-justify">
                Angelehnt an der graphen-basierten Programmierung beschreibt das OpenBimRL Format
                eine Regelsprache zur formellen und fachlichen Prüfung von Bauwerksmodellen. Das
                Format definiert eine dynamisch erweiterbare Schnittstelle auf derer Basis Bausteine
                für einen graphen-basierten Prüfvorgang konstruiert und verknüpft werden können. Bei
                der Entwicklung wurde Wert auf Offenheit und Transparenz der Prüfungdokumente
                gelegt.
            </p>
            </section>

            <section>
            <h3 class="mb-2 text-base font-semibold text-default-dark dark:text-slate-100">Entwickelt von</h3>
            <a
                href="https://www.inf.bi.ruhr-uni-bochum.de/"
                class="card flex !p-3 transition-colors hover:border-accent/40"
            >
                <img
                    src="https://www.inf.bi.ruhr-uni-bochum.de/iib/mam/images/logos/logo_menue_de.png"
                    class="h-full"
                />
            </a>
            </section>

            <section>
            <table class="w-full text-sm">
                <tr>
                    <td><b>Institution:</b></td>
                    <td>
                        Lehrstuhl für Informatik im Bauwesen <br />
                        an der Ruhr-Universität Bochum
                    </td>
                </tr>
                <tr>
                    <td><b>Entwickler:</b></td>
                    <td>Florian Becker</td>
                </tr>
                <tr>
                    <td><b>E-Mail:</b></td>
                    <td>florian.becker-f86@ruhr-uni-bochum.de</td>
                </tr>
                <tr>
                    <td><b>Author:</b></td>
                    <td>Marcel Stepien</td>
                </tr>
                <tr>
                    <td><b>E-Mail:</b></td>
                    <td>marcel.stepien@ruhr-uni-bochum.de</td>
                </tr>
                <tr>
                    <td><b>Datum:</b></td>
                    <td>{{ date.getDate() }}.{{ date.getMonth() }}.{{ date.getFullYear() }}</td>
                </tr>
            </table>
            </section>

            <div class="flex gap-3 pt-2">
                <a
                    href="https://www.linkedin.com/company/lehrstuhl-f%C3%BCr-informatik-im-bauwesen"
                >
                    <img loading="lazy" :src="LinkedInLogo" class="w-12" />
                </a>
                <a href="https://twitter.com/iib_rub">
                    <img loading="lazy" :src="TwitterLogo" class="w-12" />
                </a>
                <a href="https://github.com/RUB-Informatik-im-Bauwesen">
                    <img loading="lazy" :src="GithubMark" class="w-12 dark:mix-blend-hard-light" />
                </a>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid';

import GithubMark from '@/assets/logos/github-mark.svg';
import LinkedInLogo from '@/assets/logos/linkedin_logo.png';
import TwitterLogo from '@/assets/logos/twitter_logo.svg';

defineEmits(['close']);

const date = new Date();
</script>

<style scoped>
td:first-child {
    vertical-align: baseline;
}
</style>
