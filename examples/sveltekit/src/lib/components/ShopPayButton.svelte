<script lang="ts">
	import {
		getShopPayButtonAttributes,
		getShopPayButtonStyleProperties,
		loadShopJs,
		SHOP_PAY_BUTTON_TAG_NAME,
		type ShopPayButtonOptions
	} from '@shopify/hydrogen';
	import { onDestroy, onMount } from 'svelte';

	let {
		variants,
		checkoutUrl,
		channel = 'headless',
		disabled = false,
		width,
		borderRadius
	}: ShopPayButtonOptions = $props();

	let container: HTMLDivElement | null = null;
	let button: HTMLElement | null = null;
	const DEFAULT_SHOP_PAY_BUTTON_MIN_HEIGHT = '43px';

	function options(): ShopPayButtonOptions {
		return { variants, checkoutUrl, channel, disabled, width, borderRadius };
	}

	async function renderButton(currentOptions: ShopPayButtonOptions) {
		if (!container) return;
		await loadShopJs();
		button?.remove();
		button = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
		for (const [name, value] of Object.entries(getShopPayButtonAttributes(currentOptions))) {
			button.setAttribute(name, value);
		}
		for (const [name, value] of Object.entries(getShopPayButtonStyleProperties(currentOptions))) {
			button.style.setProperty(name, value);
		}
		container.append(button);
	}

	onMount(() => {
		void renderButton(options());
	});

	$effect(() => {
		void renderButton(options());
	});

	onDestroy(() => {
		button?.remove();
	});
</script>

<div
	bind:this={container}
	style:min-height={DEFAULT_SHOP_PAY_BUTTON_MIN_HEIGHT}
></div>
