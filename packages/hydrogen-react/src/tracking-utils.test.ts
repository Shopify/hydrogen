import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  cachedTrackingValues,
  getTrackingValues,
  getTrackingValuesFromHeader,
} from './tracking-utils.js';

const testOrigin = 'https://shop.myshopify.com';

describe('tracking-utils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cachedTrackingValues.current = null;
  });

  describe('getTrackingValuesFromHeader', () => {
    it('returns empty values when header is empty', () => {
      expect(getTrackingValuesFromHeader('')).toEqual({
        uniqueToken: undefined,
        visitToken: undefined,
        consent: undefined,
        serverTiming: '',
      });
    });

    it('parses tokens and consent information from the header value', () => {
      const header =
        '_y;desc="unique-token", _unused;desc="unused", _s;desc="visit-token", _cmp;desc="opt-in", _ny;desc=ny-value';

      expect(getTrackingValuesFromHeader(header)).toEqual({
        uniqueToken: 'unique-token',
        visitToken: 'visit-token',
        consent: 'opt-in',
        serverTiming:
          '_y;desc=unique-token, _s;desc=visit-token, _cmp;desc=opt-in, _ny;desc=ny-value',
      });
    });
  });

  describe('getTrackingValues', () => {
    it('returns tokens from the latest resource performance entry', () => {
      stubPerformanceAPI({
        resource: [
          createResourceEntry({
            name: `${testOrigin}/other-endpoint`,
            unique: 'ignored-unique',
            visit: 'ignored-visit',
          }),
          createResourceEntry({
            unique: 'resource-unique',
            visit: 'resource-visit',
          }),
        ],
        navigation: [
          createNavigationEntry({
            unique: 'nav-unique-ignored',
            visit: 'nav-visit-ignored',
          }),
        ],
      });

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'resource-unique',
        visitToken: 'resource-visit',
      });
    });

    it('falls back to navigation performance entries when no resource tokens are found', () => {
      const mockGetEntries = stubPerformanceAPI({
        resource: [
          createResourceEntry({
            name: `${testOrigin}/other-endpoint`,
            unique: 'resource-ignored',
            visit: 'resource-ignored',
          }),
          createResourceEntry(),
        ],
        navigation: [
          createNavigationEntry({unique: 'nav-unique', visit: 'nav-visit'}),
        ],
      });

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'nav-unique',
        visitToken: 'nav-visit',
      });
      expect(mockGetEntries).toHaveBeenNthCalledWith(1, 'resource');
      expect(mockGetEntries).toHaveBeenNthCalledWith(2, 'navigation');
    });

    it('reuses cached resource tokens when later resource entries are unavailable', () => {
      const resourceEntries = [
        createResourceEntry({
          unique: 'cached-unique',
          visit: 'cached-visit',
        }),
      ];
      const mockGetEntries = stubPerformanceAPI({resource: resourceEntries});

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'cached-unique',
        visitToken: 'cached-visit',
      });
      resourceEntries.splice(0);
      expect(getTrackingValues()).toEqual({
        uniqueToken: 'cached-unique',
        visitToken: 'cached-visit',
      });
      expect(mockGetEntries).toHaveBeenCalledTimes(2);
    });

    it('falls back to deprecated cookies when performance APIs are unavailable', () => {
      stubPerformanceAPI({
        resource: [
          createResourceEntry({
            name: `${testOrigin}/other-endpoint`,
            unique: 'resource-ignored',
            visit: 'resource-ignored',
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
      });
    });

    describe('cross-origin support with backup matching', () => {
      it('prioritizes primary same-domain matches over unrelated domains', () => {
        // Tests that algorithm continues searching for primary match
        // even after finding a backup match
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://mystore.myshopify.com/api/2024-01/graphql.json',
                unique: 'cross-domain-unique',
                visit: 'cross-domain-visit',
              }),
              createResourceEntry({
                name: 'https://mystore.com/api/unstable/graphql.json',
                unique: 'primary-unique',
                visit: 'primary-visit',
              }),
            ],
          },
          'https://mystore.com',
        );

        // Should use primary match even though backup is newer
        expect(getTrackingValues()).toEqual({
          uniqueToken: 'primary-unique',
          visitToken: 'primary-visit',
        });
      });

      it('prioritizes primary subdomain matches over unrelated domains', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://mystore.myshopify.com/api/2024-01/graphql.json',
                unique: 'cross-domain-unique',
                visit: 'cross-domain-visit',
              }),
              createResourceEntry({
                name: 'https://checkout.mystore.com/api/2024-01/graphql.json',
                unique: 'subdomain-unique',
                visit: 'subdomain-visit',
              }),
            ],
          },
          'https://mystore.com',
        );

        expect(getTrackingValues()).toEqual({
          uniqueToken: 'subdomain-unique',
          visitToken: 'subdomain-visit',
        });
      });

      it('finds unrelated cross-domain SFAPI matches as last resort', () => {
        stubPerformanceAPI(
          {
            resource: [
              createResourceEntry({
                name: 'https://mystore.myshopify.com/api/2024-01/graphql.json',
                unique: 'cross-domain-unique',
                visit: 'cross-domain-visit',
              }),
            ],
          },
          'https://mystore.com',
        );

        expect(getTrackingValues()).toEqual({
          uniqueToken: 'cross-domain-unique',
          visitToken: 'cross-domain-visit',
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

type EntryOptions = {unique?: string; visit?: string};

function createNavigationEntry({unique, visit}: EntryOptions = {}) {
  const serverTiming = [
    unique ? {name: '_y', description: unique} : null,
    visit ? {name: '_s', description: visit} : null,
  ].filter(Boolean) as PerformanceServerTiming[];

  return {
    serverTiming,
  } as unknown as PerformanceNavigationTiming;
}

function createResourceEntry({
  name = `${testOrigin}/api/unstable/graphql.json`,
  unique,
  visit,
}: EntryOptions & {name?: string} = {}) {
  return {
    ...createNavigationEntry({unique, visit}),
    initiatorType: 'fetch',
    name,
  } as unknown as PerformanceResourceTiming;
}
