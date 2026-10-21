import type {
  CustomerAddressInput,
  CustomerUpdateInput,
} from "@shopify/hydrogen/customer-account-api-types";
import * as s from "remix/data-schema";
import * as f from "remix/data-schema/form-data";

/** An optional text field. A submitted empty value is kept, so the form can clear it. */
const text = f.field(s.optional(s.string()));

/** The profile form. Blank names are left out, so they keep their current value. */
export const ProfileForm = f.object({ firstName: text, lastName: text }).transform(
  ({ firstName, lastName }): CustomerUpdateInput => ({
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  }),
);

/** Which address form was submitted, and the address it targets. */
export const AddressActionForm = f.object({
  intent: f.field(s.defaulted(s.string(), "")),
  addressId: f.field(s.defaulted(s.string(), "")),
  defaultAddress: f.field(s.optional(s.string()).transform((value) => value === "on")),
});

/** The address fields of the create and update forms. */
export const AddressForm = f.object({
  address1: text,
  address2: text,
  city: text,
  company: text,
  firstName: text,
  lastName: text,
  phoneNumber: text,
  zip: text,
  zoneCode: text,
  countryCode: f.field(
    s
      .defaulted(s.string(), "")
      .transform((value) => value.trim())
      .refine(
        (value) => /^[a-z]{2}$/i.test(value),
        "Enter a valid two-letter country code, such as US or GB.",
      )
      // CountryCode is an enum the API matches case-sensitively.
      .transform((value) => value.toUpperCase() as CustomerAddressInput["countryCode"]),
  ),
}) satisfies s.Schema<FormData | URLSearchParams, CustomerAddressInput>;

/** The first validation message, for forms that show one error at a time. */
export function firstIssue(result: { issues: ReadonlyArray<{ message: string }> }): string {
  return result.issues[0]?.message ?? "Check the form and try again.";
}
