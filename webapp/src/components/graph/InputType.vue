<template>
  <div
    class="border border-black rounded min-w-[12rem] bg-white shadow-black"
    :class="{ 'shadow-lg': selected }"
  >
    <div class="node-head px-2 bg-yellow-100 bg-opacity-60">
      <p class="heading text-center">
        <span>({{ data.name }})</span>
      </p>
    </div>
    <div
      class="node-body mt-4 relative min-h-[1.5rem]"
      :style="`height: ${minHeight}rem`"
    >
      <p class="text-center">
        <span>{{ data.label }}</span>
      </p>
      <Handle
        v-for="(output, index) in data.outputs"
        :id="output.index"
        type="source"
        :position="Position.Right"
        class="flex items-center justify-end"
        :style="calcTopOffsetStyle(index, data.outputs.length)"
      />
    </div>
  </div>
  <Dialog ref="dialog">
    <template v-slot:title>Change Input</template>
    <template v-slot:content>
      <input type="text" v-bind:value="data.name" />
    </template>
    <template v-slot:accept_button_text>Go Back</template>
    <template v-slot:reject_button_text>Continue</template>
  </Dialog>
</template>

<script setup lang="ts">
import { NodeEventsOn, NodeProps, Handle, Position } from "@vue-flow/core";
import type { InputNodeData } from "./Types";
import { calcTopOffsetStyle, minHeight as heightFunction } from ".";
import { Dialog } from "../modals";
import { ref } from "vue";

const props = defineProps<NodeProps<InputNodeData, NodeEventsOn>>();

const dialog = ref<typeof Dialog | null>(null);

props.events.doubleClick(() => {
  dialog.value?.open();
});

// theoretically are the inputs defined but I'd rather not include them - safety first
const minHeight = heightFunction([], props.data.outputs);
</script>

<style scoped></style>
