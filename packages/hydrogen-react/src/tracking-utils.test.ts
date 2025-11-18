import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  cachedTrackingValues,
  getTrackingValues,
  getTrackingValuesFromHeader,
} from './tracking-utils.js';

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
            name: 'https://shop.myshopify.com/other-endpoint',
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
            name: 'https://shop.myshopify.com/other-endpoint',
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
            name: 'https://shop.myshopify.com/other-endpoint',
            unique: 'resource-ignored',
            visit: 'resource-ignored',
          }),
          createResourceEntry(),
        ],
        navigation: [createNavigationEntry()],
      });
      vi.stubGlobal('document', {
        cookie: '_y=legacy-unique; _s=legacy-visit',
      } as unknown as Document);

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'legacy-unique',
        visitToken: 'legacy-visit',
      });
    });
  });
});

function stubPerformanceAPI({
  resource = [],
  navigation = [],
}: {
  resource?: PerformanceResourceTiming[];
  navigation?: PerformanceNavigationTiming[];
} = {}) {
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

  vi.stubGlobal('window', {
    location: {origin: 'https://shop.myshopify.com'},
    performance: mockPerformance,
  } as unknown as Window & typeof globalThis);
  vi.stubGlobal('performance', mockPerformance);

  return getEntriesByType;
}

function createResourceEntry({
  name = 'https://shop.myshopify.com/api/unstable/graphql.json',
  unique,
  visit,
}: {
  name?: string;
  unique?: string;
  visit?: string;
} = {}) {
  const serverTiming = [
    unique ? {name: '_y', description: unique} : null,
    visit ? {name: '_s', description: visit} : null,
  ].filter(Boolean) as PerformanceServerTiming[];

  return {
    initiatorType: 'fetch',
    name,
    serverTiming,
  } as unknown as PerformanceResourceTiming;
}

function createNavigationEntry({
  unique,
  visit,
}: {
  unique?: string;
  visit?: string;
} = {}) {
  const serverTiming = [
    unique ? {name: '_y', description: unique} : null,
    visit ? {name: '_s', description: visit} : null,
  ].filter(Boolean) as PerformanceServerTiming[];

  return {
    serverTiming,
  } as unknown as PerformanceNavigationTiming;
}
