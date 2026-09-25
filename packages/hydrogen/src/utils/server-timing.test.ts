import {describe, expect, it, vi} from 'vitest';
import {appendServerTimingHeader, isSfapiProxyEnabled} from './server-timing';
import {HYDROGEN_SFAPI_PROXY_KEY} from '../constants';

describe('server-timing', () => {
  describe('appendServerTimingHeader', () => {
    it('appends a Server-Timing header to the response', () => {
      const response = {headers: new Headers()};

      appendServerTimingHeader(response, {
        _sfapi_proxy: '1',
        unused: undefined,
      });

      expect(response.headers.get('Server-Timing')).toBe('_sfapi_proxy;desc=1');
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
  });
});
