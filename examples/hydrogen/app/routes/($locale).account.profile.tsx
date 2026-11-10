import type { CustomerUpdateInput } from "@shopify/hydrogen/customer-account-api-types";
import type { CustomerFragment } from "customer-accountapi.generated";
import { data, Form, useActionData, useNavigation, useOutletContext } from "react-router";

import { CUSTOMER_UPDATE_MUTATION } from "~/graphql/customer-account/CustomerUpdateMutation";
import {
  getCustomerAccessToken,
  isSameOriginRequest,
  requireCustomerAccessToken,
} from "~/lib/customer-account";

import type { Route } from "./+types/($locale).account.profile";

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = () => {
  return [{ title: "Profile" }];
};

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireCustomerAccessToken(request, context.customerAccount);

  return {};
}

export async function action({ request, context }: Route.ActionArgs) {
  const { customerAccount } = context;

  if (request.method !== "PUT") {
    return data({ error: "Method not allowed", customer: null }, { status: 405 });
  }

  if (!(await isSameOriginRequest(request, customerAccount.sessionManager))) {
    return data({ error: "Forbidden", customer: null }, { status: 403 });
  }

  const accessToken = await getCustomerAccessToken(customerAccount);
  if (!accessToken) {
    return data({ error: "Unauthorized", customer: null }, { status: 401 });
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    const validInputKeys = ["firstName", "lastName"] as const;
    for (const [key, value] of form.entries()) {
      if (isCustomerUpdateInputKey(key, validInputKeys) && typeof value === "string" && value) {
        customer[key] = value;
      }
    }

    const { data, errors } = await customerAccount.client.graphql(CUSTOMER_UPDATE_MUTATION, {
      accessToken,
      variables: {
        customer,
      },
    });

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error("Customer profile update failed.");
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Customer profile update failed.";
    return data(
      { error: message, customer: null },
      {
        status: 400,
      },
    );
  }
}

function isCustomerUpdateInputKey<T extends readonly string[]>(
  key: string,
  validInputKeys: T,
): key is T[number] {
  return validInputKeys.includes(key);
}

export default function AccountProfile() {
  const account = useOutletContext<{ customer: CustomerFragment }>();
  const { state } = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;

  return (
    <div className="account-profile">
      <h2>My profile</h2>
      <br />
      <Form method="PUT">
        <legend>Personal information</legend>
        <fieldset>
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="First name"
            aria-label="First name"
            defaultValue={customer.firstName ?? ""}
            minLength={2}
          />
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Last name"
            aria-label="Last name"
            defaultValue={customer.lastName ?? ""}
            minLength={2}
          />
        </fieldset>
        {action?.error ? (
          <p>
            <mark>
              <small>{action.error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        <button type="submit" disabled={state !== "idle"}>
          {state !== "idle" ? "Updating" : "Update"}
        </button>
      </Form>
    </div>
  );
}
