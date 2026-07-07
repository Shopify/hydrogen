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

export type AnyStorefrontQueryString = string & StorefrontQueryMetadata;

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

export type ComposedSource<
  Source extends string,
  Fragments extends readonly AnyStorefrontQueryString[],
> = FragmentSources<Fragments> extends "" ? Source : `${Source}\n${FragmentSources<Fragments>}`;

type StorefrontGql = {
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
