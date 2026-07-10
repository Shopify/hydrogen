<script lang="ts">
	import { cartState } from '$lib/cart';
	import { formatMoney } from '$lib/money';
	import ShopPayButton from './ShopPayButton.svelte';

	const totalQuantity = cartState((s) => s.data.totalQuantity);
	const checkoutUrl = cartState((s) => s.data.checkoutUrl);
	const cost = cartState((s) => s.data.cost);
	const isTotalsPending = cartState(
		(s) => s.pending.lines.size > 0 || s.pending.discountCodes.size > 0 || s.revalidating === true
	);
</script>

<div
	class="mt-8 border-t border-black/10 pt-6"
>
	<div class="space-y-2" aria-busy={$isTotalsPending}>
		<div
			class="flex justify-between text-sm {$isTotalsPending ? 'text-black/60' : 'text-black/70'}"
		>
			<span>
				Subtotal ({$totalQuantity} items)
				{#if $isTotalsPending}<span aria-hidden="true"> (updating)</span>{/if}
			</span>
			<span>{formatMoney($cost.subtotalAmount)}</span>
		</div>

		<div
			class="flex justify-between text-lg font-semibold {$isTotalsPending ? 'text-black/60' : ''}"
		>
			<span>Total</span>
			<span>{formatMoney($cost.totalAmount)}</span>
		</div>
	</div>

	{#if $checkoutUrl && $totalQuantity > 0}
		<div class="mt-6 space-y-3">
			<ShopPayButton checkoutUrl={$checkoutUrl} channel="headless" width="100%" borderRadius="4px" />
			<a
				href={$checkoutUrl}
				class="block rounded bg-black px-6 py-3 text-center text-sm font-medium text-white hover:bg-neutral-800"
			>
				Check out
			</a>
		</div>
	{:else}
		<span
			role="link"
			aria-disabled="true"
			class="mt-6 block cursor-not-allowed rounded bg-black/40 px-6 py-3 text-center text-sm font-medium text-white"
		>
			Check out
		</span>
	{/if}
</div>
