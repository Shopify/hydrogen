import {afterEach, describe, expect, it, vi} from 'vitest';
import {cachedTrackingValues, getTrackingValues} from './tracking-utils.js';

const testOrigin = 'https://shop.myshopify.com';

describe('tracking-utils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cachedTrackingValues.current = null;
  });

  describe('getTrackingValues', () => {
    it('returns tokens from the latest resource performance entry', () => {
      stubPerformanceAPI({
        resource: [
          createResourceEntry({
            name: `${testOrigin}/other-endpoint`,
            // No tokens - should be ignored even though same origin
          }),
          createResourceEntry({
            unique: 'resource-unique',
            visit: 'resource-visit',
            consent: 'resource-consent',
          }),
        ],
        navigation: [
          createNavigationEntry({
            unique: 'nav-unique-ignored',
            visit: 'nav-visit-ignored',
            consent: 'nav-consent-ignored',
          }),
        ],
      });

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'resource-unique',
        visitToken: 'resource-visit',
        consent: 'resource-consent',
      });
    });

    it('returns tokens from non-SFAPI same-origin requests that have tracking values', () => {
      stubPerformanceAPI({
        resource: [
          createResourceEntry({
            name: `${testOrigin}/other/path/update-my-cart`,
            unique: 'other-path-unique',
            visit: 'other-path-visit',
            consent: 'other-path-consent',
          }),
        ],
        navigation: [
          createNavigationEntry({
            unique: 'nav-unique-ignored',
            visit: 'nav-visit-ignored',
            consent: 'nav-consent-ignored',
          }),
        ],
      });

      // Should match same-origin request regardless of path if it has _y and _s
      expect(getTrackingValues()).toEqual({
        uniqueToken: 'other-path-unique',
        visitToken: 'other-path-visit',
        consent: 'other-path-consent',
      });
    });

    it('falls back to navigation performance entries when no resource tokens are found', () => {
      const mockGetEntries = stubPerformanceAPI({
        resource: [
          createResourceEntry({
            name: `${testOrigin}/other-endpoint`,
            // No tokens - should be ignored
          }),
          createResourceEntry(),
        ],
        navigation: [
          createNavigationEntry({
            unique: 'nav-unique',
            visit: 'nav-visit',
            consent: 'nav-consent',
          }),
        ],
      });

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'nav-unique',
        visitToken: 'nav-visit',
        consent: 'nav-consent',
      });
      expect(mockGetEntries).toHaveBeenNthCalledWith(1, 'resource');
      expect(mockGetEntries).toHaveBeenNthCalledWith(2, 'navigation');
    });

    it('reuses cached resource tokens when later resource entries are unavailable', () => {
      const resourceEntries = [
        createResourceEntry({
          unique: 'cached-unique',
          visit: 'cached-visit',
          consent: 'cached-consent',
        }),
      ];
      const mockGetEntries = stubPerformanceAPI({resource: resourceEntries});

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'cached-unique',
        visitToken: 'cached-visit',
        consent: 'cached-consent',
      });
      resourceEntries.splice(0);
      expect(getTrackingValues()).toEqual({
        uniqueToken: 'cached-unique',
        visitToken: 'cached-visit',
        consent: 'cached-consent',
      });
      expect(mockGetEntries).toHaveBeenCalledTimes(2);
    });

    it('falls back to deprecated cookies when performance APIs are unavailable', () => {
      stubPerformanceAPI({
        resource: [
          createResourceEntry({
            name: `${testOrigin}/other-endpoint`,
            // No tokens - should be ignored
          }),
          createResourceEntry(),
        ],
        navigation: [createNavigationEntry()],
      });
      vi.stubGlobal('document', {
        cookie: '_shopify_y=legacy-unique; _shopify_s=legacy-visit',
      } as unknown as Document);

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'legacy-unique',
        visitToken: 'legacy-visit',
        consent: '',
      });
    });

    describe('cross-origin matching', () => {
      it('matches the most recent entry with values (same-origin wins when newer)', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://checkout.mystore.com/api/2024-01/graphql.json',
                unique: 'subdomain-unique',
                visit: 'subdomain-visit',
                consent: 'subdomain-consent',
              }),
              createResourceEntry({
                name: 'https://mystore.com/any-path',
                unique: 'same-origin-unique',
                visit: 'same-origin-visit',
                consent: 'same-origin-consent',
              }),
            ],
          },
          'https://mystore.com',
        );

        // Most recent match (same-origin) wins
        expect(getTrackingValues()).toEqual({
          uniqueToken: 'same-origin-unique',
          visitToken: 'same-origin-visit',
          consent: 'same-origin-consent',
        });
      });

      it('matches the most recent entry with values (subdomain wins when newer)', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://mystore.com/any-path',
                unique: 'same-origin-unique',
                visit: 'same-origin-visit',
                consent: 'same-origin-consent',
              }),
              createResourceEntry({
                name: 'https://checkout.mystore.com/api/2024-01/graphql.json',
                unique: 'subdomain-unique',
                visit: 'subdomain-visit',
                consent: 'subdomain-consent',
              }),
            ],
          },
          'https://mystore.com',
        );

        // Most recent match (subdomain SFAPI) wins
        expect(getTrackingValues()).toEqual({
          uniqueToken: 'subdomain-unique',
          visitToken: 'subdomain-visit',
          consent: 'subdomain-consent',
        });
      });

      it('matches subdomain SFAPI requests with tracking values', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://checkout.mystore.com/api/2024-01/graphql.json',
                unique: 'subdomain-unique',
                visit: 'subdomain-visit',
                consent: 'subdomain-consent',
              }),
            ],
          },
          'https://mystore.com',
        );

        expect(getTrackingValues()).toEqual({
          uniqueToken: 'subdomain-unique',
          visitToken: 'subdomain-visit',
          consent: 'subdomain-consent',
        });
      });

      it('ignores subdomain requests without SFAPI path', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://checkout.mystore.com/some-other-path',
                unique: 'ignored-unique',
                visit: 'ignored-visit',
                consent: 'ignored-consent',
              }),
            ],
            navigation: [
              createNavigationEntry({
                unique: 'nav-unique',
                visit: 'nav-visit',
                consent: 'nav-consent',
              }),
            ],
          },
          'https://mystore.com',
        );

        // Subdomain without SFAPI path should be ignored
        expect(getTrackingValues()).toEqual({
          uniqueToken: 'nav-unique',
          visitToken: 'nav-visit',
          consent: 'nav-consent',
        });
      });

      it('ignores unrelated cross-domain requests even with SFAPI path', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://mystore.myshopify.com/api/2024-01/graphql.json',
                unique: 'cross-domain-unique',
                visit: 'cross-domain-visit',
                consent: 'cross-domain-consent',
              }),
            ],
            navigation: [
              createNavigationEntry({
                unique: 'nav-unique',
                visit: 'nav-visit',
                consent: 'nav-consent',
              }),
            ],
          },
          'https://mystore.com',
        );

        // Unrelated cross-domain (not a subdomain) should be ignored
        expect(getTrackingValues()).toEqual({
          uniqueToken: 'nav-unique',
          visitToken: 'nav-visit',
          consent: 'nav-consent',
        });
      });

      it('ignores cross-domain non-SFAPI requests even with tracking values', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://other-domain.com/some-path',
                unique: 'ignored-unique',
                visit: 'ignored-visit',
                consent: 'ignored-consent',
              }),
            ],
            navigation: [
              createNavigationEntry({
                unique: 'nav-unique',
                visit: 'nav-visit',
                consent: 'nav-consent',
              }),
            ],
          },
          'https://mystore.com',
        );

        // Should fall back to navigation because cross-domain non-SFAPI is ignored
        expect(getTrackingValues()).toEqual({
          uniqueToken: 'nav-unique',
          visitToken: 'nav-visit',
          consent: 'nav-consent',
        });
      });

      it('requires tracking values for subdomain SFAPI match', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://checkout.mystore.com/api/2024-01/graphql.json',
                // No tokens - should be ignored even with SFAPI path
              }),
            ],
            navigation: [
              createNavigationEntry({
                unique: 'nav-unique',
                visit: 'nav-visit',
                consent: 'nav-consent',
              }),
            ],
          },
          'https://mystore.com',
        );

        // Subdomain SFAPI without tokens should fall back to navigation
        expect(getTrackingValues()).toEqual({
          uniqueToken: 'nav-unique',
          visitToken: 'nav-visit',
          consent: 'nav-consent',
        });
      });
    });
  });
});

function stubPerformanceAPI(
  {
    resource = [],
    navigation = [],
  }: {
    resource?: PerformanceResourceTiming[];
    navigation?: PerformanceNavigationTiming[];
  } = {},
  origin: string = testOrigin,
) {
  const getEntriesByType = vi.fn((type: string) => {
    if (type === 'resource') {
      return resource ?? [];
    }
    if (type === 'navigation') {
      return navigation ?? [];
    }
    return [];
  });

  const mockPerformance = {getEntriesByType} as unknown as Performance;

  const url = new URL(origin);
  vi.stubGlobal('window', {
    location: {origin, hostname: url.hostname, host: url.host},
    performance: mockPerformance,
  } as unknown as Window & typeof globalThis);
  vi.stubGlobal('performance', mockPerformance);

  return getEntriesByType;
}

type EntryOptions = {unique?: string; visit?: string; consent?: string};

function createNavigationEntry({unique, visit, consent}: EntryOptions = {}) {
  const serverTiming = [
    unique ? {name: '_y', description: unique} : null,
    visit ? {name: '_s', description: visit} : null,
    consent ? {name: '_cmp', description: consent} : null,
  ].filter(Boolean) as PerformanceServerTiming[];

  return {
    serverTiming,
  } as unknown as PerformanceNavigationTiming;
}

function createResourceEntry({
  name = `${testOrigin}/api/unstable/graphql.json`,
  unique,
  visit,
  consent,
}: EntryOptions & {name?: string} = {}) {
  return {
    ...createNavigationEntry({unique, visit, consent}),
    initiatorType: 'fetch',
    name,
  } as unknown as PerformanceResourceTiming;
}
