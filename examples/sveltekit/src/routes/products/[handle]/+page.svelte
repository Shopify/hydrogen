<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import { formatMoney } from '$lib/money';
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

	const SWATCHES: Record<string, string> = {
		Green: '#7ea993',
		Clay: '#7d6635',
		Ocean: '#5b8aa6',
		Purple: '#5e4a8a',
		Red: '#a26a72'
	};

	const sizeOption = $derived(data.product.options.find((o) => o.name === 'Size'));
	const colorOption = $derived(data.product.options.find((o) => o.name === 'Color'));
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

		<aside class="md:sticky md:top-8 md:self-start">
			<h1 class="text-4xl font-black tracking-tight">{data.product.title}</h1>
			<p class="mt-3 text-lg font-semibold">
				{formatMoney(data.product.priceRange.minVariantPrice)}
			</p>

			<hr class="my-8 border-black/10" />

			{#if sizeOption}
				<div>
					<p class="text-sm font-semibold">Size</p>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each sizeOption.values as value, i (value)}
							<button
								class={i === 0
									? 'h-11 min-w-20 rounded-full bg-black px-5 text-sm font-semibold text-white'
									: 'h-11 min-w-20 rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black'}
							>
								{value}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if colorOption}
				<div class="mt-8">
					<p class="text-sm font-semibold">
						Color <span class="font-normal text-black/60">{colorOption.values[0]}</span>
					</p>
					<div class="mt-3 flex items-center gap-3">
						{#each colorOption.values as value, i (value)}
							<button
								aria-label={value}
								class={i === 0
									? 'h-7 w-7 rounded-full ring-2 ring-black ring-offset-2'
									: 'h-7 w-7 rounded-full'}
								style={`background: ${SWATCHES[value] ?? '#999'}`}
							></button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="mt-8 flex items-center gap-3">
				<div class="flex h-12 items-center rounded-full border border-black/15">
					<button aria-label="Decrease quantity" class="grid h-12 w-12 place-items-center text-lg">
						–
					</button>
					<input
						type="text"
						inputmode="numeric"
						value="1"
						class="h-12 w-10 bg-transparent text-center text-sm font-semibold focus:outline-none"
					/>
					<button aria-label="Increase quantity" class="grid h-12 w-12 place-items-center text-lg">
						+
					</button>
				</div>
				<button
					class="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white hover:opacity-90"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
						<path d="M9 7V5a3 3 0 0 1 6 0v2" />
					</svg>
					Add to cart
				</button>
			</div>

			{#if data.product.description}
				<p class="mt-8 text-sm leading-relaxed text-black/70">{data.product.description}</p>
			{/if}
		</aside>
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
