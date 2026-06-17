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
		height,
		borderRadius
	}: ShopPayButtonOptions = $props();

	let container: HTMLDivElement | null = null;
	let button: HTMLElement | null = null;

	function options(): ShopPayButtonOptions {
		return { variants, checkoutUrl, channel, disabled, width, height, borderRadius };
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

<div bind:this={container}></div>
