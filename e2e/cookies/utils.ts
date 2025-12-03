import {expect} from '@playwright/test';
import type {Page} from '@playwright/test';

// Privacy Banner element IDs
export const PRIVACY_BANNER_DIALOG_ID = 'shopify-pc__banner';
export const ACCEPT_BUTTON_ID = 'shopify-pc__banner__btn-accept';
export const DECLINE_BUTTON_ID = 'shopify-pc__banner__btn-decline';

// Cookies that require consent
export const ANALYTICS_COOKIES = [
  '_shopify_analytics',
  '_shopify_marketing',
  '_shopify_y',
  '_shopify_s',
];

// URL patterns for network request tracking
export const PERF_KIT_URL = 'cdn.shopify.com/shopifycloud/perf-kit';
export const MONORAIL_URL = 'produce_batch';
export const GRAPHQL_URL = 'graphql.json';

// Mock value pattern for declined consent (all zeros with a 5)
export const MOCK_VALUE_PATTERN = /^0+[-0]*5/;

export interface ServerTimingValues {
  _y?: string;
  _s?: string;
}

export interface MonorailPayload {
  unique_token?: string;
  deprecated_visit_token?: string;
  uniqToken?: string;
  visitToken?: string;
}

/**
 * Get server-timing values (_y and _s) from the Performance API
 * @param page - Playwright page object
 * @param preferLatestResource - If true, prefer the latest resource entry over navigation timing
 */
export async function getServerTimingValues(
  page: Page,
  preferLatestResource = false,
): Promise<ServerTimingValues> {
  return page.evaluate((preferLatest) => {
    const result: {_y?: string; _s?: string} = {};

    // Get values from resource timing entries (latest entries first)
    const resourceEntries = performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];

    // Reverse to get latest entries first
    for (const entry of [...resourceEntries].reverse()) {
      if (entry.serverTiming) {
        for (const {name, description} of entry.serverTiming) {
          if (name === '_y' && description && !result._y) {
            result._y = description;
          } else if (name === '_s' && description && !result._s) {
            result._s = description;
          }
        }
      }
      if (result._y && result._s) break;
    }

    // Fall back to navigation timing if resource entries don't have values
    // or if we explicitly don't prefer latest
    if (!preferLatest || (!result._y && !result._s)) {
      const navigationEntry = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;

      if (navigationEntry?.serverTiming) {
        for (const {name, description} of navigationEntry.serverTiming) {
          if (name === '_y' && description && !result._y) {
            result._y = description;
          } else if (name === '_s' && description && !result._s) {
            result._s = description;
          }
        }
      }
    }

    return result;
  }, preferLatestResource);
}

/**
 * Verify that Monorail analytics requests contain the correct tracking values
 */
export function verifyMonorailRequests(
  requests: {url: string; postData?: string}[],
  expectedY: string,
  expectedS: string,
  context: string,
): void {
  for (const request of requests) {
    if (request.postData) {
      const payload = JSON.parse(request.postData) as {
        events?: Array<{payload: MonorailPayload}>;
      };

      if (payload.events) {
        for (const event of payload.events) {
          const eventPayload = event.payload;

          const uniqueToken =
            eventPayload.unique_token || eventPayload.uniqToken;
          if (uniqueToken) {
            expect(
              uniqueToken,
              `Monorail unique_token ${context} should match _y value`,
            ).toBe(expectedY);
          }

          const visitToken =
            eventPayload.deprecated_visit_token || eventPayload.visitToken;
          if (visitToken) {
            expect(
              visitToken,
              `Monorail visit_token ${context} should match _s value`,
            ).toBe(expectedS);
          }
        }
      }
    }
  }
}

/**
 * Wait for consent management GraphQL response
 */
export function waitForConsentResponse(page: Page) {
  return page.waitForResponse(async (response) => {
    const url = response.url();
    if (url.includes(GRAPHQL_URL)) {
      const postData = response.request().postData();
      if (postData && postData.includes('consentManagement')) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Wait for perf-kit script to be loaded
 */
export async function waitForPerfKit(page: Page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const perfKitScript = document.querySelector('script[src*="perf-kit"]');
      return perfKitScript !== null;
    },
    {timeout},
  );
}
