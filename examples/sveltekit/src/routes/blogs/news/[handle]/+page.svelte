<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });
</script>

<svelte:head>
	<title>{data.article.title} — Mock.shop</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-6 py-16 md:py-24">
	<article>
		<header class="text-center">
			<h1 class="text-5xl font-black tracking-tight md:text-7xl">{data.article.title}</h1>
			<p class="mt-6 text-sm text-black/60">
				{dateFormatter.format(new Date(data.article.publishedAt))}
			</p>
		</header>

		<div
			class="mt-16 text-base leading-relaxed text-black/80 md:text-lg [&>p]:mt-6 [&>h3]:mt-12 [&>h3]:text-3xl [&>h3]:font-black [&>h3]:tracking-tight [&>h3]:text-black md:[&>h3]:text-4xl *:first:mt-0"
		>
			{@html data.article.contentHtml}
		</div>

		<div class="mt-20 border-t border-black/10 pt-8">
			<a
				href="/blogs/news"
				class="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-60"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 12H5" />
					<path d="m12 19-7-7 7-7" />
				</svg>
				Back to News
			</a>
		</div>
	</article>
</main>
