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

export type CustomerAccountDocument<
  Result = unknown,
  Variables = never,
  Source extends string = string,
> = DocumentDecoration<Result, Variables> & {
  readonly [CUSTOMER_ACCOUNT_DOCUMENT]: true;
  readonly source: Source;
};

export type AnyCustomerAccountDocument = CustomerAccountDocument<unknown, never, string>;

export type SourceOf<Doc> = Doc extends { readonly source: infer Source extends string }
  ? Source
  : never;

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
