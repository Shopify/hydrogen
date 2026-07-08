import * as CAAPI from "@shopify/hydrogen/customer-account";
import { useEffect, useRef } from "react";
import { data, Link } from "react-router";
import type { MetaFunction } from "react-router";

import { customerAccountContext } from "~/lib/customer-account";

import type { Route } from "./+types/account";

const CUSTOMER_QUERY = CAAPI.gql(`
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

export const meta: MetaFunction = () => {
  return [{ title: "Account — CORE" }];
};

/**
 * `/account` — the Customer Accounts core surface. Shows the signed-in
 * customer's name + email, or a login panel. `/account/login`,
 * `/account/logout`, `/account/refresh`, and `/account/authorize` are
 * handler-intercepted in the root middleware (no route files); this is the
 * only framework route under `/account`.
 */
export async function loader({ context, request }: Route.LoaderArgs) {
  const customerAccount = context.get(customerAccountContext);

  // mock.shop fallback: customer accounts are not available. Short-circuit so
  // the page renders the "requires a real store" notice and the loader never
  // touches the session/token.
  if (!customerAccount?.available) {
    return data({ available: false, customer: null, error: null, loginFailed: false });
  }

  const loginFailed = new URL(request.url).searchParams.get("login") === "failed";

  const accessToken = await customerAccount.session.getOrRefreshAccessToken(
    customerAccount.sessionManager,
    customerAccount.requestContext,
  );

  if (!accessToken) {
    return data({ available: true, customer: null, error: null, loginFailed });
  }

  try {
    const { data: customerData, errors } = await customerAccount.client.graphql(CUSTOMER_QUERY, {
      accessToken,
    });
    const customer = errors ? null : customerData.customer;
    return data({ available: true, customer, error: errors?.[0]?.message ?? null, loginFailed });
  } catch {
    return data(
      {
        available: true,
        customer: null,
        error: "Customer Account API request failed. Try again later.",
        loginFailed,
      },
      { status: 502 },
    );
  }
}

export default function AccountRoute({ loaderData }: Route.ComponentProps) {
  const { available, customer, error, loginFailed } = loaderData;

  return (
    <div className="max-w-page px-margin mx-auto w-full py-16">
      <h1 id="account-heading" className="type-display mb-4">
        Account
      </h1>
      <p className="type-body text-on-surface-secondary max-w-xl">
        Sign in with Shopify Customer Accounts to view your basic account identity.
      </p>

      {!available ? (
        <MockShopNotice />
      ) : (
        <>
          {error ? <CustomerAccountError message={error} /> : null}
          {customer ? (
            <CustomerCard customer={customer} />
          ) : (
            <LoginPanel loginFailed={loginFailed} />
          )}
        </>
      )}
    </div>
  );
}

function MockShopNotice() {
  return (
    <section
      className="bg-surface border-border mt-8 rounded border p-8"
      aria-labelledby="mock-shop-notice-heading"
    >
      <h2 id="mock-shop-notice-heading" className="type-heading-sm">
        Customer Accounts require a real store
      </h2>
      <p className="type-body text-on-surface-secondary mt-3 max-w-xl">
        This example is running against mock.shop, which has no Customer Account API. Decrypt the
        example secrets and run over HTTPS to enable login:
      </p>
      <ul className="type-body-sm text-on-surface-secondary mt-4 list-disc ps-6">
        <li>
          <code className="bg-surface-secondary rounded-sm px-1.5 py-0.5">
            pnpm examples:secrets:decrypt
          </code>
        </li>
        <li>
          <code className="bg-surface-secondary rounded-sm px-1.5 py-0.5">
            pnpm --filter @shopify/hydrogen-example-react-router https:dev
          </code>
        </li>
      </ul>
    </section>
  );
}

function LoginPanel({ loginFailed }: { loginFailed: boolean }) {
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (loginFailed) errorRef.current?.focus();
  }, [loginFailed]);

  return (
    <section
      className="bg-surface border-border mt-8 rounded border p-8"
      aria-labelledby="login-heading"
    >
      <h2 id="login-heading" className="type-heading-sm">
        Sign in
      </h2>
      <p className="type-body text-on-surface-secondary mt-3 max-w-xl">
        Use your customer account to view your name and email for this store.
      </p>
      {loginFailed ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="bg-surface-secondary border-border text-on-surface focus-visible:outline-accent mt-4 rounded border p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          We could not complete your login. Try signing in again.
        </p>
      ) : null}
      <Link
        to="/account/login"
        reloadDocument
        className="rounded-button button-primary focus-visible:outline-accent mt-6 inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Log in
      </Link>
    </section>
  );
}

function CustomerAccountError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="bg-surface-secondary border-border text-on-surface mt-8 rounded border p-4"
    >
      {message}
    </p>
  );
}

function CustomerCard({
  customer,
}: {
  customer: {
    firstName?: string | null;
    lastName?: string | null;
    emailAddress?: { emailAddress?: string | null } | null;
  };
}) {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer";

  return (
    <section
      className="bg-surface border-border mt-8 rounded border p-8"
      aria-labelledby="identity-heading"
    >
      <h2
        id="identity-heading"
        className="type-body-sm text-on-surface-secondary font-medium tracking-[0.2em] uppercase"
      >
        Customer identity
      </h2>
      <p className="type-heading-sm mt-3">{name}</p>
      {customer.emailAddress?.emailAddress ? (
        <p className="type-body text-on-surface-secondary mt-2">
          {customer.emailAddress.emailAddress}
        </p>
      ) : null}
      {/* Plain HTML <form> (not RR <Form>): /account/logout is a Hydrogen-owned
          route intercepted by handleShopifyRoutes in middleware, returning a raw
          303 redirect (to Shopify's logout endpoint when there's an id_token).
          RR's client-side <Form> can't process that raw redirect response, so a
          full-page POST lets the browser follow the redirect natively. The
          login link uses RR <Link reloadDocument> for the same reason. */}
      <form method="post" action="/account/logout" className="mt-8">
        <button
          type="submit"
          className="rounded-button button-secondary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Log out
        </button>
      </form>
    </section>
  );
}
