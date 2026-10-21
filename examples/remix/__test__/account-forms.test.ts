import assert from "node:assert/strict";
import test from "node:test";

import * as s from "remix/data-schema";

import {
  AddressActionForm,
  AddressForm,
  firstIssue,
  ProfileForm,
} from "../app/actions/account/forms.ts";

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

test("leaves blank profile names out of the update", () => {
  assert.deepEqual(s.parse(ProfileForm, formData({ firstName: "Ada", lastName: "" })), {
    firstName: "Ada",
  });
});

test("reads the address action and its checkbox", () => {
  assert.deepEqual(
    s.parse(AddressActionForm, formData({ intent: "create", defaultAddress: "on" })),
    {
      intent: "create",
      addressId: "",
      defaultAddress: true,
    },
  );
  assert.equal(s.parse(AddressActionForm, formData({ intent: "delete" })).defaultAddress, false);
});

test("normalizes the country code and keeps cleared address fields", () => {
  const address = s.parse(
    AddressForm,
    formData({ address1: "1 Main St", address2: "", countryCode: " gb " }),
  );

  assert.equal(address.countryCode, "GB");
  assert.equal(address.address1, "1 Main St");
  // An empty value clears the field, so it's sent rather than dropped.
  assert.equal(address.address2, "");
  assert.equal(address.city, undefined);
});

test("rejects a missing or malformed country code with a readable message", () => {
  const cases: Array<Record<string, string>> = [{ countryCode: "Britain" }, {}];
  for (const fields of cases) {
    const result = s.parseSafe(AddressForm, formData(fields));
    assert.equal(result.success, false);
    assert.ok(!result.success);
    assert.equal(firstIssue(result), "Enter a valid two-letter country code, such as US or GB.");
  }
});
