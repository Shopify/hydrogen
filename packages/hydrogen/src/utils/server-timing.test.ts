import {describe, expect, it, vi} from 'vitest';
import {
  extractServerTimingHeader,
  appendServerTimingHeader,
  isSfapiProxyEnabled,
  hasBackendFetchedTracking,
} from './server-timing';
import {
  HYDROGEN_SERVER_TRACKING_KEY,
  HYDROGEN_SFAPI_PROXY_KEY,
} from '../constants';

describe('server-timing', () => {
  describe('extractServerTimingHeader', () => {
    it('parses tokens and consent information from the header value', () => {
      const header =
        '_y;desc="unique-token", _unused;desc="unused", _s;desc="visit-token", _cmp;desc="opt-in", _ny;desc=ny-value';

      expect(extractServerTimingHeader(header)).toEqual({
        _y: 'unique-token',
        _s: 'visit-token',
        _cmp: 'opt-in',
        _ny: 'ny-value',
      });
    });
  });

  describe('appendServerTimingHeader', () => {
    it('appends a Server-Timing header to the response', () => {
      const response = {headers: new Headers()};

      appendServerTimingHeader(response, {
        _y: 'unique-token',
        _s: 'visit-token',
        _cmp: undefined,
      });

      expect(response.headers.get('Server-Timing')).toBe(
        '_y;desc=unique-token, _s;desc=visit-token',
      );
    });
  });

  describe('performance api detection', () => {
    it('detects if SFAPI proxy is enabled', () => {
      expect(isSfapiProxyEnabled()).toBe(false);

      vi.stubGlobal('window', {
        performance: {
          getEntriesByType: () => [
            {serverTiming: [{name: HYDROGEN_SFAPI_PROXY_KEY}]},
          ],
        },
      });

      expect(isSfapiProxyEnabled()).toBe(true);

      vi.unstubAllGlobals();
    });

    it('detects if backend fetched tracking is present', () => {
      expect(hasBackendFetchedTracking()).toBe(false);

      vi.stubGlobal('window', {
        performance: {
          getEntriesByType: () => [
            {serverTiming: [{name: HYDROGEN_SERVER_TRACKING_KEY}]},
          ],
        },
      });

      expect(hasBackendFetchedTracking()).toBe(true);
    });
  });
});
