import type { DocumentDecoration, initGraphQLTada as InitGraphQLTada } from "gql.tada";

import type { introspection } from "./generated/graphql-env";
import type { StorefrontScalars } from "./scalars";
import type { InferResult, InferVariables } from "./type-resolver";

type StorefrontTadaGql = InitGraphQLTada<{
  introspection: introspection;
  scalars: StorefrontScalars;
}>;

type StorefrontQueryMetadata<Source extends string = string> = {
  readonly __hydrogenQueryBrand: true;
  readonly __hydrogenQuerySource?: Source;
};

/**
 * A branded string that carries phantom Result and Variables types.
 *
 * Honest about being a `string` at runtime (unlike `TadaDocumentNode`
 * which claims to be an AST). Implements `DocumentDecoration` so
 * `ResultOf<>` and `VariablesOf<>` work on it.
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

/** Any `gql()`-branded string, regardless of inferred Result/Variables. Used in constraints that accept any Storefront document. */
export type AnyStorefrontQueryString = string & StorefrontQueryMetadata;

/** Extracts the literal source text from a `gql()`-branded document type. Resolves to `never` for unbranded strings. */
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
 * At runtime, returns the source string (concatenated with any fragments).
 * At the type level, the return type carries phantom `Result` and `Variables`
 * types inferred from the Storefront API schema via gql.tada.
 *
 * Pass an array of previously declared `gql()` fragments as the second
 * argument to compose documents while preserving full type inference.
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
 *   // result.data.product is typed as `{ title: string } | null`
 *   console.log(result.data.product?.title);
 * }
 * ```
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
