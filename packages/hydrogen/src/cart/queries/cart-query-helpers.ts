/**
 * Helper functions for building cart GraphQL operations with conditional
 * @inContext directive support.
 *
 * The visitorConsent parameter is only included when explicitly provided,
 * maintaining compatibility with stores whose API schema doesn't support it.
 */

/**
 * Builds the @inContext directive variable declarations for cart operations.
 * Only includes visitorConsent when it's actually being used.
 */
export function getInContextVariables(includeVisitorConsent: boolean): string {
  const base = `$country: CountryCode = ZZ
    $language: LanguageCode`;

  return includeVisitorConsent
    ? `${base}
    $visitorConsent: VisitorConsent`
    : base;
}

/**
 * Builds the @inContext directive for cart operations.
 * Only includes visitorConsent when it's actually being used.
 */
export function getInContextDirective(includeVisitorConsent: boolean): string {
  return includeVisitorConsent
    ? '@inContext(country: $country, language: $language, visitorConsent: $visitorConsent)'
    : '@inContext(country: $country, language: $language)';
}
