<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Mock.shop — Hydrogen</title>
</svelte:head>

<main id="main-content" tabindex="-1">
	<section class="grid grid-cols-1 md:grid-cols-2">
		<a
			href="/collections/men"
			class="group relative block aspect-[4/5] overflow-hidden bg-neutral-900"
		>
			<img
				src="https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenHoodie02.jpg?v=1739549220"
				alt="New arrivals"
				class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
			/>
			<div class="absolute inset-0 flex items-center justify-center bg-black/15">
				<h2 class="text-4xl font-black tracking-tight text-white sm:text-6xl">New arrivals</h2>
			</div>
		</a>
		<a
			href="/collections/men"
			class="group relative block aspect-[4/5] overflow-hidden bg-neutral-100"
		>
			<img
				src="https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenSweatpants01.jpg?v=1675455387"
				alt="Midweight Classics"
				class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
			/>
			<div class="absolute inset-0 flex items-center justify-center bg-black/10">
				<h2 class="text-4xl font-black tracking-tight text-white sm:text-6xl">Midweight Classics</h2>
			</div>
		</a>
	</section>

	<section class="bg-paper py-24 md:py-32">
		<div class="mx-auto max-w-[1480px] px-6 text-center">
			<p class="text-sm font-medium tracking-wide text-black/70">New Arrivals</p>
			<h2 class="mt-4 text-6xl font-black tracking-tight md:text-8xl">Spring '26</h2>
			<div class="mt-16 grid grid-cols-1 gap-8 text-left md:grid-cols-3">
				{#each data.products as product (product.handle)}
					<ProductCard {product} />
				{/each}
			</div>
		</div>
	</section>
</main>
