import type { StorefrontClient } from "../../client";
import { getCartIdFromCookie } from "../cart/cookie";
import { cartBuyerIdentityUpdateMutation } from "../cart/queries";
import { getLogger } from "../logging";
import type { ShopifyCountryCode, ShopifyLanguageCode } from "../request-context";
import { createProxyResponseHeaders } from "../request-routing/interceptors/proxy";
import type {
  CallableRouteHandler,
  ShopifyRouteError,
  ShopifyRouteErrorResult,
  ShopifyRouteJsonResult,
  ShopifyRouteRedirectResult,
  ShopifyRouteSessionManager,
} from "../request-routing/registered-routes";
import { createCallableRouteHandler } from "../request-routing/registered-routes";
import {
  DEFAULT_LOCALIZATION_CACHE_CONTROL,
  LOCALIZATION_API_PATH,
  LOCALIZATION_COUNTRY_FIELD,
  LOCALIZATION_GET_METHOD,
  LOCALIZATION_LANGUAGE_FIELD,
  LOCALIZATION_POST_METHOD,
  LOCALIZATION_REDIRECT_TO_FIELD,
  LOCALIZATION_SESSION_KEY,
} from "./constants";
import {
  fetchLocalization,
  getSupportedCountries,
  groupLanguagesByCountry,
  type LocalizationDataForOptions,
} from "./get-localization";
import type { MatchedLocale, SupportedLocale } from "./locale-matching";
import {
  getLocalePathPrefix,
  getLocalizedPath,
  isSameLocale,
  isShopifyCountryCode,
  isShopifyLanguageCode,
  matchLocalePathname,
} from "./locale-matching";
import {
  localizationQueries,
  makeLocalizationQueries,
  type CreateLocalizationQueriesOptions,
  type LocalizationQueriesForOptions,
} from "./queries";

const log = getLogger("localization");

const LOCALIZATION_REQUEST_FAILED_STATUS = 500;

export type LocalizationErrorCode = "invalid_localization_request" | "localization_request_failed";
export type LocalizationError = ShopifyRouteError & {
  code: LocalizationErrorCode;
};

export type LocalizationGetData<TData = LocalizationDataForOptions<{}>> = Pick<
  TData & LocalizationPayloadShape,
  "availableCountries" | "market"
>;

export type LocalizationGetResult<TData = LocalizationDataForOptions<{}>> =
  | ShopifyRouteJsonResult<LocalizationGetData<TData>>
  | ShopifyRouteErrorResult<LocalizationError>;

export type LocalizationPostResult =
  | ShopifyRouteRedirectResult
  | ShopifyRouteErrorResult<LocalizationError>;

type LocalizationGetHandlerContext = {
  request: Request;
  storefrontClient: Pick<StorefrontClient, "graphql">;
};

type LocalizationPostHandlerContext = LocalizationGetHandlerContext & {
  /**
   * The endpoint lives at an unprefixed path, so its resolved i18n *is* the app's default
   * locale — no separate defaultLocale option is needed.
   */
  requestContext: { i18n: SupportedLocale };
  sessionManager: ShopifyRouteSessionManager;
};

type LocalizationGetHandler<TData> = CallableRouteHandler<
  LocalizationGetHandlerContext,
  LocalizationGetResult<TData>,
  string,
  typeof LOCALIZATION_GET_METHOD
>;

type LocalizationPostHandler = CallableRouteHandler<
  LocalizationPostHandlerContext,
  LocalizationPostResult,
  string,
  typeof LOCALIZATION_POST_METHOD
>;

type LocalizationServerHandlers<
  TOptions extends CreateLocalizationServerHandlersOptions = {},
  TData = LocalizationDataForOptions<TOptions>,
> = {
  get: LocalizationGetHandler<TData>;
  post: LocalizationPostHandler;
};

export type CreateLocalizationServerHandlersOptions = CreateLocalizationQueriesOptions & {
  path?: string;
  /** Cache-Control for the GET endpoint. Defaults to `DEFAULT_LOCALIZATION_CACHE_CONTROL`. */
  cacheControl?: string;
  /** Same list passed to `matchLocaleFromRequest` (strict mode); omit for permissive mode. */
  supportedLocales?: readonly SupportedLocale[];
};

export function createLocalizationServerHandlers(): LocalizationServerHandlers;
export function createLocalizationServerHandlers<
  const TOptions extends CreateLocalizationServerHandlersOptions,
>(options: TOptions): LocalizationServerHandlers<TOptions>;
export function createLocalizationServerHandlers(
  options: CreateLocalizationServerHandlersOptions = {},
): LocalizationServerHandlers<CreateLocalizationServerHandlersOptions> {
  const queries = options.fragments ? makeLocalizationQueries(options) : localizationQueries;
  const path = options.path ?? LOCALIZATION_API_PATH;

  return {
    get: createCallableRouteHandler(
      path,
      LOCALIZATION_GET_METHOD,
      (context: LocalizationGetHandlerContext) => handleGet(context, options, queries),
    ),
    post: createCallableRouteHandler(
      path,
      LOCALIZATION_POST_METHOD,
      (context: LocalizationPostHandlerContext) => handlePost(context, options, queries),
    ),
  } as LocalizationServerHandlers<CreateLocalizationServerHandlersOptions>;
}

/**
 * Structural view of the localization payload; the Hydrogen fragments guarantee these fields
 * regardless of consumer fragment overrides.
 */
type LocalizationPayloadShape = {
  availableCountries: LiveCountry[];
  market: unknown;
};

type LiveLanguage = { isoCode: string };
type LiveCountry = { isoCode: string; availableLanguages: LiveLanguage[] };

async function handleGet(
  context: LocalizationGetHandlerContext,
  options: CreateLocalizationServerHandlersOptions,
  queries: LocalizationQueriesForOptions<CreateLocalizationServerHandlersOptions>,
): Promise<LocalizationGetResult> {
  let localeParams: LocaleQueryParams;
  try {
    localeParams = parseLocaleQueryParams(context.request);
  } catch (error) {
    return invalidRequestResult(getErrorMessage(error, "Invalid localization request"));
  }

  try {
    const result = await fetchLocalization({
      storefrontClient: context.storefrontClient,
      query: queries.localization,
      ...localeParams,
    });
    const data = result.data as LocalizationPayloadShape;

    const headers = createProxyResponseHeaders(result.headers);
    headers.set("cache-control", options.cacheControl ?? DEFAULT_LOCALIZATION_CACHE_CONTROL);

    return {
      type: "json",
      data: {
        availableCountries: filterSupportedCountries(
          data.availableCountries,
          options.supportedLocales,
        ),
        market: data.market,
      } as LocalizationGetData,
      headers,
    };
  } catch (error) {
    return requestFailedResult(getErrorMessage(error, "Localization request failed"));
  }
}

type LocaleQueryParams = {
  country?: ShopifyCountryCode;
  language?: ShopifyLanguageCode;
};

function parseLocaleQueryParams(request: Request): LocaleQueryParams {
  const searchParams = new URL(request.url).searchParams;
  return {
    country: parseCountryCode(searchParams.get(LOCALIZATION_COUNTRY_FIELD)),
    language: parseLanguageCode(searchParams.get(LOCALIZATION_LANGUAGE_FIELD)),
  };
}

function parseCountryCode(value: string | null): ShopifyCountryCode | undefined {
  if (!value) return undefined;
  const code = value.toUpperCase();
  if (!isShopifyCountryCode(code)) throw new Error(`Invalid country value "${value}".`);
  return code;
}

function parseLanguageCode(value: string | null): ShopifyLanguageCode | undefined {
  if (!value) return undefined;
  const code = value.toUpperCase();
  if (!isShopifyLanguageCode(code)) throw new Error(`Invalid language value "${value}".`);
  return code;
}

/**
 * Applies the shared `getSupportedCountries` intersection, warning when the merchant's Markets
 * config has grown beyond the configured list (drift detection).
 */
function filterSupportedCountries(
  liveCountries: LiveCountry[],
  supportedLocales: readonly SupportedLocale[] | undefined,
): LiveCountry[] {
  if (!supportedLocales) return liveCountries;

  const supportedLanguagesByCountry = groupLanguagesByCountry(supportedLocales);
  const driftedCountries = liveCountries
    .map((country) => country.isoCode)
    .filter((isoCode) => !supportedLanguagesByCountry.has(isoCode));
  if (driftedCountries.length > 0) {
    log.warn("live markets data includes locales missing from supportedLocales", {
      countries: driftedCountries,
    });
  }

  return getSupportedCountries(liveCountries, supportedLocales);
}

class LocalizationValidationError extends Error {}

type LocalizationSubmission = {
  country: ShopifyCountryCode;
  language: ShopifyLanguageCode | undefined;
  redirectTo: string | null;
};

async function handlePost(
  context: LocalizationPostHandlerContext,
  options: CreateLocalizationServerHandlersOptions,
  queries: LocalizationQueriesForOptions<CreateLocalizationServerHandlersOptions>,
): Promise<LocalizationPostResult> {
  let submission: LocalizationSubmission;
  try {
    submission = await parseLocalizationSubmission(context.request);
  } catch (error) {
    return invalidRequestResult(getErrorMessage(error, "Invalid localization request"));
  }

  const defaultLocale: SupportedLocale = {
    country: context.requestContext.i18n.country,
    language: context.requestContext.i18n.language,
  };
  const redirectPath = sanitizeRedirectPath(submission.redirectTo, context.request.url);
  const sourceLocale = matchLocalePathname(redirectPath, {
    defaultLocale,
    ...(options.supportedLocales && { supportedLocales: options.supportedLocales }),
  });

  let targetLocale: SupportedLocale;
  try {
    targetLocale = await resolveTargetLocale(submission, sourceLocale, context, options, queries);
  } catch (error) {
    if (error instanceof LocalizationValidationError) return invalidRequestResult(error.message);
    return requestFailedResult(getErrorMessage(error, "Localization request failed"));
  }

  await syncCartBuyerIdentity(context, targetLocale.country);
  const sessionHeaders = await persistLocaleSelection(context.sessionManager, targetLocale);

  return {
    type: "redirect",
    location: buildRedirectLocation(redirectPath, sourceLocale, targetLocale, defaultLocale),
    ...(sessionHeaders && { headers: sessionHeaders }),
  };
}

async function parseLocalizationSubmission(request: Request): Promise<LocalizationSubmission> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new Error("Request body must be form data.");
  }

  const rawCountry = getFormField(formData, LOCALIZATION_COUNTRY_FIELD);
  if (!rawCountry) throw new Error(`Missing required "${LOCALIZATION_COUNTRY_FIELD}" field.`);

  const rawLanguage = getFormField(formData, LOCALIZATION_LANGUAGE_FIELD);

  return {
    country: requireCountryCode(rawCountry),
    language: rawLanguage ? requireLanguageCode(rawLanguage) : undefined,
    redirectTo: getFormField(formData, LOCALIZATION_REDIRECT_TO_FIELD),
  };
}

function getFormField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value !== "" ? value : null;
}

function requireCountryCode(value: string): ShopifyCountryCode {
  const code = value.toUpperCase();
  if (!isShopifyCountryCode(code)) {
    throw new Error(`Invalid country value "${value}".`);
  }
  return code;
}

function requireLanguageCode(value: string): ShopifyLanguageCode {
  const code = value.toUpperCase();
  if (!isShopifyLanguageCode(code)) {
    throw new Error(`Invalid language value "${value}".`);
  }
  return code;
}

/** Restricts redirect targets to same-origin paths; anything else falls back to the root. */
function sanitizeRedirectPath(redirectTo: string | null, requestUrl: string): string {
  if (!redirectTo) return "/";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(redirectTo, requestUrl);
  } catch {
    return "/";
  }
  if (parsedUrl.origin !== new URL(requestUrl).origin) return "/";

  return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
}

/** Validates the submission against live Markets data (∩ supportedLocales when configured). */
async function resolveTargetLocale(
  submission: LocalizationSubmission,
  sourceLocale: MatchedLocale,
  context: LocalizationPostHandlerContext,
  options: CreateLocalizationServerHandlersOptions,
  queries: LocalizationQueriesForOptions<CreateLocalizationServerHandlersOptions>,
): Promise<SupportedLocale> {
  const result = await fetchLocalization({
    storefrontClient: context.storefrontClient,
    query: queries.localization,
  });
  const { availableCountries } = result.data as LocalizationPayloadShape;

  const liveCountry = availableCountries.find(({ isoCode }) => isoCode === submission.country);
  if (!liveCountry) {
    throw new LocalizationValidationError(`Country "${submission.country}" is not available.`);
  }

  const supportedLanguages = supportedLanguagesFor(submission.country, options.supportedLocales);
  if (supportedLanguages?.size === 0) {
    throw new LocalizationValidationError(`Country "${submission.country}" is not supported.`);
  }

  const language = resolveTargetLanguage(submission, sourceLocale, liveCountry, supportedLanguages);
  return { country: submission.country, language };
}

/** `undefined` means unrestricted (permissive mode); an empty set means the country is excluded. */
function supportedLanguagesFor(
  country: ShopifyCountryCode,
  supportedLocales: readonly SupportedLocale[] | undefined,
): Set<string> | undefined {
  if (!supportedLocales) return undefined;
  return groupLanguagesByCountry(supportedLocales).get(country) ?? new Set();
}

function resolveTargetLanguage(
  submission: LocalizationSubmission,
  sourceLocale: MatchedLocale,
  liveCountry: LiveCountry,
  supportedLanguages: Set<string> | undefined,
): ShopifyLanguageCode {
  const liveLanguages = liveCountry.availableLanguages.map(({ isoCode }) => isoCode);
  const isEligible = (language: string) =>
    (liveLanguages.length === 0 || liveLanguages.includes(language)) &&
    (!supportedLanguages || supportedLanguages.has(language));

  if (submission.language) {
    if (!isEligible(submission.language)) {
      throw new LocalizationValidationError(
        `Language "${submission.language}" is not available for country "${submission.country}".`,
      );
    }
    return submission.language;
  }

  // Keep the buyer's current language when the target country offers it; otherwise take the
  // country's first eligible language. Both lists exhausted only in degenerate single-locale
  // setups (e.g. mock.shop), where keeping the current language is the least surprising choice.
  const candidates = [sourceLocale.language, ...liveLanguages];
  const eligibleLanguage = candidates.find((language) => isEligible(language));
  return (eligibleLanguage ?? sourceLocale.language) as ShopifyLanguageCode;
}

/** Cart currency follows the buyer's country. Failure is soft: the redirect proceeds. */
async function syncCartBuyerIdentity(
  context: LocalizationPostHandlerContext,
  countryCode: ShopifyCountryCode,
): Promise<void> {
  const cartId = getCartIdFromCookie(context.request);
  if (!cartId) return;

  try {
    const result = await context.storefrontClient.graphql(cartBuyerIdentityUpdateMutation, {
      variables: { cartId, buyerIdentity: { countryCode } },
    });
    const userErrors = result.data?.cartBuyerIdentityUpdate?.userErrors ?? [];
    if (result.errors?.length || userErrors.length > 0) {
      throw new Error(
        [...(result.errors ?? []), ...userErrors].map(({ message }) => message).join(", "),
      );
    }
  } catch (error) {
    log.error("cart buyer identity locale sync failed", { error });
  }
}

/** Session write failure is soft: persistence degrades, the redirect proceeds. */
async function persistLocaleSelection(
  sessionManager: ShopifyRouteSessionManager,
  locale: SupportedLocale,
): Promise<HeadersInit | undefined> {
  try {
    await sessionManager.setSessionItem(LOCALIZATION_SESSION_KEY, {
      country: locale.country,
      language: locale.language,
    });
    return (await sessionManager.commit?.()) ?? undefined;
  } catch (error) {
    log.error("locale session write failed", { error });
    return undefined;
  }
}

function buildRedirectLocation(
  redirectPath: string,
  sourceLocale: MatchedLocale,
  targetLocale: SupportedLocale,
  defaultLocale: SupportedLocale,
): string {
  const targetPathPrefix = isSameLocale(targetLocale, defaultLocale)
    ? ""
    : getLocalePathPrefix(targetLocale);

  return getLocalizedPath(redirectPath, {
    fromPathPrefix: sourceLocale.pathPrefix,
    toPathPrefix: targetPathPrefix,
  });
}

function invalidRequestResult(message: string): ShopifyRouteErrorResult<LocalizationError> {
  return {
    type: "error",
    error: { code: "invalid_localization_request", message },
  };
}

function requestFailedResult(message: string): ShopifyRouteErrorResult<LocalizationError> {
  return {
    type: "error",
    error: { code: "localization_request_failed", message },
    status: LOCALIZATION_REQUEST_FAILED_STATUS,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
