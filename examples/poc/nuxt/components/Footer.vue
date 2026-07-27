<template>
  <footer>
    <section class="bg-black text-white">
      <div class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
        <div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div>
            <h2 class="text-3xl font-black tracking-tight md:text-4xl">Stay in the Know</h2>
            <p class="mt-2 text-white/70">Get exclusive deals and early access to new products.</p>
          </div>
          <form class="flex items-center gap-3" action="#" method="post">
            <label class="sr-only" for="email">Email address</label>
            <div
              class="flex w-full items-center rounded-full border border-white/30 px-5 py-3 focus-within:border-white"
            >
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email address"
                class="w-full bg-transparent text-sm placeholder:text-white/60 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                class="ml-3 grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M5 12h14" />
                  <path d="m13 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
        <div
          class="mt-12 flex flex-col items-start justify-between gap-2 border-t border-white/15 pt-6 text-xs text-white/60 md:flex-row md:items-center"
        >
          <p>&copy; 2026 Mock.shop, Powered by Shopify</p>
          <NuxtLink to="/" class="hover:text-white"> Terms and Policies </NuxtLink>
        </div>
      </div>
    </section>
  </footer>
</template>
