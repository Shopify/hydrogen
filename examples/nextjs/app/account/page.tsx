import "server-only";
import { customerAccountConfig } from "@shared/config";
import { createCustomerAccountClient, gql } from "@shopify/hydrogen/customer-account";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCustomerAccessToken } from "@/lib/customer-account";
import { isCustomerAccountsAvailable } from "@/lib/storefront-config";
import { toURLSearchParams } from "@/lib/url-params";

export const metadata: Metadata = {
  title: "Account",
};

const CUSTOMER_QUERY = gql(`
  query CurrentCustomer {
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
    }
  }
`);

type AccountCustomer = {
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: { emailAddress?: string | null } | null;
};

type AccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `/account` — core Customer Accounts surface (name + email only).
 *
 * No `export const dynamic` / `export const fetchCache`: under
 * `cacheComponents: true`, `force-dynamic` is not allowed. The page relies on
 * the `AppShell` dynamic context (`await connection()` in the root layout's
 * shell), which opts the whole subtree into dynamic rendering — any
 * `headers()`/`cookies()` read inside (e.g. `getCustomerAccessToken()` →
 * `createCurrentRequest()` → `headers()`) is then automatically dynamic, the
 * same convention `cart/page.tsx` follows.
 *
 * Token refresh is delegated to the `/account/refresh` handler (intercepted in
 * `proxy.ts`): the page only **reads** the token via `getAccessToken`
 * (read-only, no mutation, no render-time commit — the proxy runs before RSC
 * render and cannot commit mutations that occur during render). When no usable
 * token is present, the page `redirect()`s to `/account/refresh?return_to=…`;
 * the handler refreshes, commits the cookie on its response, and redirects
 * back to `/account`, which now reads a valid token.
 */
export default async function AccountPage({ searchParams }: AccountPageProps) {
  const available = isCustomerAccountsAvailable(); // sync — no await
  const urlSearchParams = toURLSearchParams(await searchParams);
  const loginFailed = urlSearchParams.get("login") === "failed";
  const refreshAttempted = urlSearchParams.get("refreshed") === "1";

  if (!available) return <AccountShell notice="real-store" />;

  const { accessToken, requestContext } = await getCustomerAccessToken();
  if (!accessToken && !loginFailed && !refreshAttempted) {
    // Delegate the refresh to the `/account/refresh` handler instead of calling
    // `getOrRefreshAccessToken` here: this page only *reads* the token during
    // RSC render, and the proxy runs before render — it cannot commit a cookie
    // mutation that happens during render. Refreshing in-page would break that
    // no-render-commit invariant. The handler refreshes, sets the cookie on its
    // own response, and redirects back with `refreshed=1`.
    redirect(`/account/refresh?return_to=${encodeURIComponent("/account?refreshed=1")}`);
  }
  if (!accessToken) return <AccountShell loginFailed={loginFailed} />;

  // Build the client per-call (Next has no RR "context" equivalent; per-call
  // construction from `headers()` is the native Next approach, matching
  // `getStorefrontClient`).
  const customerAccount = createCustomerAccountClient({
    shopId: customerAccountConfig.shopId,
    requestContext,
  });

  // Keep the try/catch so a network/timeout failure surfaces as a friendly
  // error card instead of an unhandled 500 in RSC render.
  let customer: AccountCustomer | undefined;
  let error: string | undefined;
  try {
    const { data, errors } = await customerAccount.graphql(CUSTOMER_QUERY, { accessToken });
    customer = errors ? undefined : data.customer;
    error = errors?.[0]?.message;
  } catch {
    error = "Customer Account API request failed. Try again later.";
  }

  return <AccountShell customer={customer} error={error} />;
}

type AccountShellProps =
  | { notice: "real-store" }
  | { loginFailed: boolean }
  | { customer?: AccountCustomer | null; error?: string };

function AccountShell(props: AccountShellProps) {
  return (
    <div className="max-w-page px-margin mx-auto w-full py-16" aria-labelledby="account-heading">
      <h1 id="account-heading" className="type-display mb-4">
        Account
      </h1>
      <p className="type-body-lg text-on-surface-secondary max-w-xl">
        Sign in with Shopify Customer Accounts to view your basic account identity.
      </p>

      {"notice" in props && <RealStoreNotice />}
      {"loginFailed" in props && <LoginPanel loginFailed={props.loginFailed} />}
      {"customer" in props &&
        (props.error ? (
          <CustomerAccountError message={props.error} />
        ) : (
          <CustomerCard customer={props.customer} />
        ))}
    </div>
  );
}

function RealStoreNotice() {
  return (
    <section
      className="border-border bg-surface mt-8 rounded border p-8"
      aria-labelledby="notice-heading"
    >
      <h2 id="notice-heading" className="type-heading-lg mb-3">
        Customer Accounts require a real store
      </h2>
      <p className="type-body text-on-surface-secondary max-w-xl">
        This example is running against <code>mock.shop</code>, which has no Customer Account API.
        Run <code>pnpm examples:secrets:decrypt</code> and{" "}
        <code>pnpm --filter @shopify/hydrogen-example-nextjs https:dev</code> to enable login.
      </p>
    </section>
  );
}

function LoginPanel({ loginFailed }: { loginFailed: boolean }) {
  return (
    <section
      className="border-border bg-surface mt-8 rounded border p-8"
      aria-labelledby="login-heading"
    >
      <h2 id="login-heading" className="type-heading-lg mb-3">
        Sign in
      </h2>
      <p className="type-body text-on-surface-secondary mb-6 max-w-xl">
        Use your customer account to view your name and email for this store.
      </p>
      {loginFailed ? (
        <p
          tabIndex={-1}
          role="alert"
          autoFocus
          className="border-border bg-surface-secondary text-on-surface focus-visible:outline-accent mb-6 rounded border p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          We could not complete your login. Try signing in again.
        </p>
      ) : null}
      {/* Plain `<a>` — `/account/login` is handler-intercepted in `proxy.ts`. */}
      <a
        href="/account/login"
        className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Log in
      </a>
    </section>
  );
}

function CustomerAccountError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border-border bg-surface-secondary text-on-surface mt-8 rounded border p-4"
    >
      {message}
    </p>
  );
}

function CustomerCard({ customer }: { customer?: AccountCustomer | null }) {
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Customer";

  return (
    <section
      className="border-border bg-surface mt-8 rounded border p-8"
      aria-labelledby="identity-heading"
    >
      <h2
        id="identity-heading"
        className="type-body text-on-surface-secondary mb-3 text-sm font-semibold tracking-[0.2em] uppercase"
      >
        Customer identity
      </h2>
      <p className="type-heading-lg mb-2">{name}</p>
      {customer?.emailAddress?.emailAddress ? (
        <p className="type-body text-on-surface-secondary">{customer.emailAddress.emailAddress}</p>
      ) : null}
      <form method="post" action="/account/logout" className="mt-8">
        <button
          type="submit"
          className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Log out
        </button>
      </form>
    </section>
  );
}
