<script lang="ts" module>
	export type ProductCardData = {
		handle: string;
		title: string;
		featuredImage: { url: string; altText: string | null } | null;
		priceRange: {
			minVariantPrice: { amount: string; currencyCode: string };
		};
	};
</script>

<script lang="ts">
	import { formatMoney } from '$lib/money';

	let { product }: { product: ProductCardData } = $props();
</script>

<a href={`/products/${product.handle}`} class="group block">
	<div class="aspect-square overflow-hidden bg-neutral-100">
		{#if product.featuredImage}
			<img
				src={product.featuredImage.url}
				alt={product.featuredImage.altText ?? product.title}
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
			/>
		{/if}
	</div>
	<div class="mt-5">
		<h3 class="font-semibold">{product.title}</h3>
		<p class="mt-1 text-sm font-bold">{formatMoney(product.priceRange.minVariantPrice)}</p>
	</div>
</a>
