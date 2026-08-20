/** Session key under which the POST handler stores the buyer's `{country, language}` selection. */
export const LOCALIZATION_SESSION_KEY = "localization";

/** Default endpoint path for the localization server handlers. */
export const LOCALIZATION_API_PATH = "/localization";

export const LOCALIZATION_GET_METHOD = "GET";
export const LOCALIZATION_POST_METHOD = "POST";

/** Form field / query param names shared by the handlers and the form register. */
export const LOCALIZATION_COUNTRY_FIELD = "country";
export const LOCALIZATION_LANGUAGE_FIELD = "language";
export const LOCALIZATION_REDIRECT_TO_FIELD = "redirectTo";

/**
 * Default cache policy for the GET endpoint. Merchants changing Markets config may see up to
 * an hour of staleness; configurable via `createLocalizationServerHandlers({cacheControl})`.
 */
export const DEFAULT_LOCALIZATION_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";
