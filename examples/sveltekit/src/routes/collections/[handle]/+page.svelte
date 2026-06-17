<script lang="ts">
	import CollectionBrowser from '$lib/components/CollectionBrowser.svelte';
	import { getAnalytics, AnalyticsEvent, analyticsShop } from '$lib/analytics';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	$effect(() => {
		const handle = data.collection.handle;
		const analytics = getAnalytics();
		if (!analytics) return;
		analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
			collection: {
				id: data.collection.id,
				handle: data.collection.handle
			},
			url: window.location.href,
			shop: analyticsShop
		});
		void handle;
	});
</script>

<svelte:head>
	<title>{data.collection.title} — Mock.shop</title>
</svelte:head>

{#key data.collection.handle}
	<CollectionBrowser
		title={data.collection.title}
		description={data.collection.description}
		handle={data.collection.handle}
		dataSearch={data.dataSearch}
		products={data.collection.products.nodes}
		availableFilters={data.collection.products.filters}
	/>
{/key}
