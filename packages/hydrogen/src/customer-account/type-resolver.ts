import type { introspection } from "../graphql/generated/customer-account-graphql-env";
import type { CustomerAccountScalars } from "../graphql/scalars";
import type {
  GraphQLSchemaFor,
  InferResultForSchema,
  InferVariablesForSchema,
} from "../graphql/type-resolver";

type CustomerAccountSchema = GraphQLSchemaFor<introspection, CustomerAccountScalars>;

export type InferResult<T extends string> = InferResultForSchema<T, CustomerAccountSchema>;

export type InferVariables<T extends string> = InferVariablesForSchema<T, CustomerAccountSchema>;
