<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		canAddToCart,
		createProductFormRegister,
		createProductFormStore
	} from '@shopify/hydrogen';
	import { onDestroy } from 'svelte';

	import { openCartDrawer } from '$lib/cart-drawer';
	import { getCartStore } from '$lib/cart';
	import { formatMoney } from '$lib/money';
	import type { ProductData, ProductFormState, ValidProductSelectionResult } from '$lib/product';
	import ShopPayButton from './ShopPayButton.svelte';

	let { product }: { product: ProductData } = $props();

	const SWATCHES: Record<string, string> = {
		Green: '#7ea993',
		Clay: '#7d6635',
		Ocean: '#5b8aa6',
		Purple: '#5e4a8a',
		Red: '#a26a72'
	};

	const store = createProductFormStore<ProductData>(product, getCartStore());
	let formState = $state<ProductFormState>(store.getState());
	let quantity = $state(1);
	let pending = $state(false);
	let mounted = false;
	const unsubscribe = store.subscribe((nextState) => {
		formState = nextState;
	});
	const currentSearch = $derived(page.url.search);

	$effect(() => {
		const identity = `${product.id}:${product.selectedOrFirstAvailableVariant?.id ?? ''}`;
		if (!mounted) {
			mounted = true;
			void identity;
			return;
		}
		store.hydrate(product);
	});

	onDestroy(() => {
		unsubscribe();
		store.destroy();
	});

	const register = $derived(createProductFormRegister(formState.selectedVariant, selectOption));
	const addable = $derived(canAddToCart(product, formState.options));

	function isColor(name: string): boolean {
		return name.toLowerCase() === 'color';
	}

	function selectOption(name: string, value: string) {
		const result = store.selectOption(name, value);
		if (result.status !== 'invalid') handleSelect(result);
	}

	function handleSelect(result: ValidProductSelectionResult) {
		const targetHandle = result.selectedVariant?.product?.handle ?? product.handle;
		goto(`/products/${targetHandle}${variantSearch(result.selectedOptions)}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function variantSearch(selectedOptions: { name: string; value: string }[]) {
		const params = new URLSearchParams(currentSearch);
		for (const option of product.options) params.delete(option.name);
		for (const option of selectedOptions) params.set(option.name, option.value);
		const search = params.toString();
		return search ? `?${search}` : '';
	}

	function variantHref(selectedOptions: { name: string; value: string }[], handle?: string) {
		const targetHandle = handle ?? product.handle;
		return `/products/${targetHandle}${variantSearch(selectedOptions)}`;
	}

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		try {
			await store.handleFormSubmit(event);
			openCartDrawer();
		} catch (error) {
			console.error('[hydrogen] product form submission error:', error);
		} finally {
			pending = false;
		}
	}

	function sanitizeQuantity(value: number) {
		quantity = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
	}
</script>

<aside class="md:sticky md:top-8 md:self-start">
	<h1 class="text-4xl font-black tracking-tight">{product.title}</h1>
	<p class="mt-3 text-lg font-semibold">
		{formatMoney(formState.selectedVariant?.price ?? product.priceRange.minVariantPrice)}
	</p>

	<hr class="my-8 border-black/10" />

	<div class="space-y-8">
		{#each formState.options as option (option.name)}
			<div>
				<p class="text-sm font-semibold">
					{option.name}
					{#if option.values.find((value) => value.selected)}
						<span class="font-normal text-black/60">
							{option.values.find((value) => value.selected)?.name}
						</span>
					{/if}
				</p>
				<div class={isColor(option.name) ? 'mt-3 flex items-center gap-3' : 'mt-3 flex flex-wrap gap-2'}>
					{#each option.values as value (value.name)}
						{#if value.handle !== product.handle}
							<a
								href={variantHref(value.selectedOptions, value.handle)}
								aria-label={isColor(option.name) ? value.name : undefined}
								class={isColor(option.name)
									? 'block h-7 w-7 rounded-full'
									: 'flex h-11 min-w-20 items-center justify-center rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black'}
								style={isColor(option.name) ? `background: ${SWATCHES[value.name] ?? '#999'}` : undefined}
							>
								{#if !isColor(option.name)}{value.name}{/if}
							</a>
						{:else}
							<button
								type="button"
								name={option.name}
								value={value.name}
								aria-pressed={value.selected}
								disabled={!value.exists}
								aria-label={isColor(option.name) ? value.name : undefined}
								onclick={() => selectOption(option.name, value.name)}
								onchange={() => selectOption(option.name, value.name)}
								class={isColor(option.name)
									? value.selected
										? 'h-7 w-7 rounded-full ring-2 ring-black ring-offset-2 disabled:opacity-30'
										: 'h-7 w-7 rounded-full disabled:opacity-30'
									: value.selected
										? 'h-11 min-w-20 rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-30'
										: 'h-11 min-w-20 rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black disabled:opacity-30'}
								style={isColor(option.name) ? `background: ${SWATCHES[value.name] ?? '#999'}` : undefined}
							>
								{#if !isColor(option.name)}
									{value.name}
									{#if value.exists && !value.available} - Sold out{/if}
								{/if}
							</button>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-8 space-y-2">
		<form method="post" action="/api/cart" class="flex items-center gap-3" onsubmit={submitForm}>
			<input type="hidden" {...register('merchandiseId', {})} />
			<div class="flex h-12 items-center rounded-full border border-black/15">
				<button
					type="button"
					aria-label="Decrease quantity"
					class="grid h-12 w-12 place-items-center text-lg"
					onclick={() => sanitizeQuantity(quantity - 1)}
				>
					-
				</button>
				<input
					type="text"
					inputmode="numeric"
					{...register('quantity', { value: quantity })}
					class="h-12 w-10 bg-transparent text-center text-sm font-semibold focus:outline-none"
					oninput={(event) => sanitizeQuantity(Number(event.currentTarget.value))}
				/>
				<button
					type="button"
					aria-label="Increase quantity"
					class="grid h-12 w-12 place-items-center text-lg"
					onclick={() => sanitizeQuantity(quantity + 1)}
				>
					+
				</button>
			</div>
			<button
				type="submit"
				disabled={!addable || pending}
				class="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-neutral-300"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
					<path d="M9 7V5a3 3 0 0 1 6 0v2" />
				</svg>
				{pending ? 'Adding...' : addable ? 'Add to cart' : formState.selectedVariant === null ? 'Select options' : 'Unavailable'}
			</button>
		</form>

		{#if formState.errors.userErrors[0]}
			<p class="text-sm text-red-600">{formState.errors.userErrors[0].message}</p>
		{/if}

		{#if formState.selectedVariant}
			<ShopPayButton
				variants={[{ id: formState.selectedVariant.id, quantity }]}
				channel="headless"
				disabled={!addable || pending}
				width="100%"
				height="48px"
				borderRadius="9999px"
			/>
		{/if}
	</div>

	{#if product.description}
		<p class="mt-8 text-sm leading-relaxed text-black/70">{product.description}</p>
	{/if}
</aside>
