import type { DocumentDecoration, initGraphQLTada as InitGraphQLTada } from "gql.tada";

import type { introspection } from "./generated/graphql-env";
import type { StorefrontScalars } from "./scalars";
import type { InferResult, InferVariables } from "./type-resolver";

type StorefrontTadaGql = InitGraphQLTada<{
  introspection: introspection;
  scalars: StorefrontScalars;
}>;

/** Type-only properties that mark a string as a `gql` document. */
type StorefrontQueryMetadata<Source extends string = string> = {
  /** Marks a string that `gql` returns. The property exists only in types. */
  readonly __hydrogenQueryBrand: true;
  /** The document's query text, which TypeScript reads to infer types. The property exists only in types. */
  readonly __hydrogenQuerySource?: Source;
};

/**
 * The type of a `gql` document, a query string that carries its result and variables types.
 *
 * At runtime, the document is a plain string. Read the types with `StorefrontApi.ResultOf` and
 * `StorefrontApi.VariablesOf`.
 */
export type StorefrontQueryString<
  Result = any,
  Variables = any,
  Source extends string = string,
> = string &
  DocumentDecoration<Result, Variables> & {
    readonly __hydrogenQueryBrand: true;
    readonly __hydrogenQuerySource?: Source;
  };

/**
 * Any `gql` document, whatever its result and variables types. Use the type to accept any Storefront API document.
 */
export type AnyStorefrontQueryString = string & StorefrontQueryMetadata;

/** The query text of a `gql` document as a string literal type. Resolves to `never` for a plain string. */
export type SourceOf<Doc> = Doc extends {
  readonly __hydrogenQuerySource?: infer Source extends string;
}
  ? Source
  : never;

export type FragmentSources<Fragments extends readonly AnyStorefrontQueryString[]> =
  Fragments extends readonly []
    ? ""
    : Fragments extends readonly [infer Only extends AnyStorefrontQueryString]
      ? SourceOf<Only>
      : Fragments extends readonly [
            infer First extends AnyStorefrontQueryString,
            ...infer Rest extends readonly AnyStorefrontQueryString[],
          ]
        ? `${SourceOf<First>}\n${FragmentSources<Rest>}`
        : string;

/** The combined query text of a document and its fragments, which keeps the inferred types of composed documents. */
export type ComposedSource<
  Source extends string,
  Fragments extends readonly AnyStorefrontQueryString[],
> = FragmentSources<Fragments> extends "" ? Source : `${Source}\n${FragmentSources<Fragments>}`;

type StorefrontGql = {
  // Composes an already-declared document with additional fragments. Declared
  // before the raw-source overloads so branded documents recover their literal
  // source through SourceOf instead of binding Source to the branded type,
  // which would degrade ComposedSource and kill inference.
  <
    const Document extends AnyStorefrontQueryString,
    const Fragments extends readonly AnyStorefrontQueryString[],
    const DocumentSource extends string = ComposedSource<SourceOf<Document>, Fragments>,
  >(
    document: Document,
    fragments: Fragments,
  ): StorefrontQueryString<
    InferResult<DocumentSource>,
    InferVariables<DocumentSource>,
    DocumentSource
  >;
  <const Source extends string>(
    source: Source,
  ): StorefrontQueryString<InferResult<Source>, InferVariables<Source>, Source>;
  <
    const Source extends string,
    const Fragments extends readonly AnyStorefrontQueryString[],
    const DocumentSource extends string = ComposedSource<Source, Fragments>,
  >(
    source: Source,
    fragments: Fragments,
  ): StorefrontQueryString<
    InferResult<DocumentSource>,
    InferVariables<DocumentSource>,
    DocumentSource
  >;
} & StorefrontTadaGql;

/**
 * Writes a typed Storefront API query, mutation, or fragment. TypeScript infers the result and
 * variables types from Hydrogen's bundled Storefront API schema. At runtime, the function returns
 * the query string with any fragments appended.
 *
 * Pass earlier fragment documents as the second argument to compose documents and keep the
 * inferred types.
 *
 * @example
 * ```ts
 * import { gql } from "@shopify/hydrogen";
 *
 * const PRODUCT_QUERY = gql(`
 *   query Product($handle: String!) {
 *     product(handle: $handle) { title }
 *   }
 * `);
 *
 * const result = await storefront.graphql(PRODUCT_QUERY, {
 *   variables: { handle: "snowboard" },
 * });
 *
 * if (!result.errors) {
 *   // result.data.product has the type `{ title: string } | null`
 *   console.log(result.data.product?.title);
 * }
 * ```
 * @publicDocs
 */
// oxlint-disable-next-line typescript-eslint/consistent-type-assertions -- gql.tada adds phantom helper properties to the function type that are not used at runtime.
export const gql = ((source: string, fragments?: Array<string>) => {
  let query = source;

  if (fragments) {
    const seen = new Set<string>();
    for (const fragment of fragments) {
      if (!seen.has(fragment)) {
        seen.add(fragment);
        query += "\n" + fragment;
      }
    }
  }

  return query;
}) as unknown as StorefrontGql;

/**
 * Writes a typed Storefront API query, mutation, or fragment. At runtime, the function returns the query text with each fragment appended once.
 *
 * TypeScript infers the result and variables types from Hydrogen's bundled Storefront API schema, even when the client targets another `apiVersion`. Read the types with `StorefrontApi.ResultOf` and `StorefrontApi.VariablesOf`. To type a fragment on its own, compose the fragment into a query and read the type from the query. The `FragmentOf` helper from `gql`.tada doesn't accept `gql` documents.
 *
 * @publicDocs
 */
export type StorefrontGqlForDocs =
  /**
   * @param source - The Storefront API query, mutation, or fragment source text.
   * @param fragments - The `gql` fragments that the query text spreads.
   * @returns A typed document to pass to the client's `graphql()` method.
   */
  (source: string, fragments?: readonly AnyStorefrontQueryString[]) => AnyStorefrontQueryString;
