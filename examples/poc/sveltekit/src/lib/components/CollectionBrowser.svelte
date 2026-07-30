<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { AvailableFilter, ProductFilter } from '@shopify/hydrogen';
	import { untrack } from 'svelte';
	import {
		getFilterRemovalUrl,
		getSortByValue,
		isFilterInputActive,
		normalizeCollectionSearch,
		serializeCollectionParams
	} from '@shopify/hydrogen';

	import {
		collectionState,
		createCollectionForm,
		createCollectionStoreController
	} from '$lib/collection';
	import ProductCard, { type ProductCardData } from './ProductCard.svelte';

	let {
		title,
		description,
		handle,
		dataSearch,
		products,
		availableFilters
	}: {
		title: string;
		description: string | null;
		handle: string;
		dataSearch: string;
		products: ProductCardData[];
		availableFilters: AvailableFilter[];
	} = $props();

	const SORT_OPTIONS = [
		{ label: 'Featured', value: getSortByValue('COLLECTION_DEFAULT', false) },
		{ label: 'Best selling', value: getSortByValue('BEST_SELLING', false) },
		{ label: 'Alphabetically, A-Z', value: getSortByValue('TITLE', false) },
		{ label: 'Alphabetically, Z-A', value: getSortByValue('TITLE', true) },
		{ label: 'Price, low to high', value: getSortByValue('PRICE', false) },
		{ label: 'Price, high to low', value: getSortByValue('PRICE', true) },
		{ label: 'Date, old to new', value: getSortByValue('CREATED', false) },
		{ label: 'Date, new to old', value: getSortByValue('CREATED', true) }
	];

	let urlSearchOverride = $state<string | null>(null);
	const urlSearch = $derived(urlSearchOverride ?? page.url.search);
	const collectionPath = $derived(page.url.pathname);
	const controller = createCollectionStoreController({
		data: untrack(() => ({ handle, dataSearch })),
		urlSearch: untrack(() => urlSearch),
		onChange: handleBrowseChange
	});
	const browseState = collectionState(controller);
	const { formProps } = createCollectionForm(controller);
	const currentSortValue = $derived(
		$browseState.sortKey ? getSortByValue($browseState.sortKey, $browseState.reverse) : getSortByValue('COLLECTION_DEFAULT', false)
	);
	const hasActiveFilters = $derived($browseState.filters.length > 0);
	const isLoading = $derived($browseState.status === 'loading');
	const currentParams = $derived(serializeCollectionParams($browseState));
	let hasInitialisedController = false;

	$effect(() => {
		const data = { handle, dataSearch };
		if (!hasInitialisedController) {
			hasInitialisedController = true;
			return;
		}
		controller.reset({
			data,
			urlSearch: untrack(() => urlSearch),
			onChange: handleBrowseChange
		});
	});

	$effect(() => {
		const normalizedUrlSearch = normalizeCollectionSearch(urlSearch);
		const normalizedDataSearch = normalizeCollectionSearch(dataSearch);
		const params = new URLSearchParams(normalizedUrlSearch);

		if (!controller.store.matchesParams(params)) {
			controller.store.syncFromParams(params);
		}

		if (normalizedDataSearch === normalizedUrlSearch) {
			controller.store.settle();
		}
	});

	async function handleBrowseChange(search: string) {
		const normalizedSearch = normalizeCollectionSearch(search);
		urlSearchOverride = normalizedSearch;
		try {
			await goto(`${collectionPath}${search}`, {
				replaceState: normalizeCollectionSearch(urlSearch).length > 0,
				noScroll: true,
				keepFocus: true
			});
		} finally {
			urlSearchOverride = null;
		}
	}

	function onSortChange(event: Event) {
		(event.target as HTMLSelectElement).form?.requestSubmit();
	}

	function onFilterChange(event: Event, filter: AvailableFilter) {
		const checkbox = event.target as HTMLInputElement;
		if (isMutuallyExclusive(filter) && checkbox.checked) {
			uncheckSiblings(checkbox);
		}
		checkbox.form?.requestSubmit();
	}

	function uncheckSiblings(checkbox: HTMLInputElement) {
		const form = checkbox.form;
		if (!form) return;
		for (const el of form.elements) {
			if (
				el instanceof HTMLInputElement &&
				el !== checkbox &&
				el.name === checkbox.name &&
				el.type === 'checkbox'
			) {
				el.checked = false;
			}
		}
	}

	function isMutuallyExclusive(filter: AvailableFilter): boolean {
		return (
			filter.type === 'BOOLEAN' ||
			filter.values.some((value) => {
				const entries = filterInputToParamEntries(value.input);
				return entries.length === 1 && entries[0].name === 'filter.v.availability';
			})
		);
	}

	function filterInputToParamEntries(input: string): Array<{ name: string; value: string }> {
		let filter: ProductFilter;
		try {
			filter = JSON.parse(input) as ProductFilter;
		} catch {
			return [];
		}
		return Array.from(
			serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false }),
			([name, value]) => ({ name, value })
		);
	}

	function describeFilter(filter: ProductFilter): string {
		if (filter.tag) return filter.tag;
		if (filter.productType) return filter.productType;
		if (filter.productVendor) return filter.productVendor;
		if (filter.available != null) return filter.available ? 'In stock' : 'Out of stock';
		if (filter.variantOption) return `${filter.variantOption.name}: ${filter.variantOption.value}`;
		if (filter.price) {
			const { min, max } = filter.price;
			if (min != null && max == null) return `$${min}+`;
			if (max != null && min == null) return `Up to $${max}`;
			if (min != null && max != null) return `$${min} - $${max}`;
		}
		return 'Filter';
	}

	function filterRemovalHref(filter: ProductFilter): string {
		const removal = getFilterRemovalUrl(currentParams, filter);
		return removal === '?' ? collectionPath : `${collectionPath}${removal}`;
	}

	function visibleValues(filter: AvailableFilter) {
		return filter.values.filter((value) => value.count > 0);
	}
</script>

<main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
	<header class="max-w-2xl">
		<h1 class="text-6xl font-black tracking-tight md:text-8xl">{title}</h1>
		{#if description}
			<p class="mt-6 text-base leading-relaxed text-black/70 md:text-lg">{description}</p>
		{/if}
		<p class="mt-3 text-sm text-black/50">
			{products.length} {products.length === 1 ? 'product' : 'products'}
		</p>
	</header>

	<form {...formProps()} method="get" action={collectionPath} class="mt-12 flex gap-12">
		{#if availableFilters.length > 0}
			<aside class="hidden w-60 shrink-0 md:block">
				<h2 class="text-sm font-semibold tracking-wider text-black/50 uppercase">Filters</h2>
				<div class="mt-6 space-y-8">
					{#each availableFilters as filter (filter.id)}
						{#if visibleValues(filter).length > 0}
							<fieldset disabled={isLoading} class={isLoading ? 'opacity-60' : undefined}>
								<legend class="text-sm font-semibold">{filter.label}</legend>
								<div class="mt-3 space-y-2">
									{#each visibleValues(filter) as value (value.id)}
										{@const entry = filterInputToParamEntries(value.input)[0]}
										{#if entry}
											<label class="flex cursor-pointer items-center gap-2 text-sm">
												<input
													type="checkbox"
													name={entry.name}
													value={entry.value}
													checked={isFilterInputActive($browseState.filters, value.input)}
													class="h-4 w-4 rounded border-black/20 disabled:cursor-not-allowed"
													onchange={(event) => onFilterChange(event, filter)}
												/>
												<span class={isFilterInputActive($browseState.filters, value.input) ? 'font-medium' : ''}>
													{value.label}
												</span>
												<span class="ml-auto text-xs text-black/40">({value.count})</span>
											</label>
										{/if}
									{/each}
								</div>
							</fieldset>
						{/if}
					{/each}
				</div>
				<noscript>
					<button
						type="submit"
						class="mt-8 w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
					>
						Apply
					</button>
				</noscript>
			</aside>
		{/if}

		<div class="flex-1">
			<div class="flex items-center justify-between border-b border-black/10 pb-4">
				<div class="flex items-center gap-4">
					{#if hasActiveFilters}
						<a href={collectionPath} class="text-sm text-black/60 underline hover:text-black">Clear all</a>
					{/if}
					<span role="status" aria-live="polite" aria-atomic="true" class="text-sm text-black/40">
						{isLoading ? 'Updating...' : ''}
					</span>
				</div>

				<label class="flex items-center gap-2 text-sm">
					<span class="text-black/60">Sort by</span>
					<select
						name="sort_by"
						value={currentSortValue}
						disabled={isLoading}
						class="rounded border border-black/15 bg-white px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
						onchange={onSortChange}
					>
						{#each SORT_OPTIONS as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>

			{#if hasActiveFilters}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each $browseState.filters as filter (JSON.stringify(filter))}
						<a
							href={filterRemovalHref(filter)}
							class="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
						>
							{describeFilter(filter)}
							<span aria-hidden="true">x</span>
						</a>
					{/each}
				</div>
			{/if}

			<section
				class={isLoading
					? 'mt-8 grid grid-cols-2 gap-x-6 gap-y-12 opacity-50 transition-opacity duration-200 md:grid-cols-3'
					: 'mt-8 grid grid-cols-2 gap-x-6 gap-y-12 opacity-100 transition-opacity duration-200 md:grid-cols-3'}
			>
				{#each products as product (product.handle)}
					<ProductCard {product} />
				{/each}
			</section>

			{#if products.length === 0 && !isLoading}
				<div class="mt-16 text-center">
					<p class="text-lg text-black/60">No products found matching your filters.</p>
					{#if hasActiveFilters}
						<a href={collectionPath} class="mt-4 inline-block text-sm font-semibold underline">
							Clear all filters
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</form>
</main>
