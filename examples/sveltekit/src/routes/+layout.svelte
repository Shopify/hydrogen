<script lang="ts">
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { getAnalytics, AnalyticsEvent, analyticsShop } from '$lib/analytics';

	let { children, data } = $props();

	afterNavigate(() => {
		const analytics = getAnalytics();
		if (!analytics) return;
		analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
			url: window.location.href,
			shop: analyticsShop
		});
	});
</script>

<Header collections={data.headerCollections} />
{@render children()}
<Footer />
