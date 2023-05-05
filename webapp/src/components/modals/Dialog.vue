<script lang="ts" setup>
import { ref } from "vue";

interface Props {
  accept_button_class?: string;
  reject_button_class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  accept_button_class: "bg-gray-500",
  reject_button_class: "bg-red-600",
});

const dialog = ref<HTMLDialogElement | null>(null);

const open = () => {
  dialog.value?.showModal();
};

defineExpose({ open });
</script>

<template>
  <dialog
    ref="dialog"
    class="border border-black rounded p-12 -translate-y-full"
  >
    <div>
      <span class="text-2xl">
        <slot name="title" />
      </span>
    </div>
    <hr class="my-4" />
    <div class="text-lg">
      <slot name="content" />
    </div>
    <form method="dialog" class="flex gap-4 justify-end mt-4">
      <button :class="accept_button_class" value="accepted">
        <span class="text-lg text-white">
          <slot name="accept_button_text" />
        </span>
      </button>
      <button :class="reject_button_class" value="cancel">
        <span class="text-lg text-white">
          <slot name="reject_button_text" />
        </span>
      </button>
    </form>
  </dialog>
</template>

<style scoped>
form button {
  @apply rounded-sm py-[0.125rem] px-3;
}
</style>
