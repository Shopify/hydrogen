import {describe, expect, it} from 'vitest';
import {
  extractServerTimingHeader,
  appendServerTimingHeader,
} from './server-timing';

describe('server-timing', () => {
  describe('extractServerTimingHeader', () => {
    it('parses tokens and consent information from the header value', () => {
      const header =
        '_y;desc="unique-token", _unused;desc="unused", _s;desc="visit-token", _cmp;desc="opt-in"';

      expect(extractServerTimingHeader(header)).toEqual({
        _y: 'unique-token',
        _s: 'visit-token',
        _cmp: 'opt-in',
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
});
