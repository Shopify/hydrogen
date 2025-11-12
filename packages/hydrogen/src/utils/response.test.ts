import {describe, it, expect} from 'vitest';
import {appendHeader, appendHeaders} from './response';
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

  describe('append multiple headers', () => {
    it('in browser-like environments', () => {
      const response = new Response('');
      appendHeaders(response, [
        ['set-cookie', ['a=1', 'b=2']],
        ['purpose', ['test']],
      ]);

      expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
      expect(response.headers.get('purpose')).toEqual('test');
    });

    it('in Node', () => {
      const response = new OutgoingMessage();
      appendHeaders(response, [
        ['set-cookie', ['a=1', 'b=2']],
        ['purpose', ['test']],
      ]);

      expect(response.getHeader('set-cookie')).toEqual(['a=1', 'b=2']);
      expect(response.getHeader('purpose')).toEqual('test');
    });
  });
});
