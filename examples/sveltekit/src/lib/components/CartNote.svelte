<script lang="ts">
	import { cartState, createCartForm } from '$lib/cart';

	const note = cartState((s) => s.data.note ?? '');
	const pendingNote = cartState((s) => s.pending.note);
	const { formProps, register } = createCartForm();
	let draft = $state($note);

	$effect(() => {
		if (!$pendingNote) draft = $note;
	});

	function preventUnchangedSubmit(event: Event) {
		if (draft === $note) event.preventDefault();
	}
</script>

<div class="mt-8 border-t border-black/10 pt-6">
	<div class="flex items-center gap-2">
		<h2 class="text-sm font-semibold tracking-wide text-black/50 uppercase">Order Note</h2>
		{#if $pendingNote}
			<span class="text-xs text-black/40">Saving...</span>
		{/if}
	</div>
	<form {...formProps({ beforeSubmit: preventUnchangedSubmit })} class="mt-3 space-y-2">
		<input type="hidden" {...register('note', { value: draft })} />
		<textarea
			bind:value={draft}
			placeholder="Add a note to your order..."
			rows="3"
			class="w-full rounded border border-black/15 px-3 py-2 text-sm focus:border-black focus:outline-none"
		></textarea>
		<button
			type="submit"
			{...register('note-update')}
			class="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-black/80"
		>
			Save note
		</button>
	</form>
</div>
