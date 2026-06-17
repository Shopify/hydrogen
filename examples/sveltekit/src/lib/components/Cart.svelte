<script lang="ts">
	import { cartState } from '$lib/cart';
	import CartDiscountCodes from './CartDiscountCodes.svelte';
	import CartErrorBanner from './CartErrorBanner.svelte';
	import CartLineItems from './CartLineItems.svelte';
	import CartNote from './CartNote.svelte';
	import CartTotals from './CartTotals.svelte';

	const loading = cartState((s) => s.loading);
	const lines = cartState((s) => s.data.lines.nodes);
	const hasCartContent = $derived(!$loading && $lines.length > 0);
</script>

<div>
	<CartErrorBanner />
	<CartLineItems />

	{#if hasCartContent}
		<CartTotals />
		<CartDiscountCodes />
		<CartNote />
	{/if}
</div>
