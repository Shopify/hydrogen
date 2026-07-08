<script lang="ts">
	import { cartState } from '$lib/cart';
	import { formatMoney } from '$lib/money';
	import ShopPayButton from './ShopPayButton.svelte';

	const totalQuantity = cartState((s) => s.data.totalQuantity);
	const checkoutUrl = cartState((s) => s.data.checkoutUrl);
	const cost = cartState((s) => s.data.cost);
	const isTotalsPending = cartState(
		(s) => s.pending.lines.size > 0 || s.pending.discountCodes.size > 0
	);
</script>

<div
	class={$isTotalsPending
		? 'mt-8 space-y-2 border-t border-black/10 pt-6 opacity-30 transition-opacity'
		: 'mt-8 space-y-2 border-t border-black/10 pt-6 transition-opacity'}
>
	<div class="flex justify-between text-sm text-black/50">
		<span>Subtotal ({$totalQuantity} items)</span>
		<span>{formatMoney($cost.subtotalAmount)}</span>
	</div>

	<div class="flex justify-between text-lg font-semibold">
		<span>Total</span>
		<span>{formatMoney($cost.totalAmount)}</span>
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
