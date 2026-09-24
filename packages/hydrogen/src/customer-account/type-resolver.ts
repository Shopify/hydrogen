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
 * Delegates to {@link InferResultForSchema} bound to the Customer Account API
 * introspection schema and scalar mappings. This is the Customer Account
 * counterpart of the Storefront API `InferResult` in `graphql/type-resolver`.
 *
 * Use with {@link gql} document source strings to extract the typed query
 * result at compile time.
 *
 * @example
 * ```ts
 * import { gql, type InferResult, type InferVariables } from '@shopify/hydrogen/customer-account';
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
 * Delegates to {@link InferVariablesForSchema} bound to the Customer Account API
 * introspection schema and scalar mappings. This is the Customer Account
 * counterpart of the Storefront API `InferVariables` in `graphql/type-resolver`.
 *
 * Use with {@link gql} document source strings to extract the expected variable
 * types from a query string at compile time.
 *
 * @example
 * ```ts
 * import { gql, type InferResult, type InferVariables } from '@shopify/hydrogen/customer-account';
 *
 * const QUERY = 'query { customer { firstName lastName } }';
 * type Result = InferResult<typeof QUERY>;
 * type Variables = InferVariables<typeof QUERY>;
 * ```
 */
export type InferVariables<T extends string> = InferVariablesForSchema<T, CustomerAccountSchema>;
