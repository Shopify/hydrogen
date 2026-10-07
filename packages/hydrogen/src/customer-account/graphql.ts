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
 * Branded document type that gql() in `@shopify/hydrogen/customer-account` returns.
 *
 * The document carries its GraphQL source as a string literal type. TypeScript derives the result and variables types from that source.
 *
 * The brand is private, and only gql() creates valid documents. The client throws a `TypeError` at runtime for a plain object with a `source` property.
 */
export type CustomerAccountDocument<
  Result = unknown,
  Variables = never,
  Source extends string = string,
> = DocumentDecoration<Result, Variables> & {
  readonly [CUSTOMER_ACCOUNT_DOCUMENT]: true;
  readonly source: Source;
};

/** Customer Account document with any result, variables, and source. Use it as a constraint when you accept any document. */
export type AnyCustomerAccountDocument = CustomerAccountDocument<unknown, never, string>;

/** Extracts the source string literal type from a Customer Account document. */
export type SourceOf<Doc> = Doc extends { readonly source: infer Source extends string }
  ? Source
  : never;

/**
 * Joins the source strings of a tuple of fragment documents with newlines at the type level. An empty tuple produces `""`.
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
 * Combines an operation source with the sources of its fragments at the type level. With no fragments, the result is the operation source.
 *
 * @publicDocs
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
 * Creates a branded Customer Account document from a GraphQL source string. Call gql as a regular function. The function doesn't support tagged template syntax.
 *
 * The client checks the private brand at runtime and throws a `TypeError` for a plain object with a `source` property.
 *
 * Pass an array of fragment documents as the second argument to append the fragments to the operation. Fragments with identical source text appear once. Fragments that share a name but differ in source text all appear. A fragment that another function created throws a `TypeError`.
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
 *       emailAddress { emailAddress }
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
 * @publicDocs
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

/**
 * Creates a typed Customer Account API document from a GraphQL source string. Call gql as a regular function.
 *
 * Pass an array of fragment documents as the second argument to append the fragments to the operation. Fragments with identical source text appear once. Each fragment must come from this gql function, or the call throws a `TypeError`.
 *
 * To validate documents, run `hydrogen gql check` in your `typecheck` script with the `@shopify/hydrogen/ts-plugin` setup. Framework typecheck commands don't validate the documents.
 *
 * @publicDocs
 */
export type CustomerAccountGqlForDocs =
  /**
   * @param source - GraphQL source text of an operation or a fragment.
   * @param fragments - Fragment documents that the operation references.
   * @returns A branded document that the Customer Account API client accepts.
   */
  (source: string, fragments?: readonly AnyCustomerAccountDocument[]) => AnyCustomerAccountDocument;
