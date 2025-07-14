import {describe, it, expect, vi} from 'vitest';
import {Readable, Writable} from 'node:stream';
import {ReadableStream} from 'node:stream/web';
import {IncomingMessage, ServerResponse} from 'node:http';
import {pipeFromWeb, toWeb, toURL} from './utils.js';
import {Response} from '../worker/index.js';
import * as nodeFetchServer from '@mjackson/node-fetch-server';

// Mock the sendResponse function from @mjackson/node-fetch-server
vi.mock('@mjackson/node-fetch-server', () => ({
  sendResponse: vi.fn(),
}));

describe('utils', () => {
  describe('toURL', () => {
    it('should create URL from string pathname', () => {
      const url = toURL('/test/path');
      expect(url.pathname).toBe('/test/path');
      expect(url.origin).toBe('http://example.com');
    });

    it('should create URL from IncomingMessage with host header', () => {
      const req = {
        url: '/test/path',
        headers: {
          host: 'localhost:3000',
        },
      } as unknown as IncomingMessage;

      const url = toURL(req);
      expect(url.pathname).toBe('/test/path');
      expect(url.origin).toBe('http://localhost:3000');
    });

    it('should use custom origin when provided', () => {
      const url = toURL('/test', 'https://custom.com');
      expect(url.origin).toBe('https://custom.com');
    });
  });

  describe('toWeb', () => {
    it('should convert Node request to Web Request', () => {
      const nodeReq = {
        url: '/test',
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          'content-type': 'application/json',
          'content-length': '10',
        },
      } as unknown as IncomingMessage;

      // Mock the Readable.toWeb method
      const mockBody = new ReadableStream();
      vi.spyOn(Readable, 'toWeb').mockReturnValue(mockBody);

      const webReq = toWeb(nodeReq);

      // The Request constructor being used is from ../worker/index.js
      expect(webReq.constructor.name).toBe('Request');
      expect(webReq.method).toBe('POST');
      expect(webReq.headers.get('content-type')).toBe('application/json');
      expect(webReq.url).toBe('http://localhost:3000/test');
    });

    it('should throw error if host header is missing', () => {
      const nodeReq = {
        url: '/test',
        headers: {},
      } as unknown as IncomingMessage;

      expect(() => toWeb(nodeReq)).toThrow(
        'Request must contain a host header.',
      );
    });

    it('should not include body for requests without content-length', () => {
      const nodeReq = {
        url: '/test',
        method: 'GET',
        headers: {
          host: 'localhost:3000',
        },
      } as unknown as IncomingMessage;

      const webReq = toWeb(nodeReq);
      expect(webReq.body).toBeNull();
    });
  });

  describe('pipeFromWeb', () => {
    it('should call sendResponse with correct parameters', async () => {
      const mockResponse = new Response('test body', {
        headers: {
          'content-type': 'text/plain',
        },
      });

      const mockServerResponse = {} as ServerResponse;

      await pipeFromWeb(mockResponse, mockServerResponse);

      expect(nodeFetchServer.sendResponse).toHaveBeenCalledWith(
        mockServerResponse,
        mockResponse,
      );
    });

    it('should handle streaming response correctly', async () => {
      // Create a streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('chunk1'));
          controller.enqueue(encoder.encode('chunk2'));
          controller.close();
        },
      });

      const streamingResponse = new Response(stream, {
        headers: {
          'content-type': 'text/plain',
          'transfer-encoding': 'chunked',
        },
      });

      const mockServerResponse = {} as ServerResponse;

      await pipeFromWeb(streamingResponse, mockServerResponse);

      expect(nodeFetchServer.sendResponse).toHaveBeenCalledWith(
        mockServerResponse,
        streamingResponse,
      );
    });

    it('should preserve response headers when piping', async () => {
      const mockResponse = new Response('test', {
        status: 201,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'value',
          'cache-control': 'no-cache',
        },
      });

      const mockServerResponse = {} as ServerResponse;

      await pipeFromWeb(mockResponse, mockServerResponse);

      // Verify sendResponse is called with the response object
      expect(nodeFetchServer.sendResponse).toHaveBeenCalledWith(
        mockServerResponse,
        mockResponse,
      );

      // Verify the response has the correct properties
      // Find the call with status 201 (it should be the last call)
      const calls = (nodeFetchServer.sendResponse as any).mock.calls;
      const callIndex = calls.length - 1;
      const passedResponse = calls[callIndex][1];
      expect(passedResponse.status).toBe(201);
      expect(passedResponse.headers.get('content-type')).toBe(
        'application/json',
      );
      expect(passedResponse.headers.get('x-custom-header')).toBe('value');
      expect(passedResponse.headers.get('cache-control')).toBe('no-cache');
    });
  });
});
