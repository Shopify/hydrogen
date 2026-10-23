import type { DocumentDecoration, initGraphQLTada as InitGraphQLTada } from "gql.tada";

import { isObjectRecord } from "../core/utils/record";
import { appendFragments } from "../graphql/fragments";
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
 * A Customer Account API query or mutation that `gql` from `@shopify/hydrogen/customer-account` returns. TypeScript infers the result and variables types from the document's GraphQL source.
 *
 * Create documents only with the Customer Account `gql` function. The client throws a `TypeError` for any other object.
 */
export type CustomerAccountDocument<
  Result = unknown,
  Variables = never,
  Source extends string = string,
  Parts extends readonly string[] = readonly string[],
> = DocumentDecoration<Result, Variables> & {
  readonly [CUSTOMER_ACCOUNT_DOCUMENT]: true;
  readonly source: Source;
  /** The operation text followed by each distinct fragment text the document appends. The property exists only in types. */
  readonly parts?: Parts;
};

/** Any Customer Account API document. Use the type as a constraint when a function accepts any document. */
export type AnyCustomerAccountDocument = CustomerAccountDocument<unknown, never, string>;

/** Extracts the source string literal type from a Customer Account document. */
export type SourceOf<Doc> = Doc extends { readonly source: infer Source extends string }
  ? Source
  : never;

/** The operation text and distinct fragment texts of a document. A document without parts is one part: its source. */
type PartsOf<Doc> = Doc extends { readonly parts?: infer Parts extends readonly string[] }
  ? string[] extends Parts
    ? readonly [SourceOf<Doc>]
    : Parts
  : readonly [SourceOf<Doc>];

type Includes<Items extends readonly string[], Item extends string> = Items extends readonly [
  infer First,
  ...infer Rest extends readonly string[],
]
  ? [First] extends [Item]
    ? [Item] extends [First]
      ? true
      : Includes<Rest, Item>
    : Includes<Rest, Item>
  : false;

type Dedupe<
  Items extends readonly string[],
  Seen extends readonly string[] = readonly [],
> = Items extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
  ? Includes<Seen, First> extends true
    ? Dedupe<Rest, Seen>
    : readonly [First, ...Dedupe<Rest, readonly [...Seen, First]>]
  : readonly [];

type FlattenParts<Fragments extends readonly AnyCustomerAccountDocument[]> =
  Fragments extends readonly [
    infer First extends AnyCustomerAccountDocument,
    ...infer Rest extends readonly AnyCustomerAccountDocument[],
  ]
    ? readonly [...PartsOf<First>, ...FlattenParts<Rest>]
    : readonly [];

type JoinParts<Parts extends readonly string[]> = Parts extends readonly [infer Only extends string]
  ? Only
  : Parts extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
    ? `${First}\n${JoinParts<Rest>}`
    : "";

/** The operation text of a document followed by every distinct fragment text from its fragments, nested fragments included. */
type ComposedParts<
  Source extends string,
  Fragments extends readonly AnyCustomerAccountDocument[],
> = Dedupe<readonly [Source, ...FlattenParts<Fragments>]>;

/**
 * Joins the source strings of a tuple of fragment documents with newlines at the type level, each distinct fragment once. An empty tuple produces `""`.
 */
export type FragmentSources<Fragments extends readonly AnyCustomerAccountDocument[]> = JoinParts<
  Dedupe<FlattenParts<Fragments>>
>;

/**
 * Combines an operation source with the sources of its fragments at the type level. With no fragments, the result is the operation source.
 *
 * @publicDocs
 */
export type ComposedSource<
  Source extends string,
  Fragments extends readonly AnyCustomerAccountDocument[],
> = string[] extends Fragments ? string : JoinParts<ComposedParts<Source, Fragments>>;

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
    DocumentSource,
    ComposedParts<Source, Fragments>
  >;
} & CustomerAccountTadaGql;

/**
 * Creates a typed Customer Account API query or mutation from a GraphQL source string. Pass the document to the Customer Account API client. Call `gql` as a regular function. Tagged template syntax doesn't work.
 *
 * Pass an array of fragment documents as the second argument to append the fragments to the operation. Each fragment must come from this `gql` function, or the call throws a `TypeError`.
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
    for (const fragment of fragments) assertCustomerAccountDocument(fragment);
    query = appendFragments(
      source,
      fragments.map((fragment) => fragment.source),
    );
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
 * Creates a typed Customer Account API query or mutation from a GraphQL source string. Pass the document to the Customer Account API client. Call `gql` as a regular function.
 *
 * Pass an array of fragment documents as the second argument to append the fragments to the operation. Each fragment must come from this `gql` function, or the call throws a `TypeError`.
 *
 * To validate documents, run `hydrogen gql check` in your `typecheck` script with the `@shopify/hydrogen/ts-plugin` setup. Framework typecheck commands don't validate the documents.
 *
 * @publicDocs
 */
export type CustomerAccountGqlForDocs =
  /**
   * @param source - The GraphQL source of an operation or a fragment.
   * @param fragments - The fragment documents that the operation uses.
   * @returns A typed document to pass to the Customer Account API client.
   */
  (source: string, fragments?: readonly AnyCustomerAccountDocument[]) => AnyCustomerAccountDocument;
