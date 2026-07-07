import {
  gql,
  type AnyStorefrontQueryString,
  type ComposedSource,
  type StorefrontQueryString,
} from "../../graphql";
import type { InferResult, InferVariables } from "../../graphql";

const HYDROGEN_PRODUCT_FRAGMENT_NAME = "HydrogenPredictiveSearchProductFragment";
const HYDROGEN_COLLECTION_FRAGMENT_NAME = "HydrogenPredictiveSearchCollectionFragment";
const HYDROGEN_PAGE_FRAGMENT_NAME = "HydrogenPredictiveSearchPageFragment";
const HYDROGEN_ARTICLE_FRAGMENT_NAME = "HydrogenPredictiveSearchArticleFragment";
const HYDROGEN_QUERY_FRAGMENT_NAME = "HydrogenPredictiveSearchQueryFragment";

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

const PREDICTIVE_SEARCH_QUERY_SOURCE = `
  query PredictiveSearch(
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
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
      searchableFields: $searchableFields,
      unavailableProducts: $unavailableProducts,
    ) {
      articles {
        ...${HYDROGEN_ARTICLE_FRAGMENT_NAME}
        ...${ARTICLE_FRAGMENT_NAME}
      }
      collections {
        ...${HYDROGEN_COLLECTION_FRAGMENT_NAME}
        ...${COLLECTION_FRAGMENT_NAME}
      }
      pages {
        ...${HYDROGEN_PAGE_FRAGMENT_NAME}
        ...${PAGE_FRAGMENT_NAME}
      }
      products {
        ...${HYDROGEN_PRODUCT_FRAGMENT_NAME}
        ...${PRODUCT_FRAGMENT_NAME}
      }
      queries {
        ...${HYDROGEN_QUERY_FRAGMENT_NAME}
        ...${QUERY_FRAGMENT_NAME}
      }
    }
  }
` as const;

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

export type PredictiveSearchFragments = {
  readonly product?: AnyStorefrontQueryString;
  readonly collection?: AnyStorefrontQueryString;
  readonly page?: AnyStorefrontQueryString;
  readonly article?: AnyStorefrontQueryString;
  readonly query?: AnyStorefrontQueryString;
};

export type CreatePredictiveSearchQueriesOptions<
  TFragments extends PredictiveSearchFragments = PredictiveSearchFragments,
> = {
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
  typeof HYDROGEN_PRODUCT_FRAGMENT,
  typeof HYDROGEN_COLLECTION_FRAGMENT,
  typeof HYDROGEN_PAGE_FRAGMENT,
  typeof HYDROGEN_ARTICLE_FRAGMENT,
  typeof HYDROGEN_QUERY_FRAGMENT,
  FragmentForOptions<TOptions, "product", typeof DEFAULT_PRODUCT_FRAGMENT>,
  FragmentForOptions<TOptions, "collection", typeof DEFAULT_COLLECTION_FRAGMENT>,
  FragmentForOptions<TOptions, "page", typeof DEFAULT_PAGE_FRAGMENT>,
  FragmentForOptions<TOptions, "article", typeof DEFAULT_ARTICLE_FRAGMENT>,
  FragmentForOptions<TOptions, "query", typeof DEFAULT_QUERY_FRAGMENT>,
];

type PredictiveSearchQuerySourceForOptions<TOptions> = ComposedSource<
  typeof PREDICTIVE_SEARCH_QUERY_SOURCE,
  PredictiveSearchQueryFragmentsForOptions<TOptions>
>;

type PredictiveSearchQueryForOptions<TOptions> = StorefrontQueryString<
  InferResult<PredictiveSearchQuerySourceForOptions<TOptions>>,
  InferVariables<PredictiveSearchQuerySourceForOptions<TOptions>>,
  PredictiveSearchQuerySourceForOptions<TOptions>
>;

export type PredictiveSearchQueriesForOptions<TOptions> = {
  readonly predictiveSearch: PredictiveSearchQueryForOptions<TOptions>;
};

function assertFragmentContract(fragment: string, contract: FragmentContract): void {
  const pattern = new RegExp(`fragment\\s+${contract.name}\\s+on\\s+${contract.typeName}`);
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
    HYDROGEN_PRODUCT_FRAGMENT,
    HYDROGEN_COLLECTION_FRAGMENT,
    HYDROGEN_PAGE_FRAGMENT,
    HYDROGEN_ARTICLE_FRAGMENT,
    HYDROGEN_QUERY_FRAGMENT,
    fragments?.product ?? DEFAULT_PRODUCT_FRAGMENT,
    fragments?.collection ?? DEFAULT_COLLECTION_FRAGMENT,
    fragments?.page ?? DEFAULT_PAGE_FRAGMENT,
    fragments?.article ?? DEFAULT_ARTICLE_FRAGMENT,
    fragments?.query ?? DEFAULT_QUERY_FRAGMENT,
  ] as const;
}

export function makePredictiveSearchQueries<
  const TOptions extends CreatePredictiveSearchQueriesOptions,
>(options: TOptions): PredictiveSearchQueriesForOptions<TOptions>;
export function makePredictiveSearchQueries(): PredictiveSearchQueriesForOptions<undefined>;
export function makePredictiveSearchQueries(options?: CreatePredictiveSearchQueriesOptions) {
  return {
    predictiveSearch: gql(PREDICTIVE_SEARCH_QUERY_SOURCE, resolveFragments(options?.fragments)),
  } as PredictiveSearchQueriesForOptions<typeof options>;
}

export const predictiveSearchQueries = makePredictiveSearchQueries();
