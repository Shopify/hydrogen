import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Stay in the Know</h2>
              <p className="mt-2 text-white/70">
                Get exclusive deals and early access to new products.
              </p>
            </div>
            <form className="flex items-center gap-3" action="#" method="post">
              <label className="sr-only" htmlFor="email">
                Email address
              </label>
              <div className="flex w-full items-center rounded-full border border-white/30 px-5 py-3 focus-within:border-white">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  className="w-full bg-transparent text-sm placeholder:text-white/60 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="ml-3 grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-white/15 pt-6 text-xs text-white/60 md:flex-row md:items-center">
            <p>© 2026 Mock.shop, Powered by Shopify</p>
            <Link href="/" className="hover:text-white">
              Terms and Policies
            </Link>
          </div>
        </div>
      </section>
    </footer>
  );
}
