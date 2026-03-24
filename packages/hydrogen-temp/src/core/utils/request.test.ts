import {describe, it, expect} from 'vitest';
import {getHeader, extractHeaders} from './request';
import {IncomingMessage} from 'node:http';
import type {Socket} from 'node:net';

describe('request utils', () => {
  describe('find cross runtime request headers', () => {
    it('in browser-like environments', () => {
      const request = new Request('https://example.com', {
        headers: {purpose: 'test'},
      });

      expect(getHeader(request, 'purpose')).toEqual('test');
    });

    it('in Node', () => {
      const request = new IncomingMessage({} as Socket);
      request.headers['purpose'] = 'test';

      expect(getHeader(request, 'purpose')).toEqual('test');
    });
  });

  describe('extractHeaders', () => {
    it('extracts headers using the provided callback', () => {
      const testHeaders = [
        ['x-custom-header', 'custom-value'],
        ['x-another-header', 'another-value'],
      ] satisfies [string, string][];

      const request = new Request('https://example.com', {
        headers: new Headers(testHeaders),
      });

      expect(
        extractHeaders(
          (key) => request.headers.get(key),
          [
            'x-custom-header',
            'x-missing-header-1',
            'x-another-header',
            'x-missing-header-2',
          ],
        ),
      ).toEqual(testHeaders);
    });
  });
});
