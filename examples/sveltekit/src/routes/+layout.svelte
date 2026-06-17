<script lang="ts">
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import CartDrawer from '$lib/components/CartDrawer.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { getAnalytics, AnalyticsEvent, analyticsShop } from '$lib/analytics';
	import { connectCartStore } from '$lib/cart';

	let { children, data } = $props();

	onMount(() => connectCartStore());

	afterNavigate(() => {
		const analytics = getAnalytics();
		if (!analytics) return;
		analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
			url: window.location.href,
			shop: analyticsShop
		});
	});
</script>

<div class="bg-white text-black">
	<Header collections={data.headerCollections} />
	{@render children()}
	<Footer />
	<CartDrawer />
</div>
