<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

	const featured = $derived(data.articles[0]);
	const rest = $derived(data.articles.slice(1));
</script>

<svelte:head>
	<title>News — Mock.shop</title>
</svelte:head>

<main id="main-content" tabindex="-1" class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
	<header>
		<h1 class="text-6xl font-black tracking-tight md:text-8xl">News</h1>
	</header>

	<section class="mt-16 space-y-6">
		{#if featured}
			<a
				href={`/blogs/news/${featured.handle}`}
				class="group block border border-black/15 p-8 transition-colors hover:border-black md:p-10"
			>
				<h2 class="text-2xl font-bold tracking-tight md:text-3xl">{featured.title}</h2>
				<p class="mt-2 text-sm text-black/60">
					{dateFormatter.format(new Date(featured.publishedAt))}
				</p>
				<p class="mt-6 text-base leading-relaxed text-black/80">{featured.excerpt}</p>
				<p class="mt-8 text-sm font-medium text-black/70 group-hover:text-black">Read more...</p>
			</a>
		{/if}

		{#if rest.length > 0}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				{#each rest as article (article.handle)}
					<a
						href={`/blogs/news/${article.handle}`}
						class="group block border border-black/15 p-8 transition-colors hover:border-black"
					>
						<h2 class="text-xl font-bold tracking-tight md:text-2xl">{article.title}</h2>
						<p class="mt-2 text-sm text-black/60">
							{dateFormatter.format(new Date(article.publishedAt))}
						</p>
						<p class="mt-6 text-base leading-relaxed text-black/80">{article.excerpt}</p>
						<p class="mt-8 text-sm font-medium text-black/70 group-hover:text-black">
							Read more...
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</main>
