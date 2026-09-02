<script lang="ts">
	import { renderShopPayButton, type ShopPayButtonOptions } from '@shopify/hydrogen';

	let props: ShopPayButtonOptions = $props();

	const html = $derived(renderShopPayButton(props));
</script>

<!-- Trusted markup produced by @shopify/hydrogen; user inputs are escaped by renderShopPayButton. -->
{@html html}
