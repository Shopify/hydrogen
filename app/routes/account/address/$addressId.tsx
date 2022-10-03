import type { ActionFunction } from "@remix-run/cloudflare";
import {
  Form,
  useActionData,
  useOutletContext,
  useParams,
  useTransition,
} from "@remix-run/react";
import type { MailingAddress } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { Button, Text } from "~/components";
import { getInputStyleClasses } from "~/lib/utils";

interface ActionData {
  formError?: string;
}

export interface EditAddressContext {
  addresses: MailingAddress[];
  defaultAddress?: MailingAddress;
}

export const action: ActionFunction = async ({ request, context }) => {};

export default function EditAddress() {
  const { addressId } = useParams();
  const isNewAddress = addressId === "add";
  const actionData = useActionData<ActionData>();
  const transition = useTransition();
  const { addresses, defaultAddress } = useOutletContext<EditAddressContext>();
  console.log({ addresses, defaultAddress });
  const address = addresses.find((address) => address.id === addressId);

  return (
    <>
      <Text className="mt-4 mb-6" as="h3" size="lead">
        {isNewAddress ? "Add address" : "Edit address"}
      </Text>
      <div className="max-w-lg">
        <Form method="post">
          <input type="hidden" name="addressId" value={addressId} />
          {actionData?.formError && (
            <div className="flex items-center justify-center mb-6 bg-red-100 rounded">
              <p className="m-4 text-sm text-red-900">{actionData.formError}</p>
            </div>
          )}
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="firstName"
              name="firstName"
              required
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              aria-label="First name"
              defaultValue={address?.firstName ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="lastName"
              name="lastName"
              required
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              aria-label="Last name"
              defaultValue={address?.lastName ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="Company"
              aria-label="Company"
              defaultValue={address?.company ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="street1"
              name="street1"
              type="text"
              autoComplete="address-line1"
              placeholder="Address line 1*"
              required
              aria-label="Address line 1"
              defaultValue={address?.address1 ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="address2"
              name="address2"
              type="text"
              autoComplete="address-line2"
              placeholder="Addresss line 2"
              aria-label="Address line 2"
              defaultValue={address?.address2 ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="city"
              name="city"
              type="text"
              required
              autoComplete="address-level2"
              placeholder="City"
              aria-label="City"
              defaultValue={address?.city ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="state"
              name="state"
              type="text"
              autoComplete="address-level1"
              placeholder="State / Province"
              required
              aria-label="State"
              defaultValue={address?.province ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="zip"
              name="zip"
              type="text"
              autoComplete="postal-code"
              placeholder="Zip / Postal Code"
              required
              aria-label="Zip"
              defaultValue={address?.zip ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="country"
              name="country"
              type="text"
              autoComplete="country-name"
              placeholder="Country"
              required
              aria-label="Country"
              defaultValue={address?.country ?? ""}
            />
          </div>
          <div className="mt-3">
            <input
              className={getInputStyleClasses()}
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Phone"
              aria-label="Phone"
              defaultValue={address?.phone ?? ""}
            />
          </div>
          <div className="mt-4">
            <input
              type="checkbox"
              name="defaultAddress"
              id="defaultAddress"
              defaultChecked={defaultAddress?.id === address?.id}
              className="border-gray-500 rounded-sm cursor-pointer border-1"
            />
            <label
              className="inline-block ml-2 text-sm cursor-pointer"
              htmlFor="defaultAddress"
            >
              Set as default address
            </label>
          </div>
          <div className="mt-8">
            <Button
              className="w-full rounded focus:shadow-outline"
              type="submit"
              variant="primary"
              disabled={transition.state !== "idle"}
            >
              {transition.state !== "idle" ? "Saving" : "Save"}
            </Button>
          </div>
          <div>
            <Button
              to=".."
              className="w-full mt-2 rounded focus:shadow-outline"
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
}
