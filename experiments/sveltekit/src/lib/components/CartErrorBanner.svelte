<script lang="ts">
	import type { CartLine } from '@shopify/hydrogen';

	import { cartState } from '$lib/cart';

	const errors = cartState((s) => s.errors);
	const lines = cartState((s) => s.data.lines.nodes);
	let dismissedAt = $state(0);

	const visibleLineIds = $derived(new Set($lines.map((line: CartLine) => line.id)));
	const orphanedLineErrors = $derived(
		[...$errors.lines.entries()]
			.filter(([lineId]) => !visibleLineIds.has(lineId))
			.flatMap(([, group]) => [...group.userErrors, ...group.warnings])
	);
	const bannerMessages = $derived([
		...new Set([
			...$errors.network.map((error) => error.message),
			...$errors.cart.userErrors.map((error) => error.message),
			...$errors.cart.warnings.map((warning) => warning.message),
			...$errors.note.userErrors.map((error) => error.message),
			...orphanedLineErrors.map((error) => error.message)
		])
	]);
	const isVisible = $derived($errors.lastUpdatedAt > dismissedAt && bannerMessages.length > 0);
</script>

{#if isVisible}
	<div role="alert" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
		<div class="flex items-start justify-between gap-4">
			<div class="space-y-1">
				{#each bannerMessages as message, index (index)}
					<p>{message}</p>
				{/each}
			</div>
			<button
				type="button"
				aria-label="Dismiss cart error messages"
				class="min-h-10 shrink-0 px-2 text-xs font-semibold tracking-wide text-red-700 uppercase hover:text-red-950"
				onclick={() => (dismissedAt = Date.now())}
			>
				Dismiss
			</button>
		</div>
	</div>
{/if}
