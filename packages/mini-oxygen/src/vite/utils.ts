import type {ServerResponse, IncomingMessage} from 'node:http';
import path from 'node:path';
import {Readable} from 'node:stream';
import {sendResponse} from '@mjackson/node-fetch-server';
import {Request, type Response} from '../worker/index.js';
import type {ViteDevServer} from 'vite';

/**
 * Creates a fully qualified URL from a Node request or a string.
 * In the case of a Node request, it uses the host header to determine the origin.
 */
export function toURL(req: string | IncomingMessage = '/', origin?: string) {
  const isRequest = typeof req !== 'string';
  let pathname = (isRequest ? req.url : req) || '/';

  return new URL(
    (origin ||
      (isRequest && req.headers.host && `http://${req.headers.host}`) ||
      'http://example.com') + pathname,
  );
}

/**
 * Turns a Node request into a Web request by using native Node APIs.
 */
export function toWeb(req: IncomingMessage, headers?: Record<string, string>) {
  if (!req.headers.host) {
    throw new Error('Request must contain a host header.');
  }

  return new Request(toURL(req), {
    method: req.method,
    headers: {...headers, ...(req.headers as object)},
    body: req.headers['content-length'] ? Readable.toWeb(req) : undefined,
    duplex: 'half', // This is required when sending a ReadableStream as body
    redirect: 'manual', // Avoid consuming 300 responses here, return to browser
  });
}

/**
 * Reads from a Web response and writes to a Node response
 * using @mjackson/node-fetch-server for proper streaming support.
 */
export function pipeFromWeb(webResponse: Response, res: ServerResponse) {
  // The sendResponse function from @mjackson/node-fetch-server properly handles
  // streaming responses, including turbo-stream responses from React Router
  return sendResponse(res, webResponse as unknown as globalThis.Response);
}
