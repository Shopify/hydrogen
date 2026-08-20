import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SHOPIFY_COUNTRY_CODES, SHOPIFY_LANGUAGE_CODES } from "./generated/iso-codes";

/**
 * Guards the generated runtime code sets against drift: they must stay exactly the
 * intersection of the Storefront and Customer Account API enums, mirroring the
 * ShopifyCountryCode/ShopifyLanguageCode types. Regenerate with `pnpm codegen`.
 */
describe("generated iso-codes", () => {
  it("SHOPIFY_COUNTRY_CODES mirrors the schema intersection", () => {
    expect([...SHOPIFY_COUNTRY_CODES]).toEqual(schemaEnumIntersection("CountryCode"));
  });

  it("SHOPIFY_LANGUAGE_CODES mirrors the schema intersection", () => {
    expect([...SHOPIFY_LANGUAGE_CODES]).toEqual(schemaEnumIntersection("LanguageCode"));
  });
});

function schemaEnumIntersection(enumName: string): string[] {
  const storefrontValues = readSchemaEnumValues("storefront.schema.json", enumName);
  const customerAccountValues = new Set(
    readSchemaEnumValues("customer-account.schema.json", enumName),
  );
  return storefrontValues.filter((value) => customerAccountValues.has(value)).toSorted();
}

type IntrospectionEnumType = {
  kind: string;
  name: string;
  enumValues?: Array<{ name: string }>;
};

function readSchemaEnumValues(schemaFileName: string, enumName: string): string[] {
  const schemaUrl = new URL(`./generated/${schemaFileName}`, import.meta.url);
  const schema = JSON.parse(readFileSync(schemaUrl, "utf8")) as {
    __schema: { types: IntrospectionEnumType[] };
  };

  const enumType = schema.__schema.types.find(
    (type) => type.kind === "ENUM" && type.name === enumName,
  );
  if (!enumType?.enumValues?.length) {
    throw new Error(`Enum ${enumName} not found in ${schemaFileName}`);
  }
  return enumType.enumValues.map((value) => value.name);
}
