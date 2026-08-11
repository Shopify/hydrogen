<script lang="ts">
	import { renderShopPayButton, type ShopPayButtonOptions } from '@shopify/hydrogen';

	let {
		variants,
		checkoutUrl,
		channel = 'headless',
		disabled = false,
		width,
		borderRadius,
		accessibilityLabel
	}: ShopPayButtonOptions = $props();

	const html = $derived(
		renderShopPayButton({ variants, checkoutUrl, channel, disabled, width, borderRadius, accessibilityLabel })
	);
</script>

<!-- Trusted markup produced by @shopify/hydrogen; user inputs are escaped by renderShopPayButton. -->
{@html html}
