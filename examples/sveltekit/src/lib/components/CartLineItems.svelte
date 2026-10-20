<script lang="ts">
	import { tick } from 'svelte';

	import { cartState, createCartForm } from '$lib/cart';
	import { closeCartDrawer } from '$lib/cart-drawer';
	import { formatMoney } from '$lib/money';

	let {
		emptyHeadingLevel = 'h2',
		errorIdPrefix = 'cart-line-error'
	}: {
		emptyHeadingLevel?: 'h2' | 'h3';
		errorIdPrefix?: string;
	} = $props();

	const lines = cartState((s) => s.data.lines.nodes);
	const loading = cartState((s) => s.loading);
	const pendingLines = cartState((s) => s.pending.lines);
	const lineErrors = cartState((s) => s.errors.lines);
	const { formProps, register } = createCartForm();
	let cartLinesRegion: HTMLElement | null = $state(null);
	let previousLineCount = $state(0);

	$effect(() => {
		const nextLineCount = $lines.length;
		if (previousLineCount === 0) {
			previousLineCount = nextLineCount;
			return;
		}
		if (nextLineCount >= previousLineCount || typeof document === 'undefined') {
			previousLineCount = nextLineCount;
			return;
		}

		previousLineCount = nextLineCount;
		void tick().then(() => {
			const region = cartLinesRegion;
			const ownerDialog = region?.closest('dialog');
			if (!region || (ownerDialog instanceof HTMLDialogElement && !ownerDialog.open)) return;

			const activeElement = document.activeElement;
			if (
				activeElement instanceof HTMLElement &&
				activeElement !== document.body &&
				document.body.contains(activeElement)
			) {
				return;
			}

			region
				.querySelector<HTMLElement>(
					"button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
				)
				?.focus();
		});
	});

	function errorIdForLine(lineId: string) {
		return `${errorIdPrefix}-${lineId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
	}
</script>

{#if $loading}
	<div bind:this={cartLinesRegion} role="status" aria-live="polite" class="mt-8 animate-pulse space-y-6">
		<span class="sr-only">Loading cart items</span>
		{#each [1, 2] as i (i)}
			<div class="flex items-center gap-6">
				<div class="h-24 w-24 rounded-lg bg-black/5"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 w-32 rounded bg-black/5"></div>
					<div class="h-3 w-20 rounded bg-black/5"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if $lines.length === 0}
	<div bind:this={cartLinesRegion} class="py-20 text-center">
		<svelte:element this={emptyHeadingLevel} class="text-2xl font-bold">
			Your cart is empty
		</svelte:element>
		<p class="mt-2 text-black/60">Add some items to get started.</p>
		<a
			href="/collections"
			class="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
			onclick={closeCartDrawer}
		>
			Continue shopping
		</a>
	</div>
{:else}
	<ul bind:this={cartLinesRegion} class="mt-8 divide-y divide-black/10">
		{#each $lines as line (line.id)}
			{@const lineError = $lineErrors.get(line.id)?.userErrors[0] ?? $lineErrors.get(line.id)?.warnings[0]}
			<li class="py-6">
				<form
					{...formProps()}
					aria-describedby={lineError ? errorIdForLine(line.id) : undefined}
					class="space-y-3"
				>
					<div class="flex items-center gap-6">
						<input type="hidden" {...register('lineId', { value: line.id })} />
						<button {...register('set')} aria-hidden="true"></button>

						{#if line.merchandise?.image}
							<img
								src={line.merchandise.image.url}
								alt={line.merchandise.image.altText ?? line.merchandise.product.title}
								class="h-24 w-24 rounded-lg bg-black/5 object-cover"
							/>
						{/if}

						<div class="flex-1">
							<p class="font-semibold">{line.merchandise?.product.title ?? 'Unknown product'}</p>
							{#if line.merchandise?.title}
								<p class="text-xs text-black/40">{line.merchandise.title}</p>
							{/if}
							<p class="text-sm text-black/50">
								{formatMoney(line.cost.amountPerQuantity)} each
								{#if line.cost.compareAtAmountPerQuantity && Number(line.cost.compareAtAmountPerQuantity.amount) > Number(line.cost.amountPerQuantity.amount)}
									<span class="ml-2 text-black/30 line-through">
										{formatMoney(line.cost.compareAtAmountPerQuantity)}
									</span>
								{/if}
							</p>
							<p
								class={$pendingLines.has(line.id)
									? 'text-sm font-medium opacity-30 transition-opacity'
									: 'text-sm font-medium transition-opacity'}
							>
								{formatMoney(line.cost.totalAmount)}
							</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="submit"
								aria-label={`Decrease quantity for ${line.merchandise?.product.title ?? 'cart item'}`}
								{...register('decrease')}
								class="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-sm hover:border-black"
							>
								-
							</button>

							<input
								{...register('quantity', { value: line.quantity, interactive: true })}
								aria-label={`Quantity for ${line.merchandise?.product.title ?? 'cart item'}`}
								aria-invalid={Boolean(lineError)}
								class={$pendingLines.has(line.id)
									? 'w-8 text-center tabular-nums opacity-30 transition-opacity'
									: 'w-8 text-center tabular-nums transition-opacity'}
							/>

							<button
								type="submit"
								aria-label={`Increase quantity for ${line.merchandise?.product.title ?? 'cart item'}`}
								{...register('increase')}
								class="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-sm hover:border-black"
							>
								+
							</button>
						</div>

						<button
							type="submit"
							aria-label={`Remove ${line.merchandise?.product.title ?? 'cart item'} from cart`}
							{...register('remove')}
							class="min-h-6 py-1 text-sm text-red-600 underline hover:text-red-800"
						>
							Remove
						</button>
					</div>

					{#if lineError}
						<p id={errorIdForLine(line.id)} role="alert" class="text-sm text-red-600">
							{lineError.message}
						</p>
					{/if}
				</form>
			</li>
		{/each}
	</ul>
{/if}
