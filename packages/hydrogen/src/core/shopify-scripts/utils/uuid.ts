/**
 * Inlined from @shopify/hydrogen-react/analytics-utils.
 * UUID v4 generator for analytics event IDs.
 */

const UUID_V4_REPLACE_REGEX = /[018]/g;
const CRYPTO_RANDOM_VALUES_ARRAY = new Uint8Array(1);

export function buildUUID(): string {
  return "10000000-1000-4000-8000-100000000000".replace(UUID_V4_REPLACE_REGEX, (c) => {
    const randomValue = crypto.getRandomValues(CRYPTO_RANDOM_VALUES_ARRAY)[0];
    return (+c ^ (randomValue & (15 >> (+c / 4)))).toString(16);
  });
}
