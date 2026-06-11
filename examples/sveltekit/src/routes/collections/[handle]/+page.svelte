<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
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

<main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
	<header class="max-w-2xl">
		<h1 class="text-6xl font-black tracking-tight md:text-8xl">{data.collection.title}</h1>
		{#if data.collection.description}
			<p class="mt-6 text-base leading-relaxed text-black/70 md:text-lg">
				{data.collection.description}
			</p>
		{/if}
	</header>

	<section class="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
		{#each data.collection.products.nodes as product (product.handle)}
			<ProductCard {product} />
		{/each}
	</section>
</main>
