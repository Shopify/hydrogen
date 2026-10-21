import type { GraphQLFormattedError } from "@shopify/hydrogen";
import type { CustomerAddressInput } from "@shopify/hydrogen/customer-account-api-types";
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
import { requireCustomerAccessToken, type CustomerAccount } from "../../lib/customer-account.ts";
import { buildOrderSearchQuery, parseOrderFilters } from "../../lib/order-filters.ts";
import { getPaginationVariables } from "../../lib/pagination.ts";
import { localizePath } from "../../lib/public/i18n.ts";
import { routes } from "../../routes.ts";
import { NotFoundPage } from "../../ui/error-pages.tsx";
import {
  AddressesPage,
  LoginFailedPage,
  NEW_ADDRESS_ID,
  OrderPage,
  OrdersPage,
  ProfilePage,
} from "./pages.tsx";

const NO_STORE = { "Cache-Control": "no-cache, no-store, must-revalidate" };
const ADDRESS_INPUT_KEYS = [
  "address1",
  "address2",
  "city",
  "company",
  "firstName",
  "lastName",
  "phoneNumber",
  "zip",
  "zoneCode",
] as const;

/**
 * Customer Account pages. Every action requires a usable access token; without one it
 * redirects to Hydrogen's `/account/login` handler, which starts Shopify's OAuth flow.
 *
 * `cop()` rejects cross-origin form posts, and `formData()` parses the profile and
 * address forms. Both run only for this controller: the cart endpoint must read its own
 * request body.
 */
export default createController(routes.account, {
  middleware: [cop(), formData()],
  actions: {
    async index({ locale, render, request, shopify, url }) {
      if (url.searchParams.get("login") === "failed") {
        return render(<LoginFailedPage pathPrefix={locale.pathPrefix} />, {
          status: 401,
          headers: NO_STORE,
        });
      }
      await requireCustomerAccessToken(shopify.customerAccount, request, locale.pathPrefix);
      return redirect(localizePath("/account/orders", locale.pathPrefix));
    },

    /** Unknown account paths require login, like the rest of the section, then go to `/account`. */
    async fallback({ locale, request, shopify }) {
      await requireCustomerAccessToken(shopify.customerAccount, request, locale.pathPrefix);
      return redirect(localizePath("/account", locale.pathPrefix));
    },

    async orders({ locale, render, request, shopify, url }) {
      const { customerAccount } = shopify;
      const accessToken = await requireCustomerAccessToken(
        customerAccount,
        request,
        locale.pathPrefix,
      );
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

    async order({ locale, params, render, request, shopify }) {
      const { customerAccount } = shopify;
      const accessToken = await requireCustomerAccessToken(
        customerAccount,
        request,
        locale.pathPrefix,
      );
      let orderId: string;
      try {
        orderId = atob(params.id);
      } catch {
        return redirect(localizePath("/account/orders", locale.pathPrefix));
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

    async profile({ locale, render, request, shopify }) {
      const { customerAccount } = shopify;
      const accessToken = await requireCustomerAccessToken(
        customerAccount,
        request,
        locale.pathPrefix,
      );
      const customer = await getCustomer(customerAccount, accessToken);
      return render(<ProfilePage customer={customer} pathPrefix={locale.pathPrefix} />, {
        headers: NO_STORE,
      });
    },

    async updateProfile({ formData, locale, render, request, shopify }) {
      const { customerAccount } = shopify;
      const accessToken = await requireCustomerAccessToken(
        customerAccount,
        request,
        locale.pathPrefix,
      );
      const customer: { firstName?: string; lastName?: string } = {};
      for (const key of ["firstName", "lastName"] as const) {
        const value = formData.get(key);
        if (typeof value === "string" && value) customer[key] = value;
      }

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
      return redirect(localizePath("/account/profile", locale.pathPrefix), 303);
    },

    async addresses({ locale, render, request, shopify }) {
      const { customerAccount } = shopify;
      const accessToken = await requireCustomerAccessToken(
        customerAccount,
        request,
        locale.pathPrefix,
      );
      const customer = await getCustomer(customerAccount, accessToken);
      return render(<AddressesPage customer={customer} pathPrefix={locale.pathPrefix} />, {
        headers: NO_STORE,
      });
    },

    async updateAddresses({ formData, locale, render, request, shopify }) {
      const { customerAccount } = shopify;
      const accessToken = await requireCustomerAccessToken(
        customerAccount,
        request,
        locale.pathPrefix,
      );
      const addressId = String(formData.get("addressId") ?? "");
      const intent = String(formData.get("intent") ?? "");
      const defaultAddress = formData.get("defaultAddress") === "on";

      let error: string | undefined;
      try {
        if (intent === "create") {
          const result = await customerAccount.client.graphql(CREATE_ADDRESS_MUTATION, {
            accessToken,
            variables: { address: parseAddress(formData), defaultAddress },
          });
          error = mutationError(result, result.data?.customerAddressCreate, "customerAddress");
        } else if (intent === "update" && addressId) {
          const result = await customerAccount.client.graphql(UPDATE_ADDRESS_MUTATION, {
            accessToken,
            variables: { address: parseAddress(formData), addressId, defaultAddress },
          });
          error = mutationError(result, result.data?.customerAddressUpdate, "customerAddress");
        } else if (intent === "delete" && addressId) {
          const result = await customerAccount.client.graphql(DELETE_ADDRESS_MUTATION, {
            accessToken,
            variables: { addressId },
          });
          error = mutationError(result, result.data?.customerAddressDelete, "deletedAddressId");
        } else {
          error = "Unknown address action.";
        }
      } catch (caught) {
        error = caught instanceof Error ? caught.message : "Address action failed.";
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
      return redirect(localizePath("/account/addresses", locale.pathPrefix), 303);
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

function parseAddress(formData: FormData): CustomerAddressInput {
  const address: CustomerAddressInput = {};
  for (const key of ADDRESS_INPUT_KEYS) {
    const value = formData.get(key);
    if (typeof value === "string") address[key] = value;
  }
  const countryCode = String(formData.get("countryCode") ?? "").trim();
  // CountryCode is an enum the API matches case-sensitively.
  if (!/^[a-z]{2}$/i.test(countryCode)) {
    throw new Error("Enter a valid two-letter country code, such as US or GB.");
  }
  address.countryCode = countryCode.toUpperCase() as CustomerAddressInput["countryCode"];
  return address;
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
