<script lang="ts">
	import '../app.css';
	import { afterNavigate, goto } from '$app/navigation';
	import { routeTemplates } from '$lib/route-templates';
	import { onMount, tick } from 'svelte';
	import { analyticsConsent, defaultI18n, shop } from '@shared/config';
	import {
		initializeShopifyScripts,
		renderShopifyScriptTags,
	} from '@shopify/hydrogen';
	import CartDrawer from '$lib/components/CartDrawer.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { AnalyticsEvent, addAnalyticsConsoleDestination, getAnalytics } from '$lib/analytics';
	import { connectCartStore } from '$lib/cart';

	let { children, data } = $props();

	const shopifyScriptTagsHtml = renderShopifyScriptTags({
		consent: analyticsConsent,
		i18n: defaultI18n,
		shop
	}).join('\n');

	onMount(() => {
		connectCartStore();
		initializeShopifyScripts({ navigate: goto, routes: routeTemplates });
		const cleanupAnalyticsConsoleDestination = addAnalyticsConsoleDestination();
		return () => {
			cleanupAnalyticsConsoleDestination?.();
		};
	});

	afterNavigate(async ({ from }) => {
		const analytics = getAnalytics();
		if (analytics) {
			analytics.publish(AnalyticsEvent.PAGE_VIEWED);
		}
		if (!from) return;

		await tick();
		document.getElementById('main-content')?.focus({ preventScroll: true });
	});

</script>

<svelte:head>
	{@html shopifyScriptTagsHtml}
</svelte:head>

<div class="bg-white text-black">
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
	>
		Skip to main content
	</a>
	<Header collections={data.headerCollections} />
	{@render children()}
	<Footer />
	<CartDrawer />
</div>
