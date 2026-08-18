import type { GraphQLFormattedError, StorefrontClient } from "../../client";
import type { AnyStorefrontQueryString, StorefrontQueryString } from "../../graphql";
import type { ShopifyCountryCode, ShopifyLanguageCode } from "../request-context";
import {
  localizationQueries,
  type CreateLocalizationQueriesOptions,
  type LocalizationQueriesForOptions,
} from "./queries";

type LocalizationGraphqlResult<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer TResult, infer _Variables, string> ? TResult : never;

type LocalizationForQuery<TQuery extends AnyStorefrontQueryString> = NonNullable<
  LocalizationGraphqlResult<TQuery> extends { localization?: (infer TLocalization) | null }
    ? TLocalization
    : never
>;

export type LocalizationData = LocalizationForQuery<typeof localizationQueries.localization>;

export type LocalizationDataForQuery<TQuery extends AnyStorefrontQueryString> =
  LocalizationForQuery<TQuery>;

export type LocalizationDataForOptions<TOptions extends CreateLocalizationQueriesOptions> =
  LocalizationDataForQuery<LocalizationQueriesForOptions<TOptions>["localization"]>;

export type QueryLocalizationOptions<
  TQuery extends AnyStorefrontQueryString = typeof localizationQueries.localization,
> = {
  storefrontClient: Pick<StorefrontClient, "graphql">;
  query?: TQuery;
  /** Overrides the request context's `@inContext` country for translated fields. */
  country?: ShopifyCountryCode;
  /** Overrides the request context's `@inContext` language for translated fields. */
  language?: ShopifyLanguageCode;
  signal?: AbortSignal;
};

type FetchLocalizationResult<TQuery extends AnyStorefrontQueryString> = {
  data: LocalizationDataForQuery<TQuery>;
  headers: Headers;
};

type LocalizationQueryResult<TLocalization> = {
  data: { localization?: TLocalization | null } | null;
  errors?: GraphQLFormattedError[];
  headers: Headers;
};

type LocalizationVariables = {
  country?: ShopifyCountryCode;
  language?: ShopifyLanguageCode;
};

type LocalizationGraphql<TLocalization> = (
  query: AnyStorefrontQueryString,
  options: { variables?: LocalizationVariables; signal?: AbortSignal },
) => Promise<LocalizationQueryResult<TLocalization>>;

/**
 * Fetches the storefront's localization data (available countries, languages, active market).
 *
 * `$country`/`$language` are auto-injected from the request context's i18n by the storefront
 * client, so translated fields follow the active locale.
 */
export async function queryLocalization<
  const TQuery extends AnyStorefrontQueryString = typeof localizationQueries.localization,
>(options: QueryLocalizationOptions<TQuery>): Promise<LocalizationDataForQuery<TQuery>> {
  const result = await fetchLocalization(options);
  return result.data;
}

/** Like `queryLocalization`, but also exposes response headers for cache-forwarding callers. */
export async function fetchLocalization<
  const TQuery extends AnyStorefrontQueryString = typeof localizationQueries.localization,
>({
  storefrontClient,
  query,
  country,
  language,
  signal,
}: QueryLocalizationOptions<TQuery>): Promise<FetchLocalizationResult<TQuery>> {
  const document = query ?? localizationQueries.localization;
  const graphql = storefrontClient.graphql as LocalizationGraphql<LocalizationForQuery<TQuery>>;

  const variables: LocalizationVariables = {
    ...(country && { country }),
    ...(language && { language }),
  };
  const result = await graphql(document, {
    ...(Object.keys(variables).length > 0 && { variables }),
    ...(signal && { signal }),
  });

  if (result.errors) {
    throw new Error(`Shopify API errors: ${formatGraphQLErrors(result.errors)}`);
  }

  const localization = result.data?.localization;
  if (!localization) {
    throw new Error("No localization data returned from Shopify API");
  }

  return { data: localization, headers: result.headers };
}

function formatGraphQLErrors(errors: GraphQLFormattedError[]): string {
  return errors.map(({ message }) => message).join(", ");
}
