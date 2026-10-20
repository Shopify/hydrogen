<script lang="ts">
	import { page } from '$app/state';
	import type { HeaderCollection } from '@shared/header';
	import { onMount } from 'svelte';

	import { cartState } from '$lib/cart';
	import { CART_DRAWER_ID, openCartDrawer, supportsDialogCommands } from '$lib/cart-drawer';

	let { collections }: { collections: HeaderCollection[] } = $props();

	const totalQuantity = cartState((s) => s.data.totalQuantity);
	let hasHydrated = $state(false);
	const rendersCartPage = $derived(page.url.pathname === '/cart');
	const cartLabel = $derived(
		$totalQuantity === 0
			? 'Cart, empty'
			: `Cart, ${$totalQuantity > 99 ? '99 or more' : $totalQuantity} ${
					$totalQuantity === 1 ? 'item' : 'items'
				}`
	);

	onMount(() => {
		hasHydrated = true;
	});
</script>

<header class="border-b border-black/10">
	<div class="mx-auto grid h-16 max-w-[1480px] grid-cols-3 items-center px-6">
		<nav class="flex items-center gap-6 text-sm font-semibold">
			{#each collections as collection (collection.handle)}
				<a href={`/collections/${collection.handle}`} class="hover:opacity-60">{collection.title}</a>
			{/each}
			<a href="/collections" class="hover:opacity-60">Collections</a>
			<a href="/blogs/news" class="hover:opacity-60">News</a>
		</nav>
		<a href="/" class="justify-self-center text-lg font-black tracking-tight">MOCK.SHOP</a>
		<div class="flex items-center justify-end gap-5">
			<button aria-label="Search" class="grid h-11 w-11 place-items-center rounded-full hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.5-3.5" />
				</svg>
			</button>
			<a
				href="/account"
				aria-label="Account"
				class="grid h-11 w-11 place-items-center rounded-full hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
					<circle cx="12" cy="8" r="4" />
					<path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
				</svg>
			</a>
			{#if !hasHydrated || rendersCartPage}
			<a
				href="/cart"
				aria-label={cartLabel}
				aria-current={rendersCartPage ? 'page' : undefined}
				class="relative grid h-11 w-11 place-items-center rounded-full hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
			>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
					<path d="M9 7V5a3 3 0 0 1 6 0v2" />
				</svg>
				{#if $totalQuantity > 0}
					<span
						class="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white"
					>
						{$totalQuantity > 99 ? '99+' : $totalQuantity}
					</span>
				{/if}
			</a>
			{:else}
			<button
				type="button"
				aria-label={cartLabel}
				aria-controls={CART_DRAWER_ID}
				aria-haspopup="dialog"
				command="show-modal"
				commandfor={CART_DRAWER_ID}
				class="relative grid h-11 w-11 place-items-center rounded-full hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
				onclick={() => !supportsDialogCommands() && openCartDrawer()}
			>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
					<path d="M9 7V5a3 3 0 0 1 6 0v2" />
				</svg>
				{#if $totalQuantity > 0}
					<span
						class="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white"
					>
						{$totalQuantity > 99 ? '99+' : $totalQuantity}
					</span>
				{/if}
			</button>
			{/if}
		</div>
	</div>
</header>
