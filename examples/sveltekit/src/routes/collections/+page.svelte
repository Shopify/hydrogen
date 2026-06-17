<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Collections — Mock.shop</title>
</svelte:head>

<main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
	<header>
		<h1 class="text-6xl font-black tracking-tight md:text-8xl">Collections</h1>
	</header>

	<section
		class="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
	>
		{#each data.collections as collection (collection.handle)}
			<a href={`/collections/${collection.handle}`} class="group block">
				<div class="aspect-square overflow-hidden bg-neutral-100">
					{#if collection.image}
						<img
							src={collection.image.url}
							alt={collection.image.altText ?? collection.title}
							class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
					{/if}
				</div>
				<div class="mt-5">
					<h3 class="text-base font-semibold">{collection.title}</h3>
				</div>
			</a>
		{/each}
	</section>
</main>
