import type * as CAAPI from "@shopify/hydrogen/customer-account";
import type { CustomerAddressInput } from "@shopify/hydrogen/customer-account-api-types";
import type { AddressFragment, CustomerFragment } from "customer-accountapi.generated";
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  type Fetcher,
} from "react-router";

import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from "~/graphql/customer-account/CustomerAddressMutations";
import {
  getCustomerAccessToken,
  isSameOriginRequest,
  requireCustomerAccessToken,
} from "~/lib/customer-account";

import type { Route } from "./+types/($locale).account.addresses";

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: { id: string };
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<string, string> | null;
  updatedAddress?: CustomerAddressInput;
};

const NEW_ADDRESS_ID = "NEW_ADDRESS_ID";
const GENERAL_ACTION_ERROR_ID = "account-addresses";
const ADDRESS_INPUT_KEYS = [
  "address1",
  "address2",
  "city",
  "company",
  "territoryCode",
  "firstName",
  "lastName",
  "phoneNumber",
  "zoneCode",
  "zip",
] as const satisfies readonly (keyof CustomerAddressInput)[];
type CustomerAddressCreateResult = CAAPI.CustomerAccountGraphqlResult<
  CAAPI.InferResult<CAAPI.SourceOf<typeof CREATE_ADDRESS_MUTATION>>
>;
type CustomerAddressUpdateResult = CAAPI.CustomerAccountGraphqlResult<
  CAAPI.InferResult<CAAPI.SourceOf<typeof UPDATE_ADDRESS_MUTATION>>
>;
type CustomerAddressDeleteResult = CAAPI.CustomerAccountGraphqlResult<
  CAAPI.InferResult<CAAPI.SourceOf<typeof DELETE_ADDRESS_MUTATION>>
>;

export const meta: Route.MetaFunction = () => {
  return [{ title: "Addresses" }];
};

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireCustomerAccessToken(request, context.customerAccount);

  return {};
}

export async function action({ request, context }: Route.ActionArgs) {
  const { customerAccount } = context;
  let submittedAddressId = GENERAL_ACTION_ERROR_ID;

  if (!(await isSameOriginRequest(request, customerAccount.sessionManager))) {
    return addressActionError(GENERAL_ACTION_ERROR_ID, "Forbidden", 403);
  }

  const accessToken = await getCustomerAccessToken(customerAccount);
  if (!accessToken) {
    return addressActionError(GENERAL_ACTION_ERROR_ID, "Unauthorized", 401);
  }

  try {
    const form = await request.formData();
    const addressId = form.has("addressId") ? String(form.get("addressId")) : null;
    if (!addressId) {
      throw new Error("You must provide an address id.");
    }
    submittedAddressId = addressId;

    const defaultAddress = form.has("defaultAddress")
      ? String(form.get("defaultAddress")) === "on"
      : false;
    const address = parseAddress(form);

    switch (request.method) {
      case "POST": {
        const result = await customerAccount.client.graphql(CREATE_ADDRESS_MUTATION, {
          accessToken,
          variables: { address, defaultAddress },
        });
        const customerAddress = getCustomerAddressCreateResult(result);
        return { error: null, createdAddress: customerAddress, defaultAddress };
      }

      case "PUT": {
        const result = await customerAccount.client.graphql(UPDATE_ADDRESS_MUTATION, {
          accessToken,
          variables: { address, addressId: decodeURIComponent(addressId), defaultAddress },
        });
        assertCustomerAddressUpdated(result);
        return { error: null, updatedAddress: address, defaultAddress };
      }

      case "DELETE": {
        const result = await customerAccount.client.graphql(DELETE_ADDRESS_MUTATION, {
          accessToken,
          variables: { addressId: decodeURIComponent(addressId) },
        });
        assertCustomerAddressDeleted(result);
        return { error: null, deletedAddress: addressId };
      }

      default: {
        return addressActionError(addressId, "Method not allowed", 405);
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Address action failed.";
    return addressActionError(submittedAddressId, message, 400);
  }
}

function parseAddress(form: FormData): CustomerAddressInput {
  const address: CustomerAddressInput = {};

  for (const key of ADDRESS_INPUT_KEYS) {
    const value = form.get(key);
    if (typeof value === "string") address[key] = value;
  }

  return address;
}

function addressActionError(addressId: string, message: string, status: number) {
  return data({ error: { [addressId]: message } }, { status });
}

function getCustomerAddressCreateResult(result: CustomerAddressCreateResult) {
  if (result.errors?.length) throw new Error(result.errors[0].message);

  const payload = result.data?.customerAddressCreate;
  if (payload?.userErrors?.length) throw new Error(payload.userErrors[0].message);
  if (!payload?.customerAddress) throw new Error("Customer address create failed.");
  return payload.customerAddress;
}

function assertCustomerAddressUpdated(result: CustomerAddressUpdateResult) {
  if (result.errors?.length) throw new Error(result.errors[0].message);

  const payload = result.data?.customerAddressUpdate;
  if (payload?.userErrors?.length) throw new Error(payload.userErrors[0].message);
  if (!payload?.customerAddress) throw new Error("Customer address update failed.");
}

function assertCustomerAddressDeleted(result: CustomerAddressDeleteResult) {
  if (result.errors?.length) throw new Error(result.errors[0].message);

  const payload = result.data?.customerAddressDelete;
  if (payload?.userErrors?.length) throw new Error(payload.userErrors[0].message);
  if (!payload?.deletedAddressId) throw new Error("Customer address delete failed.");
}

export default function Addresses() {
  const { customer } = useOutletContext<{ customer: CustomerFragment }>();
  const { defaultAddress, addresses } = customer;

  return (
    <div className="account-addresses">
      <h2>Addresses</h2>
      <br />
      <div>
        <div>
          <legend>Create address</legend>
          <NewAddressForm key={addresses.nodes.length} />
        </div>
        <br />
        <hr />
        <br />
        {!addresses.nodes.length ? (
          <p>You have no addresses saved.</p>
        ) : (
          <ExistingAddresses addresses={addresses} defaultAddress={defaultAddress} />
        )}
      </div>
    </div>
  );
}

function NewAddressForm() {
  const newAddress = {
    address1: "",
    address2: "",
    city: "",
    company: "",
    territoryCode: "",
    firstName: "",
    id: "new",
    lastName: "",
    phoneNumber: "",
    zoneCode: "",
    zip: "",
  } as CustomerAddressInput;

  return (
    <AddressForm addressId={NEW_ADDRESS_ID} address={newAddress} defaultAddress={null}>
      {({ stateForMethod }) => (
        <div>
          <button disabled={stateForMethod("POST") !== "idle"} formMethod="POST" type="submit">
            {stateForMethod("POST") !== "idle" ? "Creating" : "Create"}
          </button>
        </div>
      )}
    </AddressForm>
  );
}

function ExistingAddresses({
  addresses,
  defaultAddress,
}: Pick<CustomerFragment, "addresses" | "defaultAddress">) {
  return (
    <div>
      <legend>Existing addresses</legend>
      {addresses.nodes.map((address) => (
        <AddressForm
          key={address.id}
          addressId={address.id}
          address={address}
          defaultAddress={defaultAddress}
        >
          {({ stateForMethod }) => (
            <div>
              <button disabled={stateForMethod("PUT") !== "idle"} formMethod="PUT" type="submit">
                {stateForMethod("PUT") !== "idle" ? "Saving" : "Save"}
              </button>
              <button
                disabled={stateForMethod("DELETE") !== "idle"}
                formMethod="DELETE"
                type="submit"
              >
                {stateForMethod("DELETE") !== "idle" ? "Deleting" : "Delete"}
              </button>
            </div>
          )}
        </AddressForm>
      ))}
    </div>
  );
}

export function AddressForm({
  addressId,
  address,
  defaultAddress,
  children,
}: {
  addressId: AddressFragment["id"];
  address: CustomerAddressInput;
  defaultAddress: CustomerFragment["defaultAddress"];
  children: (props: {
    stateForMethod: (method: "PUT" | "POST" | "DELETE") => Fetcher["state"];
  }) => React.ReactNode;
}) {
  const { state, formMethod } = useNavigation();
  const action = useActionData<ActionResponse>();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  return (
    <Form id={addressId}>
      <fieldset>
        <input type="hidden" name="addressId" defaultValue={addressId} />
        <label htmlFor="firstName">First name*</label>
        <input
          aria-label="First name"
          autoComplete="given-name"
          defaultValue={address?.firstName ?? ""}
          id="firstName"
          name="firstName"
          placeholder="First name"
          required
          type="text"
        />
        <label htmlFor="lastName">Last name*</label>
        <input
          aria-label="Last name"
          autoComplete="family-name"
          defaultValue={address?.lastName ?? ""}
          id="lastName"
          name="lastName"
          placeholder="Last name"
          required
          type="text"
        />
        <label htmlFor="company">Company</label>
        <input
          aria-label="Company"
          autoComplete="organization"
          defaultValue={address?.company ?? ""}
          id="company"
          name="company"
          placeholder="Company"
          type="text"
        />
        <label htmlFor="address1">Address line*</label>
        <input
          aria-label="Address line 1"
          autoComplete="address-line1"
          defaultValue={address?.address1 ?? ""}
          id="address1"
          name="address1"
          placeholder="Address line 1*"
          required
          type="text"
        />
        <label htmlFor="address2">Address line 2</label>
        <input
          aria-label="Address line 2"
          autoComplete="address-line2"
          defaultValue={address?.address2 ?? ""}
          id="address2"
          name="address2"
          placeholder="Address line 2"
          type="text"
        />
        <label htmlFor="city">City*</label>
        <input
          aria-label="City"
          autoComplete="address-level2"
          defaultValue={address?.city ?? ""}
          id="city"
          name="city"
          placeholder="City"
          required
          type="text"
        />
        <label htmlFor="zoneCode">State / Province*</label>
        <input
          aria-label="State/Province"
          autoComplete="address-level1"
          defaultValue={address?.zoneCode ?? ""}
          id="zoneCode"
          name="zoneCode"
          placeholder="State / Province"
          required
          type="text"
        />
        <label htmlFor="zip">Zip / Postal Code*</label>
        <input
          aria-label="Zip"
          autoComplete="postal-code"
          defaultValue={address?.zip ?? ""}
          id="zip"
          name="zip"
          placeholder="Zip / Postal Code"
          required
          type="text"
        />
        <label htmlFor="territoryCode">Country Code*</label>
        <input
          aria-label="Country code"
          autoComplete="country"
          defaultValue={address?.territoryCode ?? ""}
          id="territoryCode"
          name="territoryCode"
          placeholder="Country"
          required
          type="text"
          maxLength={2}
        />
        <label htmlFor="phoneNumber">Phone</label>
        <input
          aria-label="Phone Number"
          autoComplete="tel"
          defaultValue={address?.phoneNumber ?? ""}
          id="phoneNumber"
          name="phoneNumber"
          placeholder="+16135551111"
          pattern="^\+?[1-9]\d{3,14}$"
          type="tel"
        />
        <div>
          <input
            defaultChecked={isDefaultAddress}
            id="defaultAddress"
            name="defaultAddress"
            type="checkbox"
          />
          <label htmlFor="defaultAddress">Set as default address</label>
        </div>
        {error ? (
          <p>
            <mark>
              <small>{error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        {children({
          stateForMethod: (method) => (formMethod === method ? state : "idle"),
        })}
      </fieldset>
    </Form>
  );
}
