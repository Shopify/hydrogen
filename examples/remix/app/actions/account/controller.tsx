import type { GraphQLFormattedError } from "@shopify/hydrogen";
import * as s from "remix/data-schema";
import { cop } from "remix/middleware/cop";
import { formData } from "remix/middleware/form-data";
import { redirect } from "remix/response/redirect";
import { createController } from "remix/router";

import {
  CREATE_ADDRESS_MUTATION,
  CUSTOMER_DETAILS_QUERY,
  CUSTOMER_ORDER_QUERY,
  CUSTOMER_ORDERS_QUERY,
  CUSTOMER_UPDATE_MUTATION,
  DELETE_ADDRESS_MUTATION,
  UPDATE_ADDRESS_MUTATION,
  type Customer,
} from "../../lib/customer-account-queries.ts";
import type { CustomerAccount } from "../../lib/customer-account.ts";
import { buildOrderSearchQuery, parseOrderFilters } from "../../lib/order-filters.ts";
import { getPaginationVariables } from "../../lib/pagination.ts";
import { localizePath } from "../../lib/public/i18n.ts";
import { customerAuth, requireCustomer } from "../../middleware/customer-auth.ts";
import { routes } from "../../routes.ts";
import { NotFoundPage } from "../../ui/error-pages.tsx";
import { AddressActionForm, AddressForm, firstIssue, ProfileForm } from "./forms.ts";
import { AddressesPage, NEW_ADDRESS_ID, OrderPage, OrdersPage, ProfilePage } from "./pages.tsx";

const NO_STORE = { "Cache-Control": "no-cache, no-store, must-revalidate" };

/**
 * Customer Account pages. `customerAuth()` resolves the customer from Hydrogen's session,
 * and `requireCustomer()` sends anonymous requests to Hydrogen's `/account/login` handler,
 * which starts Shopify's OAuth flow. Actions read the access token from `context.auth`.
 *
 * `cop()` rejects cross-origin form posts, and `formData()` parses the profile and
 * address forms. They run only for this controller: the cart endpoint must read its own
 * request body.
 */
export default createController(routes.account, {
  middleware: [cop(), formData(), customerAuth(), requireCustomer()],
  actions: {
    index({ locale }) {
      return redirect(localizePath(routes.account.orders.href(), locale.pathPrefix));
    },

    /** Unknown account paths require login, like the rest of the section, then go to `/account`. */
    fallback({ locale }) {
      return redirect(localizePath(routes.account.index.href(), locale.pathPrefix));
    },

    async orders({ auth, locale, render, request, shopify, url }) {
      const { customerAccount } = shopify;
      const { accessToken } = auth.identity;
      const filters = parseOrderFilters(url.searchParams);
      const [customer, orders] = await Promise.all([
        getCustomer(customerAccount, accessToken),
        customerAccount.client.graphql(CUSTOMER_ORDERS_QUERY, {
          accessToken,
          variables: {
            ...getPaginationVariables(url, { pageBy: 20 }),
            query: buildOrderSearchQuery(filters),
          },
        }),
      ]);
      if (orders.errors?.length || !orders.data?.customer) {
        throw new Error("Customer orders not found", { cause: orders.errors });
      }

      return render(
        <OrdersPage
          customer={customer}
          orders={orders.data.customer.orders}
          filters={filters}
          pathPrefix={locale.pathPrefix}
          url={new URL(request.url)}
        />,
        { headers: NO_STORE },
      );
    },

    async order({ auth, locale, params, render, request, shopify }) {
      const { customerAccount } = shopify;
      const { accessToken } = auth.identity;
      let orderId: string;
      try {
        orderId = atob(params.id);
      } catch {
        return redirect(localizePath(routes.account.orders.href(), locale.pathPrefix));
      }

      const [customer, result] = await Promise.all([
        getCustomer(customerAccount, accessToken),
        customerAccount.client.graphql(CUSTOMER_ORDER_QUERY, {
          accessToken,
          variables: { orderId },
        }),
      ]);
      if (result.errors?.length) {
        throw new Error("The order query failed.", { cause: result.errors });
      }
      const order = result.data?.order;
      if (!order || !("id" in order)) {
        return render(<NotFoundPage pathname={new URL(request.url).pathname} />, {
          status: 404,
          headers: NO_STORE,
        });
      }

      return render(
        <OrderPage customer={customer} order={order} pathPrefix={locale.pathPrefix} />,
        {
          headers: NO_STORE,
        },
      );
    },

    async profile({ auth, locale, render, shopify }) {
      const { customerAccount } = shopify;
      const { accessToken } = auth.identity;
      const customer = await getCustomer(customerAccount, accessToken);
      return render(<ProfilePage customer={customer} pathPrefix={locale.pathPrefix} />, {
        headers: NO_STORE,
      });
    },

    async updateProfile({ auth, formData, locale, render, shopify }) {
      const { customerAccount } = shopify;
      const { accessToken } = auth.identity;
      const customer = s.parse(ProfileForm, formData);

      const result = await customerAccount.client.graphql(CUSTOMER_UPDATE_MUTATION, {
        accessToken,
        variables: { customer },
      });
      const error =
        result.errors?.[0]?.message ??
        result.data?.customerUpdate?.userErrors[0]?.message ??
        (result.data?.customerUpdate?.customer ? undefined : "Customer profile update failed.");

      if (error) {
        return render(
          <ProfilePage
            customer={await getCustomer(customerAccount, accessToken)}
            error={error}
            pathPrefix={locale.pathPrefix}
          />,
          { status: 400, headers: NO_STORE },
        );
      }
      // Post/Redirect/Get, so a refresh doesn't resubmit the form.
      return redirect(localizePath(routes.account.profile.href(), locale.pathPrefix), 303);
    },

    async addresses({ auth, locale, render, shopify }) {
      const { customerAccount } = shopify;
      const { accessToken } = auth.identity;
      const customer = await getCustomer(customerAccount, accessToken);
      return render(<AddressesPage customer={customer} pathPrefix={locale.pathPrefix} />, {
        headers: NO_STORE,
      });
    },

    async updateAddresses({ auth, formData, locale, render, shopify }) {
      const { customerAccount } = shopify;
      const { accessToken } = auth.identity;
      const { addressId, defaultAddress, intent } = s.parse(AddressActionForm, formData);

      let error: string | undefined;
      try {
        error = await runAddressAction();
      } catch (caught) {
        console.error(caught);
        error = "Address action failed.";
      }

      async function runAddressAction(): Promise<string | undefined> {
        if (intent === "delete" && addressId) {
          const result = await customerAccount.client.graphql(DELETE_ADDRESS_MUTATION, {
            accessToken,
            variables: { addressId },
          });
          return mutationError(result, result.data?.customerAddressDelete, "deletedAddressId");
        }
        if (intent !== "create" && !(intent === "update" && addressId)) {
          return "Unknown address action.";
        }

        const address = s.parseSafe(AddressForm, formData);
        if (!address.success) return firstIssue(address);

        if (intent === "create") {
          const result = await customerAccount.client.graphql(CREATE_ADDRESS_MUTATION, {
            accessToken,
            variables: { address: address.value, defaultAddress },
          });
          return mutationError(result, result.data?.customerAddressCreate, "customerAddress");
        }
        const result = await customerAccount.client.graphql(UPDATE_ADDRESS_MUTATION, {
          accessToken,
          variables: { address: address.value, addressId, defaultAddress },
        });
        return mutationError(result, result.data?.customerAddressUpdate, "customerAddress");
      }

      if (error) {
        return render(
          <AddressesPage
            customer={await getCustomer(customerAccount, accessToken)}
            errors={{ [addressId || NEW_ADDRESS_ID]: error }}
            pathPrefix={locale.pathPrefix}
          />,
          { status: 400, headers: NO_STORE },
        );
      }
      return redirect(localizePath(routes.account.addresses.href(), locale.pathPrefix), 303);
    },
  },
});

async function getCustomer(
  customerAccount: CustomerAccount,
  accessToken: string,
): Promise<Customer> {
  const { data, errors } = await customerAccount.client.graphql(CUSTOMER_DETAILS_QUERY, {
    accessToken,
  });
  if (errors?.length || !data?.customer) {
    throw new Error("Customer not found", { cause: errors });
  }
  return data.customer;
}

function mutationError<Key extends string>(
  result: { errors?: readonly GraphQLFormattedError[] },
  payload:
    | ({ userErrors: Array<{ message: string }> } & Partial<Record<Key, unknown>>)
    | null
    | undefined,
  resultKey: Key,
): string | undefined {
  if (result.errors?.length) return result.errors[0]?.message;
  if (payload?.userErrors.length) return payload.userErrors[0]?.message;
  if (!payload?.[resultKey]) return "Address action failed.";
  return undefined;
}
