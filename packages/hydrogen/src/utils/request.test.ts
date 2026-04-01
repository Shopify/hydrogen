import {describe, it, expect} from 'vitest';
import {getHeader, extractHeaders, MCP_RE, getSafePathname} from './request';
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

  describe('MCP_RE via getSafePathname', () => {
    const isMcpPath = (url: string) => MCP_RE.test(getSafePathname(url));

    it('matches /api/mcp', () => {
      expect(isMcpPath('/api/mcp')).toBe(true);
    });

    it('rejects sub-paths like /api/mcp/foo', () => {
      expect(isMcpPath('/api/mcp/foo')).toBe(false);
    });

    it('rejects suffix matches like /api/mcps', () => {
      expect(isMcpPath('/api/mcps')).toBe(false);
    });

    it('rejects SFAPI paths like /api/2024-10/graphql.json', () => {
      expect(isMcpPath('/api/2024-10/graphql.json')).toBe(false);
    });

    it('rejects trailing slash /api/mcp/', () => {
      expect(isMcpPath('/api/mcp/')).toBe(false);
    });

    it('matches full URLs with query parameters', () => {
      expect(isMcpPath('https://store.com/api/mcp?session=abc')).toBe(true);
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
