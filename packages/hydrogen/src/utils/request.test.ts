import {describe, it, expect} from 'vitest';
import {getClientIp, getHeader, getRequestId} from './request';
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

  describe('find the client IP from the request', () => {
    it('in Oxygen', () => {
      const request = new Request('https://example.com', {
        headers: {'oxygen-buyer-ip': 'my-ip'},
      });

      expect(getClientIp(request)).toEqual('my-ip');
    });

    it('in CFW', () => {
      const request = new Request('https://example.com', {
        headers: {'cf-connecting-ip': 'my-ip'},
      });

      expect(getClientIp(request)).toEqual('my-ip');
    });

    it('in Node', () => {
      const request = new IncomingMessage({remoteAddress: 'my-ip'} as Socket);
      expect(getClientIp(request)).toEqual('my-ip');
    });

    it('in a proxied server', () => {
      const request = new IncomingMessage({remoteAddress: 'shrugs'} as Socket);
      request.headers['x-forwarded-for'] = 'my-ip, somewhere-else';
      expect(getClientIp(request)).toEqual('my-ip');
    });
  });

  describe('get the request ID', () => {
    it('in Oxygen', () => {
      const request = new Request('https://example.com', {
        headers: {'request-id': 'my-id'},
      });

      const requestId = getRequestId(request);
      expect(requestId).toEqual('my-id');

      // Does not create a new one
      expect(requestId).toEqual(getRequestId(request));
      expect((request as any).headers['request-id']).toBeFalsy();
    });

    it('in non-Oxygen environments', () => {
      const request = new Request('https://example.com');

      const requestId = getRequestId(request);
      expect(requestId).toEqual(expect.any(String));

      // Does not create a new one
      expect(requestId).toEqual(getRequestId(request));
      expect((request as any).headers['request-id']).toBeTruthy();
    });
  });
});
