export const STOREFRONT_API_SCALARS = {
  Color: "string",
  DateTime: "string",
  Decimal: "string",
  HTML: "string",
  JSON: "string",
  URL: "string",
  UnsignedInt64: "string",
} as const;

export const CUSTOMER_ACCOUNT_API_SCALARS = {
  BigInt: "string",
  DateTime: "string",
  Decimal: "string",
  HTML: "string",
  ISO8601DateTime: "string",
  JSON: "string",
  URL: "string",
  UnsignedInt64: "string",
} as const;

type StringScalarTypes<Scalars extends Record<string, string>> = {
  [Scalar in keyof Scalars]: string;
};

export type StorefrontScalars = StringScalarTypes<typeof STOREFRONT_API_SCALARS>;
export type CustomerAccountScalars = StringScalarTypes<typeof CUSTOMER_ACCOUNT_API_SCALARS>;
