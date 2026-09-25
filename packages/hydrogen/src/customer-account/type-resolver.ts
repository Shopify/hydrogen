import type { introspection } from "../graphql/generated/customer-account-graphql-env";
import type { CustomerAccountScalars } from "../graphql/scalars";
import type {
  GraphQLSchemaFor,
  InferResultForSchema,
  InferVariablesForSchema,
} from "../graphql/type-resolver";

type CustomerAccountSchema = GraphQLSchemaFor<introspection, CustomerAccountScalars>;

/**
 * Resolves the GraphQL result type for a Customer Account API query string `T`.
 *
 * Uses the Customer Account API introspection schema and scalar mappings. This
 * is the Customer Account counterpart of `InferResult` from `@shopify/hydrogen`
 * (Storefront API).
 *
 * @example
 * ```ts
 * import { type InferResult, type InferVariables } from '@shopify/hydrogen/customer-account';
 *
 * const QUERY = 'query { customer { firstName lastName } }';
 * type Result = InferResult<typeof QUERY>;
 * type Variables = InferVariables<typeof QUERY>;
 * ```
 */
export type InferResult<T extends string> = InferResultForSchema<T, CustomerAccountSchema>;

/**
 * Resolves the GraphQL variables type for a Customer Account API query string `T`.
 *
 * Uses the Customer Account API introspection schema and scalar mappings. This is
 * the Customer Account counterpart of `InferVariables` from `@shopify/hydrogen`
 * (Storefront API). See {@link InferResult} for an example.
 */
export type InferVariables<T extends string> = InferVariablesForSchema<T, CustomerAccountSchema>;
