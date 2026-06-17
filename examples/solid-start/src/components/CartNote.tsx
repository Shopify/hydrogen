import { createEffect, createSignal, Show } from "solid-js";

import { useCart, useCartForm } from "../lib/cart";

export function CartNote() {
  const note = useCart((s) => s.data.note ?? "");
  const pendingNote = useCart((s) => s.pending.note);
  const { formProps, register } = useCartForm();
  const [draft, setDraft] = createSignal(note());

  createEffect(() => {
    if (!pendingNote()) setDraft(note());
  });

  function preventUnchangedSubmit(event: SubmitEvent) {
    if (draft() === note()) event.preventDefault();
  }

  return (
    <div class="mt-8 border-t border-black/10 pt-6">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-semibold tracking-wide text-black/50 uppercase">Order Note</h2>
        <Show when={pendingNote()}>
          <span class="text-xs text-black/40">Saving...</span>
        </Show>
      </div>
      <form {...formProps({ beforeSubmit: preventUnchangedSubmit })} class="mt-3 space-y-2">
        <input type="hidden" {...register("note", { value: draft() })} />
        <textarea
          value={draft()}
          onInput={(event) => setDraft(event.currentTarget.value)}
          placeholder="Add a note to your order..."
          rows="3"
          class="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
        <button
          type="submit"
          {...register("note-update")}
          class="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-black/80"
        >
          Save note
        </button>
      </form>
    </div>
  );
}
