import type { DocumentDecoration, initGraphQLTada as InitGraphQLTada } from "gql.tada";

import type { introspection } from "./generated/graphql-env";
import type { StorefrontScalars } from "./scalars";
import type { InferResult, InferVariables } from "./type-resolver";

type StorefrontTadaGql = InitGraphQLTada<{
  introspection: introspection;
  scalars: StorefrontScalars;
}>;

/** Phantom brand properties that mark a string as a Storefront API document from `gql`. */
type StorefrontQueryMetadata<Source extends string = string> = {
  /** Type-level marker for strings that `gql` returns. The property doesn't exist at runtime. */
  readonly __hydrogenQueryBrand: true;
  /** Literal source text of the document, used for type inference. The property doesn't exist at runtime. */
  readonly __hydrogenQuerySource?: Source;
};

/**
 * A branded string that carries phantom result and variables types.
 *
 * At runtime the value is a plain string. A gql.tada document node claims to be an AST
 * instead. The type implements gql.tada's document decoration, which lets ResultOf and
 * VariablesOf work on it.
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
 * Any document from `gql`, regardless of its inferred result and variables types. Use it in constraints that accept any Storefront API document.
 */
export type AnyStorefrontQueryString = string & StorefrontQueryMetadata;

/** Extracts the literal source text from a document type that `gql` returns. Resolves to `never` for unbranded strings. */
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

/** Concatenates a query source with its fragment sources into a single literal type, enabling end-to-end type inference for composed documents. */
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
 * Tags a Storefront API query string for type-safe inference.
 *
 * At runtime, the function returns the source string with any fragments appended.
 * At the type level, the return type carries phantom result and variables types
 * that gql.tada infers from the Storefront API schema.
 *
 * Pass an array of earlier fragment documents as the second argument to compose
 * documents and keep full type inference.
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
 * Tags a Storefront API query string for type inference. At runtime, the function returns the source text with the fragments appended. The function skips a fragment that appears twice in the fragments array.
 *
 * The result and variables types come from Hydrogen's bundled Storefront API schema, even when the client targets a different `apiVersion`. Read the types with `StorefrontApi.ResultOf` and `StorefrontApi.VariablesOf`. To type a fragment, compose the fragment into a throwaway query and read the result type from that query. The FragmentOf helper from gql.tada doesn't accept the branded string.
 *
 * @publicDocs
 */
export type StorefrontGqlForDocs =
  /**
   * @param source - The Storefront API query, mutation, or fragment source text.
   * @param fragments - The earlier `gql` fragments that the query source references.
   * @returns The source text with each unique fragment appended, typed as a Storefront API document.
   */
  (source: string, fragments?: readonly AnyStorefrontQueryString[]) => AnyStorefrontQueryString;
