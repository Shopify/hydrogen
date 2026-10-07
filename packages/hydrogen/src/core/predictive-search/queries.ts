import {
  gql,
  type AnyStorefrontQueryString,
  type ComposedSource,
  type SourceOf,
  type StorefrontQueryString,
} from "../../graphql";
import type { InferResult, InferVariables } from "../../graphql";

const PRODUCT_FRAGMENT_NAME = "PredictiveSearchProductFragment";
const COLLECTION_FRAGMENT_NAME = "PredictiveSearchCollectionFragment";
const PAGE_FRAGMENT_NAME = "PredictiveSearchPageFragment";
const ARTICLE_FRAGMENT_NAME = "PredictiveSearchArticleFragment";
const QUERY_FRAGMENT_NAME = "PredictiveSearchQueryFragment";

const PRODUCT_TYPE_NAME = "Product";
const COLLECTION_TYPE_NAME = "Collection";
const PAGE_TYPE_NAME = "Page";
const ARTICLE_TYPE_NAME = "Article";
const QUERY_TYPE_NAME = "SearchQuerySuggestion";

type FragmentContract = {
  readonly label: string;
  readonly name: string;
  readonly typeName: string;
};

const PRODUCT_CONTRACT = {
  label: "product",
  name: PRODUCT_FRAGMENT_NAME,
  typeName: PRODUCT_TYPE_NAME,
} as const satisfies FragmentContract;

const COLLECTION_CONTRACT = {
  label: "collection",
  name: COLLECTION_FRAGMENT_NAME,
  typeName: COLLECTION_TYPE_NAME,
} as const satisfies FragmentContract;

const PAGE_CONTRACT = {
  label: "page",
  name: PAGE_FRAGMENT_NAME,
  typeName: PAGE_TYPE_NAME,
} as const satisfies FragmentContract;

const ARTICLE_CONTRACT = {
  label: "article",
  name: ARTICLE_FRAGMENT_NAME,
  typeName: ARTICLE_TYPE_NAME,
} as const satisfies FragmentContract;

const QUERY_CONTRACT = {
  label: "query",
  name: QUERY_FRAGMENT_NAME,
  typeName: QUERY_TYPE_NAME,
} as const satisfies FragmentContract;

const HYDROGEN_PRODUCT_FRAGMENT = gql(`
  fragment HydrogenPredictiveSearchProductFragment on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
`);

const HYDROGEN_COLLECTION_FRAGMENT = gql(`
  fragment HydrogenPredictiveSearchCollectionFragment on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
`);

const HYDROGEN_PAGE_FRAGMENT = gql(`
  fragment HydrogenPredictiveSearchPageFragment on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
`);

const HYDROGEN_ARTICLE_FRAGMENT = gql(`
  fragment HydrogenPredictiveSearchArticleFragment on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
`);

const HYDROGEN_QUERY_FRAGMENT = gql(`
  fragment HydrogenPredictiveSearchQueryFragment on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
`);

// The consumer-overridable fragment spreads (e.g. PredictiveSearchProductFragment)
// are interpolated on purpose: those fragments only exist at runtime, and the
// gql.tada plugin skips documents containing interpolations instead of flagging
// unknown fragments, while TypeScript still resolves the full literal source type.
// The resolved fragments are composed in at runtime by `makePredictiveSearchQueries`.
const PREDICTIVE_SEARCH_QUERY = gql(
  `query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int
    $limitScope: PredictiveSearchLimitScope
    $term: String!
    $types: [PredictiveSearchType!]
    $searchableFields: [SearchableField!]
    $unavailableProducts: SearchUnavailableProductsType
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit
      limitScope: $limitScope
      query: $term
      types: $types
      searchableFields: $searchableFields
      unavailableProducts: $unavailableProducts
    ) {
      articles {
        ...HydrogenPredictiveSearchArticleFragment
        ...${ARTICLE_FRAGMENT_NAME}
      }
      collections {
        ...HydrogenPredictiveSearchCollectionFragment
        ...${COLLECTION_FRAGMENT_NAME}
      }
      pages {
        ...HydrogenPredictiveSearchPageFragment
        ...${PAGE_FRAGMENT_NAME}
      }
      products {
        ...HydrogenPredictiveSearchProductFragment
        ...${PRODUCT_FRAGMENT_NAME}
      }
      queries {
        ...HydrogenPredictiveSearchQueryFragment
        ...${QUERY_FRAGMENT_NAME}
      }
    }
  }`,
  [
    HYDROGEN_PRODUCT_FRAGMENT,
    HYDROGEN_COLLECTION_FRAGMENT,
    HYDROGEN_PAGE_FRAGMENT,
    HYDROGEN_ARTICLE_FRAGMENT,
    HYDROGEN_QUERY_FRAGMENT,
  ],
);

const DEFAULT_PRODUCT_FRAGMENT = gql(`
  fragment PredictiveSearchProductFragment on Product {
    id
  }
`);

const DEFAULT_COLLECTION_FRAGMENT = gql(`
  fragment PredictiveSearchCollectionFragment on Collection {
    id
  }
`);

const DEFAULT_PAGE_FRAGMENT = gql(`
  fragment PredictiveSearchPageFragment on Page {
    id
  }
`);

const DEFAULT_ARTICLE_FRAGMENT = gql(`
  fragment PredictiveSearchArticleFragment on Article {
    id
  }
`);

const DEFAULT_QUERY_FRAGMENT = gql(`
  fragment PredictiveSearchQueryFragment on SearchQuerySuggestion {
    text
  }
`);

/**
 * GraphQL fragments that add fields to each predictive search result type.
 *
 * Each fragment must use its required name and type. Otherwise, creating the queries throws.
 * The query keeps Hydrogen's own fields for URLs, tracking, and display, and adds the fields from each custom fragment.
 */
export type PredictiveSearchFragments = {
  /** Fragment for product results. Declare the fragment as `fragment PredictiveSearchProductFragment on Product`. */
  readonly product?: AnyStorefrontQueryString;
  /** Fragment for collection results. Declare the fragment as `fragment PredictiveSearchCollectionFragment on Collection`. */
  readonly collection?: AnyStorefrontQueryString;
  /** Fragment for page results. Declare the fragment as `fragment PredictiveSearchPageFragment on Page`. */
  readonly page?: AnyStorefrontQueryString;
  /** Fragment for article results. Declare the fragment as `fragment PredictiveSearchArticleFragment on Article`. */
  readonly article?: AnyStorefrontQueryString;
  /** Fragment for query suggestions. Declare the fragment as `fragment PredictiveSearchQueryFragment on SearchQuerySuggestion`. */
  readonly query?: AnyStorefrontQueryString;
};

/** Options for the predictive search query document. */
export type CreatePredictiveSearchQueriesOptions<
  TFragments extends PredictiveSearchFragments = PredictiveSearchFragments,
> = {
  /** Fragments that add fields to each result type. The query always keeps Hydrogen's built-in fields. */
  readonly fragments?: TFragments;
};

type FragmentForOptions<
  TOptions,
  TKey extends keyof PredictiveSearchFragments,
  TDefault extends AnyStorefrontQueryString,
> = TOptions extends { readonly fragments: infer TFragments }
  ? TFragments extends Record<TKey, infer TFragment extends AnyStorefrontQueryString>
    ? TFragment
    : TDefault
  : TDefault;

type PredictiveSearchQueryFragmentsForOptions<TOptions> = [
  FragmentForOptions<TOptions, "product", typeof DEFAULT_PRODUCT_FRAGMENT>,
  FragmentForOptions<TOptions, "collection", typeof DEFAULT_COLLECTION_FRAGMENT>,
  FragmentForOptions<TOptions, "page", typeof DEFAULT_PAGE_FRAGMENT>,
  FragmentForOptions<TOptions, "article", typeof DEFAULT_ARTICLE_FRAGMENT>,
  FragmentForOptions<TOptions, "query", typeof DEFAULT_QUERY_FRAGMENT>,
];

type PredictiveSearchQuerySourceForOptions<TOptions> = ComposedSource<
  SourceOf<typeof PREDICTIVE_SEARCH_QUERY>,
  PredictiveSearchQueryFragmentsForOptions<TOptions>
>;

/** Query document type for a set of query options. TypeScript infers the result and variable types from the custom fragments. */
type PredictiveSearchQueryForOptions<TOptions> = StorefrontQueryString<
  InferResult<PredictiveSearchQuerySourceForOptions<TOptions>>,
  InferVariables<PredictiveSearchQuerySourceForOptions<TOptions>>,
  PredictiveSearchQuerySourceForOptions<TOptions>
>;

/** Query object type for a set of query options. The type keeps the inferred types from the custom fragments. */
export type PredictiveSearchQueriesForOptions<TOptions> = {
  readonly predictiveSearch: PredictiveSearchQueryForOptions<TOptions>;
};

function assertFragmentContract(fragment: string, contract: FragmentContract): void {
  const pattern = new RegExp(`fragment\\s+${contract.name}\\s+on\\s+${contract.typeName}\\b`);
  if (pattern.test(fragment)) return;

  throw new Error(
    `Predictive search ${contract.label} fragment must be named ${contract.name} and target ${contract.typeName}`,
  );
}

function resolveFragments(fragments: PredictiveSearchFragments | undefined) {
  if (fragments?.product) assertFragmentContract(fragments.product, PRODUCT_CONTRACT);
  if (fragments?.collection) assertFragmentContract(fragments.collection, COLLECTION_CONTRACT);
  if (fragments?.page) assertFragmentContract(fragments.page, PAGE_CONTRACT);
  if (fragments?.article) assertFragmentContract(fragments.article, ARTICLE_CONTRACT);
  if (fragments?.query) assertFragmentContract(fragments.query, QUERY_CONTRACT);

  return [
    fragments?.product ?? DEFAULT_PRODUCT_FRAGMENT,
    fragments?.collection ?? DEFAULT_COLLECTION_FRAGMENT,
    fragments?.page ?? DEFAULT_PAGE_FRAGMENT,
    fragments?.article ?? DEFAULT_ARTICLE_FRAGMENT,
    fragments?.query ?? DEFAULT_QUERY_FRAGMENT,
  ] as const;
}

/**
 * Builds the predictive search query document with your custom fragments.
 *
 * TypeScript infers the query's result type from the fragments that you pass.
 * The function throws when a custom fragment doesn't use its required name and target type.
 *
 * @throws {Error} When a custom fragment does not match its required name or target type.
 * @publicDocs
 */
export function makePredictiveSearchQueries<
  const TOptions extends CreatePredictiveSearchQueriesOptions,
>(options: TOptions): PredictiveSearchQueriesForOptions<TOptions>;
export function makePredictiveSearchQueries(): PredictiveSearchQueriesForOptions<undefined>;
/**
 * @param options The custom fragments that add fields to each result type.
 * @returns An object that holds the composed query under `predictiveSearch`.
 */
export function makePredictiveSearchQueries(options?: CreatePredictiveSearchQueriesOptions) {
  return {
    predictiveSearch: gql(PREDICTIVE_SEARCH_QUERY, resolveFragments(options?.fragments)),
  } as PredictiveSearchQueriesForOptions<typeof options>;
}

/**
 * Default query object that Hydrogen builds from its default fragments.
 * The query function uses the object when you omit the `query` option.
 *
 * Build custom query documents with makePredictiveSearchQueries.
 */
export const predictiveSearchQueries = makePredictiveSearchQueries();
