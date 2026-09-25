import {describe, expect, it} from 'vitest';
import {appendServerTimingHeader} from './server-timing';

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
});
