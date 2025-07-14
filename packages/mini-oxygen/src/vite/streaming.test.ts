import {describe, it, expect, vi, beforeEach} from 'vitest';
import {ServerResponse} from 'node:http';
import {ReadableStream} from 'node:stream/web';
import {pipeFromWeb} from './utils.js';
import {Response} from '../worker/index.js';
import * as nodeFetchServer from '@mjackson/node-fetch-server';

// Mock the sendResponse function
vi.mock('@mjackson/node-fetch-server', () => ({
  sendResponse: vi
    .fn()
    .mockImplementation(async (res: ServerResponse, webResponse: Response) => {
      // Simulate the actual sendResponse behavior for testing
      const chunks: Buffer[] = [];

      if (webResponse.body) {
        const reader = webResponse.body.getReader();
        let result = await reader.read();

        while (!result.done) {
          chunks.push(Buffer.from(result.value));
          result = await reader.read();
        }
      }

      // Mock writing to response
      res.statusCode = webResponse.status;
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Simulate writing chunks
      for (const chunk of chunks) {
        res.write(chunk);
      }
      res.end();
    }),
}));

describe('Streaming Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle streaming responses', async () => {
    // Create a streaming response
    const encoder = new TextEncoder();
    let chunkCount = 0;

    const stream = new ReadableStream({
      async pull(controller) {
        if (chunkCount < 3) {
          controller.enqueue(encoder.encode(`chunk${chunkCount}\n`));
          chunkCount++;
          // Small delay to simulate async streaming
          await new Promise((resolve) => setTimeout(resolve, 10));
        } else {
          controller.close();
        }
      },
    });

    const streamingResponse = new Response(stream, {
      headers: {
        'content-type': 'text/plain',
        'transfer-encoding': 'chunked',
      },
    });

    // Create a mock ServerResponse that captures written data
    const writtenChunks: Buffer[] = [];
    const headers: Record<string, string> = {};

    const mockServerResponse = {
      statusCode: 200,
      write: vi.fn((chunk: Buffer) => {
        writtenChunks.push(chunk);
        return true;
      }),
      end: vi.fn(),
      setHeader: vi.fn((key: string, value: string) => {
        headers[key.toLowerCase()] = value;
      }),
    } as unknown as ServerResponse;

    // Call pipeFromWeb
    await pipeFromWeb(streamingResponse, mockServerResponse);

    // Verify sendResponse was called correctly
    expect(nodeFetchServer.sendResponse).toHaveBeenCalledWith(
      mockServerResponse,
      streamingResponse,
    );

    // Verify the mock implementation worked
    expect(mockServerResponse.write).toHaveBeenCalled();
    expect(mockServerResponse.end).toHaveBeenCalled();
    expect(headers['content-type']).toBe('text/plain');
    expect(headers['transfer-encoding']).toBe('chunked');
  });

  it('should handle React Router turbo-stream responses', async () => {
    const encoder = new TextEncoder();
    const boundary = '---boundary---';

    const stream = new ReadableStream({
      async start(controller) {
        // Initial HTML
        controller.enqueue(
          encoder.encode(
            '<!DOCTYPE html><html><body><div id="app">Loading...</div>',
          ),
        );

        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Turbo stream update
        controller.enqueue(
          encoder.encode(
            `\n<!--${boundary}-->\n` +
              `<turbo-stream action="replace" target="app">\n` +
              `<template><div id="app">Content loaded!</div></template>\n` +
              `</turbo-stream>\n` +
              `<!--/${boundary}-->\n`,
          ),
        );

        controller.enqueue(encoder.encode('</body></html>'));
        controller.close();
      },
    });

    const turboStreamResponse = new Response(stream, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-remix-response': 'yes',
      },
    });

    const mockServerResponse = {
      statusCode: 200,
      write: vi.fn(),
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;

    await pipeFromWeb(turboStreamResponse, mockServerResponse);

    expect(nodeFetchServer.sendResponse).toHaveBeenCalledWith(
      mockServerResponse,
      turboStreamResponse,
    );
  });

  it('should preserve streaming headers through sendResponse', async () => {
    const encoder = new TextEncoder();
    const customHeaders = {
      'content-type': 'application/json',
      'x-custom-header': 'test-value',
      'cache-control': 'no-cache',
      'transfer-encoding': 'chunked',
    };

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"data":"test"}'));
        controller.close();
      },
    });

    const response = new Response(stream, {
      status: 201,
      headers: customHeaders,
    });

    const capturedHeaders: Record<string, string> = {};
    const mockServerResponse = {
      statusCode: 200,
      write: vi.fn(),
      end: vi.fn(),
      setHeader: vi.fn((key: string, value: string) => {
        capturedHeaders[key.toLowerCase()] = value;
      }),
    } as unknown as ServerResponse;

    await pipeFromWeb(response, mockServerResponse);

    // Verify all headers are preserved
    expect(capturedHeaders['content-type']).toBe('application/json');
    expect(capturedHeaders['x-custom-header']).toBe('test-value');
    expect(capturedHeaders['cache-control']).toBe('no-cache');
    expect(capturedHeaders['transfer-encoding']).toBe('chunked');
    expect(mockServerResponse.statusCode).toBe(201);
  });

  it('should handle empty streaming responses', async () => {
    const stream = new ReadableStream({
      start(controller) {
        // Close immediately without enqueuing any data
        controller.close();
      },
    });

    const emptyResponse = new Response(stream);
    const mockServerResponse = {
      statusCode: 200,
      write: vi.fn(),
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;

    await pipeFromWeb(emptyResponse, mockServerResponse);

    expect(nodeFetchServer.sendResponse).toHaveBeenCalledWith(
      mockServerResponse,
      emptyResponse,
    );
    expect(mockServerResponse.end).toHaveBeenCalled();
  });
});
