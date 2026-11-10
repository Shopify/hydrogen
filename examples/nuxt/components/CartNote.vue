<script setup lang="ts">
import { ref, watch } from "#imports";
import { useCart, useCartForm } from "~/storefront/cart";

const note = useCart((s) => s.data.note ?? "");
const pendingNote = useCart((s) => s.pending.note);
const { formProps, register } = useCartForm();
const draft = ref(note.value);

watch([note, pendingNote], ([newNote, isPending]) => {
  if (!isPending) draft.value = newNote;
});

function preventUnchangedSubmit(e: Event) {
  if (draft.value === note.value) e.preventDefault();
}
</script>

<template>
  <div class="mt-8 border-t border-black/10 pt-6">
    <div class="flex items-center gap-2">
      <h2 class="text-sm font-semibold tracking-wide text-black/50 uppercase">Order Note</h2>
      <span v-if="pendingNote" class="text-xs text-black/40">Saving…</span>
    </div>
    <form
      v-bind="
        formProps({
          beforeSubmit: preventUnchangedSubmit,
        })
      "
      class="mt-3 space-y-2"
    >
      <input type="hidden" v-bind="register('note', { value: draft })" />
      <textarea
        v-model="draft"
        placeholder="Add a note to your order..."
        :rows="3"
        class="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-black focus:outline-none"
      />
      <button
        type="submit"
        v-bind="register('note-update')"
        class="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-black/80"
      >
        Save note
      </button>
    </form>
  </div>
</template>
