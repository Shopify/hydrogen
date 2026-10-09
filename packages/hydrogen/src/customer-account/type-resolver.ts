import type { introspection } from "../graphql/generated/customer-account-graphql-env";
import type { CustomerAccountScalars } from "../graphql/scalars";
import type {
  GraphQLSchemaFor,
  InferResultForSchema,
  InferVariablesForSchema,
} from "../graphql/type-resolver";

type CustomerAccountSchema = GraphQLSchemaFor<introspection, CustomerAccountScalars>;

/**
 * Resolves the result type of a Customer Account API query string from the Customer Account API schema and scalars.
 *
 * The Storefront API version of this type comes from `@shopify/hydrogen`.
 *
 * @example
 * ```ts
 * import { type InferResult, type InferVariables } from '@shopify/hydrogen/customer-account';
 *
 * const QUERY = 'query { customer { firstName lastName } }';
 * type Result = InferResult<typeof QUERY>;
 * type Variables = InferVariables<typeof QUERY>;
 * ```
 * @publicDocs
 */
export type InferResult<T extends string> = InferResultForSchema<T, CustomerAccountSchema>;

/**
 * Resolves the variables type of a Customer Account API query string from the Customer Account API schema and scalars.
 *
 * The Storefront API version of this type comes from `@shopify/hydrogen`. See InferResult for an example.
 *
 * @publicDocs
 */
export type InferVariables<T extends string> = InferVariablesForSchema<T, CustomerAccountSchema>;
