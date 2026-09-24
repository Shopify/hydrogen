import type { DocumentDecoration, initGraphQLTada as InitGraphQLTada } from "gql.tada";

import { isObjectRecord } from "../core/utils/record";
import type { introspection } from "../graphql/generated/customer-account-graphql-env";
import type { CustomerAccountScalars } from "../graphql/scalars";
import type { InferResult, InferVariables } from "./type-resolver";

type CustomerAccountTadaGql = InitGraphQLTada<{
  introspection: introspection;
  scalars: CustomerAccountScalars;
}>;

const CUSTOMER_ACCOUNT_DOCUMENT = Symbol("CustomerAccountDocument");
const VARIABLE_DEFINITION_RE = /\$([_A-Za-z][_0-9A-Za-z]*)\s*:/g;

/**
 * Branded document type returned by {@link gql}.
 *
 * Carries the GraphQL source as a type-level string literal so that
 * `InferResult` and `InferVariables` can derive typed responses. The
 * `[CUSTOMER_ACCOUNT_DOCUMENT]` brand is private and cannot be constructed
 * externally — only `gql()` produces valid instances. Passing a plain object
 * with a `source` property to `CustomerAccountClient.graphql()` will throw
 * a `TypeError` at runtime.
 */
export type CustomerAccountDocument<
  Result = unknown,
  Variables = never,
  Source extends string = string,
> = DocumentDecoration<Result, Variables> & {
  readonly [CUSTOMER_ACCOUNT_DOCUMENT]: true;
  readonly source: Source;
};

/** Widened alias for {@link CustomerAccountDocument}. Use as a constraint when accepting any Customer Account document. */
export type AnyCustomerAccountDocument = CustomerAccountDocument<unknown, never, string>;

/** Extracts the source string literal type from a {@link CustomerAccountDocument}. */
export type SourceOf<Doc> = Doc extends { readonly source: infer Source extends string }
  ? Source
  : never;

/**
 * Recursively concatenates the source strings of an array of fragment
 * documents at the type level, joining each with a newline. An empty
 * tuple produces `""`.
 */
export type FragmentSources<Fragments extends readonly AnyCustomerAccountDocument[]> =
  Fragments extends readonly []
    ? ""
    : Fragments extends readonly [infer Only extends AnyCustomerAccountDocument]
      ? SourceOf<Only>
      : Fragments extends readonly [
            infer First extends AnyCustomerAccountDocument,
            ...infer Rest extends readonly AnyCustomerAccountDocument[],
          ]
        ? `${SourceOf<First>}\n${FragmentSources<Rest>}`
        : string;

/**
 * Combines an operation source with its {@link FragmentSources} at the type
 * level. When `Fragments` is empty the result is just `Source`.
 */
export type ComposedSource<
  Source extends string,
  Fragments extends readonly AnyCustomerAccountDocument[],
> = FragmentSources<Fragments> extends "" ? Source : `${Source}\n${FragmentSources<Fragments>}`;

type CustomerAccountDocumentValue = AnyCustomerAccountDocument & {
  readonly variableNames: ReadonlySet<string>;
};

type CustomerAccountGql = {
  <const Source extends string>(
    source: Source,
  ): CustomerAccountDocument<InferResult<Source>, InferVariables<Source>, Source>;
  <
    const Source extends string,
    const Fragments extends readonly AnyCustomerAccountDocument[],
    const DocumentSource extends string = ComposedSource<Source, Fragments>,
  >(
    source: Source,
    fragments: Fragments,
  ): CustomerAccountDocument<
    InferResult<DocumentSource>,
    InferVariables<DocumentSource>,
    DocumentSource
  >;
} & CustomerAccountTadaGql;

/**
 * Creates a branded {@link CustomerAccountDocument} from a GraphQL source
 * string. This is a regular function call, not a tagged template literal.
 *
 * The returned document is branded with a private Symbol that
 * `CustomerAccountClient.graphql()` validates at runtime — passing a plain
 * object with a `source` property will throw a `TypeError`.
 *
 * An optional second argument accepts an array of fragment documents. Fragments
 * are deduplicated by source string identity (`Set` check, not by fragment
 * name) and appended to the operation source.
 *
 * @example
 * ```ts
 * import { gql } from "@shopify/hydrogen/customer-account";
 *
 * const CUSTOMER_QUERY = gql(`
 *   query CustomerDetails {
 *     customer {
 *       firstName
 *       lastName
 *       email
 *     }
 *   }
 * `);
 * ```
 *
 * @example
 * ```ts
 * const ORDER_FIELDS = gql(`
 *   fragment OrderFields on Order {
 *     id
 *     totalPrice { amount currencyCode }
 *   }
 * `);
 *
 * const ORDERS_QUERY = gql(`
 *   query CustomerOrders {
 *     customer {
 *       orders(first: 10) {
 *         nodes { ...OrderFields }
 *       }
 *     }
 *   }
 * `, [ORDER_FIELDS]);
 * ```
 */
// oxlint-disable-next-line typescript-eslint/consistent-type-assertions -- gql.tada adds phantom helper properties to the function type that are not used at runtime.
export const gql = ((source: string, fragments?: readonly CustomerAccountDocument[]) => {
  let query = source;

  if (fragments) {
    const seen = new Set<string>();
    for (const fragment of fragments) {
      assertCustomerAccountDocument(fragment);
      if (!seen.has(fragment.source)) {
        seen.add(fragment.source);
        query += "\n" + fragment.source;
      }
    }
  }

  const document = {
    [CUSTOMER_ACCOUNT_DOCUMENT]: true,
    source: query,
    variableNames: getVariableNames(query),
  } satisfies CustomerAccountDocumentValue;
  return document;
}) as unknown as CustomerAccountGql;

export function isCustomerAccountDocument(value: unknown): value is CustomerAccountDocumentValue {
  if (!isObjectRecord(value)) return false;
  return value[CUSTOMER_ACCOUNT_DOCUMENT] === true && typeof value.source === "string";
}

export function assertCustomerAccountDocument(
  value: unknown,
): asserts value is CustomerAccountDocumentValue {
  if (!isCustomerAccountDocument(value)) {
    throw new TypeError("Expected a Customer Account API document returned by CAAPI.gql().");
  }
}

function getVariableNames(source: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const match of source.matchAll(VARIABLE_DEFINITION_RE)) {
    names.add(match[1]);
  }
  return names;
}
