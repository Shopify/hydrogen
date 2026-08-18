import {
  gql,
  type AnyStorefrontQueryString,
  type ComposedSource,
  type SourceOf,
  type StorefrontQueryString,
} from "../../graphql";
import type { InferResult, InferVariables } from "../../graphql";

const COUNTRY_FRAGMENT_NAME = "LocalizationCountryFragment";
const LANGUAGE_FRAGMENT_NAME = "LocalizationLanguageFragment";

const COUNTRY_TYPE_NAME = "Country";
const LANGUAGE_TYPE_NAME = "Language";

type FragmentContract = {
  readonly label: string;
  readonly name: string;
  readonly typeName: string;
};

const COUNTRY_CONTRACT = {
  label: "country",
  name: COUNTRY_FRAGMENT_NAME,
  typeName: COUNTRY_TYPE_NAME,
} as const satisfies FragmentContract;

const LANGUAGE_CONTRACT = {
  label: "language",
  name: LANGUAGE_FRAGMENT_NAME,
  typeName: LANGUAGE_TYPE_NAME,
} as const satisfies FragmentContract;

const HYDROGEN_COUNTRY_FRAGMENT = gql(`
  fragment HydrogenLocalizationCountryFragment on Country {
    isoCode
    name
    currency {
      isoCode
      symbol
    }
    availableLanguages {
      isoCode
      endonymName
      name
    }
  }
`);

const HYDROGEN_LANGUAGE_FRAGMENT = gql(`
  fragment HydrogenLocalizationLanguageFragment on Language {
    isoCode
    endonymName
    name
  }
`);

// The consumer-overridable fragment spreads (e.g. LocalizationCountryFragment) are
// interpolated on purpose: those fragments only exist at runtime, and the gql.tada plugin
// skips documents containing interpolations instead of flagging unknown fragments, while
// TypeScript still resolves the full literal source type. The resolved fragments are
// composed in at runtime by `makeLocalizationQueries`.
const LOCALIZATION_QUERY = gql(
  `query Localization(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    localization {
      country {
        ...HydrogenLocalizationCountryFragment
        ...${COUNTRY_FRAGMENT_NAME}
      }
      language {
        ...HydrogenLocalizationLanguageFragment
        ...${LANGUAGE_FRAGMENT_NAME}
      }
      market {
        handle
      }
      availableCountries {
        ...HydrogenLocalizationCountryFragment
        ...${COUNTRY_FRAGMENT_NAME}
      }
    }
  }`,
  [HYDROGEN_COUNTRY_FRAGMENT, HYDROGEN_LANGUAGE_FRAGMENT],
);

const DEFAULT_COUNTRY_FRAGMENT = gql(`
  fragment LocalizationCountryFragment on Country {
    isoCode
  }
`);

const DEFAULT_LANGUAGE_FRAGMENT = gql(`
  fragment LocalizationLanguageFragment on Language {
    isoCode
  }
`);

export type LocalizationFragments = {
  readonly country?: AnyStorefrontQueryString;
  readonly language?: AnyStorefrontQueryString;
};

export type CreateLocalizationQueriesOptions<
  TFragments extends LocalizationFragments = LocalizationFragments,
> = {
  readonly fragments?: TFragments;
};

type FragmentForOptions<
  TOptions,
  TKey extends keyof LocalizationFragments,
  TDefault extends AnyStorefrontQueryString,
> = TOptions extends { readonly fragments: infer TFragments }
  ? TFragments extends Record<TKey, infer TFragment extends AnyStorefrontQueryString>
    ? TFragment
    : TDefault
  : TDefault;

type LocalizationQueryFragmentsForOptions<TOptions> = [
  FragmentForOptions<TOptions, "country", typeof DEFAULT_COUNTRY_FRAGMENT>,
  FragmentForOptions<TOptions, "language", typeof DEFAULT_LANGUAGE_FRAGMENT>,
];

type LocalizationQuerySourceForOptions<TOptions> = ComposedSource<
  SourceOf<typeof LOCALIZATION_QUERY>,
  LocalizationQueryFragmentsForOptions<TOptions>
>;

type LocalizationQueryForOptions<TOptions> = StorefrontQueryString<
  InferResult<LocalizationQuerySourceForOptions<TOptions>>,
  InferVariables<LocalizationQuerySourceForOptions<TOptions>>,
  LocalizationQuerySourceForOptions<TOptions>
>;

export type LocalizationQueriesForOptions<TOptions> = {
  readonly localization: LocalizationQueryForOptions<TOptions>;
};

function assertFragmentContract(fragment: string, contract: FragmentContract): void {
  const pattern = new RegExp(`fragment\\s+${contract.name}\\s+on\\s+${contract.typeName}\\b`);
  if (pattern.test(fragment)) return;

  throw new Error(
    `Localization ${contract.label} fragment must be named ${contract.name} and target ${contract.typeName}`,
  );
}

function resolveFragments(fragments: LocalizationFragments | undefined) {
  if (fragments?.country) assertFragmentContract(fragments.country, COUNTRY_CONTRACT);
  if (fragments?.language) assertFragmentContract(fragments.language, LANGUAGE_CONTRACT);

  return [
    fragments?.country ?? DEFAULT_COUNTRY_FRAGMENT,
    fragments?.language ?? DEFAULT_LANGUAGE_FRAGMENT,
  ] as const;
}

export function makeLocalizationQueries<const TOptions extends CreateLocalizationQueriesOptions>(
  options: TOptions,
): LocalizationQueriesForOptions<TOptions>;
export function makeLocalizationQueries(): LocalizationQueriesForOptions<undefined>;
export function makeLocalizationQueries(options?: CreateLocalizationQueriesOptions) {
  return {
    localization: gql(LOCALIZATION_QUERY, resolveFragments(options?.fragments)),
  } as LocalizationQueriesForOptions<typeof options>;
}

export const localizationQueries = makeLocalizationQueries();
