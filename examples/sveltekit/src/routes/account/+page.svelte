<script lang="ts">
	let { data } = $props();

	const name = $derived(
		[data.customer?.firstName, data.customer?.lastName].filter(Boolean).join(' ') || 'Customer'
	);
</script>

<main id="main-content" tabindex="-1" class="mx-auto max-w-3xl px-6 py-16" aria-labelledby="account-heading">
	<h1 id="account-heading" class="text-4xl font-black tracking-tight">Account</h1>
	<p class="mt-4 max-w-xl text-black/70">
		Sign in with Shopify Customer Accounts to view your basic account identity.
	</p>

	{#if data.error}
		<p role="alert" class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
			{data.error}
		</p>
	{/if}

	{#if data.customer}
		<section class="bg-paper mt-8 rounded-3xl border border-black/10 p-8" aria-labelledby="identity-heading">
			<h2 id="identity-heading" class="text-sm font-semibold tracking-[0.2em] text-black/55 uppercase">
				Customer identity
			</h2>
			<p class="mt-3 text-2xl font-bold">{name}</p>
			{#if data.customer.emailAddress?.emailAddress}
				<p class="mt-2 text-black/70">{data.customer.emailAddress.emailAddress}</p>
			{/if}
			<form method="post" action="/account/logout" class="mt-8">
				<button
					type="submit"
					class="rounded-full border border-black px-5 py-3 text-sm font-bold hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
				>
					Log out
				</button>
			</form>
		</section>
	{:else}
		<section class="mt-8 rounded-3xl border border-black/10 p-8" aria-labelledby="login-heading">
			<h2 id="login-heading" class="text-xl font-bold">Sign in</h2>
			<p class="mt-3 max-w-xl text-black/70">Use your customer account to view your name and email for this store.</p>
			{#if data.loginFailed}
				<p role="alert" class="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
					We could not complete your login. Try signing in again.
				</p>
			{/if}
			<a
				href="/account/login"
				class="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
			>
				Log in
			</a>
		</section>
	{/if}
</main>
