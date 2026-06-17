<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import ProductPurchasePanel from '$lib/components/ProductPurchasePanel.svelte';
	import { getAnalytics, AnalyticsEvent, analyticsShop } from '$lib/analytics';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	$effect(() => {
		const handle = data.product.handle;
		const analytics = getAnalytics();
		if (!analytics) return;
		analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
			products: [
				{
					id: data.product.id,
					title: data.product.title,
					price:
						data.product.selectedOrFirstAvailableVariant?.price.amount ??
						data.product.priceRange.minVariantPrice.amount,
					vendor: data.product.vendor,
					variantId: data.product.selectedOrFirstAvailableVariant?.id ?? data.product.id,
					variantTitle:
						data.product.selectedOrFirstAvailableVariant?.title ?? data.product.title,
					quantity: 1,
					sku: data.product.selectedOrFirstAvailableVariant?.sku
				}
			],
			url: window.location.href,
			shop: analyticsShop
		});
		// reference handle so $effect tracks it
		void handle;
	});

	const related = $derived(
		data.related.filter((p) => p.handle !== data.product.handle).slice(0, 4)
	);
</script>

<svelte:head>
	<title>{data.product.title} — Mock.shop</title>
</svelte:head>

<main>
	<section
		class="grid grid-cols-1 gap-12 px-6 py-10 md:grid-cols-[minmax(0,1fr)_420px] md:gap-16 md:px-10 md:py-12"
	>
		<div class="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2">
			{#each data.product.images.nodes as image, i (image.url)}
				<div class="aspect-square overflow-hidden bg-neutral-100">
					<img
						src={image.url}
						alt={image.altText ?? `${data.product.title} — image ${i + 1}`}
						class="h-full w-full object-cover"
					/>
				</div>
			{/each}
		</div>

		<ProductPurchasePanel product={data.product} />
	</section>

	<section class="border-t border-black/10 px-6 py-16 md:px-10 md:py-20">
		<h2 class="text-2xl font-black tracking-tight">You may also like</h2>
		<div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
			{#each related as product (product.handle)}
				<ProductCard {product} />
			{/each}
		</div>
	</section>
</main>
