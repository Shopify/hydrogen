import * as CustomerAccount from "@shopify/hydrogen/customer-account";
import { data } from "react-router";

import { customerAccountContext } from "~/lib/customer-account";

import type { Route } from "./+types/account";

const CUSTOMER_QUERY = CustomerAccount.gql(`
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

export function meta() {
  return [{ title: "Account" }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const customerAccount = context.get(customerAccountContext);
  if (!customerAccount.available) {
    return { available: false, customer: null, error: false, loginFailed: false };
  }

  const loginFailed = new URL(request.url).searchParams.get("login") === "failed";
  const accessToken = await customerAccount.session.getOrRefreshAccessToken(
    customerAccount.sessionManager,
    customerAccount.requestContext,
  );
  if (!accessToken) {
    return { available: true, customer: null, error: false, loginFailed };
  }

  try {
    const result = await customerAccount.client.graphql(CUSTOMER_QUERY, { accessToken });
    if (result.errors) {
      return data(
        { available: true, customer: null, error: true, loginFailed: false },
        { status: 502 },
      );
    }
    return { available: true, customer: result.data.customer, error: false, loginFailed: false };
  } catch {
    return data(
      { available: true, customer: null, error: true, loginFailed: false },
      { status: 502 },
    );
  }
}

export default function AccountRoute({ loaderData }: Route.ComponentProps) {
  return (
    <main id="main-content" tabIndex={-1} className="max-w-page px-margin mx-auto w-full py-16">
      <h1 className="type-display mb-4">Account</h1>
      <p className="type-body text-on-surface-secondary max-w-xl">
        Sign in with Shopify Customer Accounts to view your account identity.
      </p>

      {!loaderData.available ? (
        <AccountUnavailable />
      ) : loaderData.error ? (
        <AccountError />
      ) : loaderData.customer ? (
        <CustomerCard customer={loaderData.customer} />
      ) : (
        <LoginPanel loginFailed={loaderData.loginFailed} />
      )}
    </main>
  );
}

function AccountUnavailable() {
  return (
    <section
      className="bg-surface border-border mt-8 rounded border p-8"
      aria-labelledby="account-unavailable"
    >
      <h2 id="account-unavailable" className="type-heading-sm">
        Customer Accounts require a real store
      </h2>
      <p className="type-body text-on-surface-secondary mt-3 max-w-xl">
        Configure the Customer Account environment values from <code>.env.example</code> to enable
        login.
      </p>
    </section>
  );
}

function AccountError() {
  return (
    <section
      className="bg-surface border-border mt-8 rounded border p-8"
      aria-labelledby="account-error"
    >
      <h2 id="account-error" className="type-heading-sm">
        We could not load your account
      </h2>
      <p role="alert" className="type-body text-on-surface-secondary mt-3 max-w-xl">
        Try reloading this page. If the problem continues, try again later.
      </p>
    </section>
  );
}

function LoginPanel({ loginFailed }: { loginFailed: boolean }) {
  return (
    <section
      className="bg-surface border-border mt-8 rounded border p-8"
      aria-labelledby="login-heading"
    >
      <h2 id="login-heading" className="type-heading-sm">
        Sign in
      </h2>
      {loginFailed ? (
        <p
          autoFocus
          role="alert"
          tabIndex={-1}
          className="bg-surface-secondary border-border text-on-surface mt-4 rounded border p-4"
        >
          We could not complete your login. Try signing in again.
        </p>
      ) : null}
      <a
        href="/account/login"
        className="rounded-button button-primary focus-visible:outline-accent mt-6 inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Log in
      </a>
    </section>
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
      aria-labelledby="customer-identity"
    >
      <h2 id="customer-identity" className="type-heading-sm">
        Customer identity
      </h2>
      <p className="type-heading-sm mt-3">{name}</p>
      {customer.emailAddress?.emailAddress ? (
        <p className="type-body text-on-surface-secondary mt-2">
          {customer.emailAddress.emailAddress}
        </p>
      ) : null}
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
