import {describe, it, expect} from 'vitest';
import {appendHeader} from './response';
import {OutgoingMessage} from 'node:http';

describe('response utils', () => {
  describe('set cross runtime request headers', () => {
    it('in browser-like environments', () => {
      const response = new Response('https://example.com');
      appendHeader(response, 'purpose', 'test');
      expect(response.headers.get('purpose')).toEqual('test');
    });

    it('in Node', () => {
      const response = new OutgoingMessage();
      appendHeader(response, 'purpose', 'test');

      expect(response.getHeader('purpose')).toEqual('test');
    });
  });
});
