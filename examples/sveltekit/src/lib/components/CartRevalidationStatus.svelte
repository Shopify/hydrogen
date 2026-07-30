<script lang="ts">
	import { cartState } from '$lib/cart';

	const isPending = cartState((state) => state.pending.cost === true || state.revalidating === true);
	const hasNetworkErrors = cartState((state) => state.errors.network.length > 0);
	let sawPending = $state(false);

	$effect(() => {
		if ($isPending) sawPending = true;
	});

	const message = $derived(
		$isPending
			? 'Updating cart totals'
			: sawPending && !$hasNetworkErrors
				? 'Cart totals updated'
				: ''
	);
</script>

<span role="status" class="sr-only">{message}</span>
