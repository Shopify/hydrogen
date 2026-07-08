import { Title } from "@solidjs/meta";
import { createAsync, query } from "@solidjs/router";
import { Show } from "solid-js";
import { getRequestEvent } from "solid-js/web";

import {
  getCustomerAccountPageData,
  getRequestCustomerAccountContext,
} from "../lib/customer-account";

const loadAccount = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (!event) throw new Error("Request event was not created for this server request.");

  const { customerAccountClient, customerSessionManager, shopifyRequestContext } =
    getRequestCustomerAccountContext();
  return getCustomerAccountPageData({
    request: event.request,
    requestContext: shopifyRequestContext,
    sessionManager: customerSessionManager,
    customerAccount: customerAccountClient,
  });
}, "account");

export default function AccountPage() {
  const accountData = createAsync(() => loadAccount());
  const name = () => {
    const customer = accountData()?.customer;
    return [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Customer";
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      class="mx-auto max-w-3xl px-6 py-16"
      aria-labelledby="account-heading"
    >
      <Title>Account — Mock.shop</Title>
      <h1 id="account-heading" class="text-4xl font-black tracking-tight">
        Account
      </h1>
      <p class="mt-4 max-w-xl text-black/70">
        Sign in with Shopify Customer Accounts to view your basic account identity.
      </p>

      <Show when={accountData()?.error}>
        {(error) => (
          <p role="alert" class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            {error()}
          </p>
        )}
      </Show>

      <Show
        when={accountData()?.customer}
        fallback={<LoginPanel loginFailed={Boolean(accountData()?.loginFailed)} />}
      >
        {(customer) => (
          <section
            class="bg-paper mt-8 rounded-3xl border border-black/10 p-8"
            aria-labelledby="identity-heading"
          >
            <h2
              id="identity-heading"
              class="text-sm font-semibold tracking-[0.2em] text-black/55 uppercase"
            >
              Customer identity
            </h2>
            <p class="mt-3 text-2xl font-bold">{name()}</p>
            <Show when={customer().emailAddress?.emailAddress}>
              {(emailAddress) => <p class="mt-2 text-black/70">{emailAddress()}</p>}
            </Show>
            <form method="post" action="/account/logout" class="mt-8">
              <button
                type="submit"
                class="rounded-full border border-black px-5 py-3 text-sm font-bold hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              >
                Log out
              </button>
            </form>
          </section>
        )}
      </Show>
    </main>
  );
}

function LoginPanel({ loginFailed }: { loginFailed: boolean }) {
  return (
    <section class="mt-8 rounded-3xl border border-black/10 p-8" aria-labelledby="login-heading">
      <h2 id="login-heading" class="text-xl font-bold">
        Sign in
      </h2>
      <p class="mt-3 max-w-xl text-black/70">
        Use your customer account to view your name and email for this store.
      </p>
      <Show when={loginFailed}>
        <p role="alert" class="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          We could not complete your login. Try signing in again.
        </p>
      </Show>
      <a
        href="/account/login"
        rel="external"
        class="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
      >
        Log in
      </a>
    </section>
  );
}
