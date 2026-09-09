import { createFileRoute } from "@tanstack/react-router";

import { toStorefrontSearch } from "~/lib/search-params";
import { getAccount } from "~/server/account";

export const Route = createFileRoute("/account")({
  validateSearch: toStorefrontSearch,
  loaderDeps: ({ search }) => search,
  // Session state changes outside the router (login/logout are full-page
  // redirects handled by Hydrogen), so never serve this from the loader cache.
  staleTime: 0,
  // Intent preloading would hit the Customer Account API on every hover.
  preload: false,
  loader: ({ location }) => getAccount({ data: { search: location.searchStr } }),
  head: () => ({
    meta: [{ title: "Account · CORE" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountPage,
});

const buttonClass =
  "rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]";

function AccountPage() {
  const { customer, error, loginFailed } = Route.useLoaderData();
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Customer";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="px-margin mx-auto w-full max-w-3xl flex-1 py-12"
      aria-labelledby="account-heading"
    >
      <h1 id="account-heading" className="type-display text-on-surface">
        Account
      </h1>
      <p className="text-on-surface-secondary mt-4 max-w-xl">
        Sign in with Shopify Customer Accounts to view your basic account identity.
      </p>

      {error ? (
        <p role="alert" className="border-critical text-critical mt-8 rounded border p-4">
          {error}
        </p>
      ) : null}

      {customer ? (
        <section
          className="border-border rounded-card mt-8 border p-8"
          aria-labelledby="identity-heading"
        >
          <h2 id="identity-heading" className="type-body-sm text-on-surface-secondary uppercase">
            Customer identity
          </h2>
          <p className="type-heading-md text-on-surface mt-3">{name}</p>
          {customer.emailAddress?.emailAddress ? (
            <p className="text-on-surface-secondary mt-2">{customer.emailAddress.emailAddress}</p>
          ) : null}
          {/* Hydrogen's Customer Account handlers serve this POST before routing. */}
          <form method="post" action="/account/logout" className="mt-8">
            <button type="submit" className={buttonClass}>
              Log out
            </button>
          </form>
        </section>
      ) : (
        <section
          className="border-border rounded-card mt-8 border p-8"
          aria-labelledby="login-heading"
        >
          <h2 id="login-heading" className="type-heading-md text-on-surface">
            Sign in
          </h2>
          <p className="text-on-surface-secondary mt-3 max-w-xl">
            Use your customer account to view your name and email for this store.
          </p>
          {loginFailed ? (
            <p role="alert" className="border-critical text-critical mt-4 rounded border p-4">
              We could not complete your login. Try signing in again.
            </p>
          ) : null}
          {/* Plain anchor: `/account/login` is served by Hydrogen before routing. */}
          <a href="/account/login" className={`${buttonClass} mt-6`}>
            Log in
          </a>
        </section>
      )}
    </main>
  );
}
