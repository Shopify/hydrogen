<script lang="ts">
	import type { DiscountCode } from '@shopify/hydrogen';

	import { cartState, createCartForm } from '$lib/cart';

	const discountCodes = cartState((s) => s.data.discountCodes);
	const pendingDiscountCodes = cartState((s) => s.pending.discountCodes);
	const discountCodeErrors = cartState((s) => s.errors.discountCodes);
	const { formProps, register } = createCartForm();

	function validateDiscountApply(event: Event) {
		const form = event.target as HTMLFormElement;
		const code = new FormData(form).get('discountCode') as string;
		if (!code?.trim()) {
			event.preventDefault();
			return;
		}
		const isDuplicate = $discountCodes.some(
			(discountCode: DiscountCode) => discountCode.code.toLowerCase() === code.toLowerCase()
		);
		if (isDuplicate) event.preventDefault();
	}

	function resetForm(event: Event) {
		(event.target as HTMLFormElement).reset();
	}
</script>

<div class="mt-8 border-t border-black/10 pt-6">
	<h2 class="text-sm font-semibold tracking-wide text-black/50 uppercase">Discount Codes</h2>

	{#if $discountCodes.length > 0}
		<ul class="mt-3 space-y-2">
			{#each $discountCodes as discountCode (discountCode.code)}
				{@const discountError = $discountCodeErrors.get(discountCode.code)?.userErrors[0] ?? $discountCodeErrors.get(discountCode.code)?.warnings[0]}
				<li class="flex items-center justify-between">
					<span class="flex items-center gap-2 text-sm">
						<code
							class={$pendingDiscountCodes.has(discountCode.code)
								? 'rounded bg-black/5 px-2 py-0.5 font-mono text-xs opacity-30 transition-opacity'
								: 'rounded bg-black/5 px-2 py-0.5 font-mono text-xs transition-opacity'}
						>
							{discountCode.code}
						</code>
						<span
							class={[
								'transition-opacity',
								$pendingDiscountCodes.has(discountCode.code) ? 'opacity-30' : '',
								discountCode.applicable ? 'text-green-600' : 'text-amber-600'
							]}
						>
							{discountCode.applicable ? 'Applied' : 'Not applicable'}
						</span>
						{#if discountError}
							<p role="alert" class="text-xs text-red-600">{discountError.message}</p>
						{/if}
					</span>
					<form {...formProps()}>
						<input type="hidden" {...register('discountCode', { value: discountCode.code })} />
						<button
							type="submit"
							{...register('discount-remove')}
							class="text-xs text-red-600 underline hover:text-red-800"
						>
							Remove
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}

	<form {...formProps({ beforeSubmit: validateDiscountApply, afterSubmit: resetForm })} class="mt-3 flex gap-2">
		<input
			type="text"
			{...register('discountCode', { defaultValue: '' })}
			placeholder="Enter discount code"
			class="flex-1 rounded border border-black/15 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
		/>
		<button
			type="submit"
			{...register('discount-apply')}
			class="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-black/80"
		>
			Apply
		</button>
	</form>
</div>
