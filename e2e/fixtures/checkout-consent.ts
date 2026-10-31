const V3_PURPOSES = /^3([aAmMpPsS]*\.?[aAmMpPsS]*)$/;
const CONSENT_ID = /^(?:[A-Za-z0-9*-]{22})?$/;

/**
 * Checkout seeds consent without exposing the Customer Privacy API methods.
 * Mirror its v3 effective-purpose rule: uppercase A permits analytics, including
 * defaults after the dot. Lowercase is a choice, not permission to process.
 * Unknown formats are unavailable evidence, never an implicit denial.
 */
export function checkoutAnalyticsAllowed(value: unknown): boolean | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const [
      versionAndPurposes,
      region,
      banner,
      saleOfDataRegion,
      consentId,
      ...customState
    ] = decodeURIComponent(value).split('_');
    const purposes = V3_PURPOSES.exec(versionAndPurposes)?.[1];
    if (!purposes || !/[aAmMpPsS]/.test(purposes)) return undefined;
    const purposeKeys = purposes.replace('.', '').toLowerCase();
    if (new Set(purposeKeys).size !== purposeKeys.length) return undefined;
    if (region === undefined || !/^[A-Z0-9-]*$/.test(region)) return undefined;
    if (banner === undefined || !/^[tf]?$/.test(banner)) return undefined;
    if (saleOfDataRegion === undefined || !/^[tf]?$/.test(saleOfDataRegion))
      return undefined;
    if (consentId !== undefined && !CONSENT_ID.test(consentId))
      return undefined;
    if (customState.join('_')) JSON.parse(customState.join('_'));
    return purposes.includes('A');
  } catch {
    return undefined;
  }
}
