import type {ServerResponse, IncomingMessage} from 'node:http';
import path from 'node:path';
import {Readable} from 'node:stream';
import {Request, Response} from 'miniflare';
import type {ViteDevServer} from 'vite';

/**
 * Creates a fully qualified URL from a Node request or a string.
 * In the case of a Node request, it uses the host header to determine the origin.
 */
export function toURL(req: string | IncomingMessage = '/', origin?: string) {
  const isRequest = typeof req !== 'string';
  const pathname = (isRequest ? req.url : req) || '/';

  return new URL(
    pathname,
    origin ||
      (isRequest && req.headers.host && `http://${req.headers.host}`) ||
      'http://example.com',
  );
}

/**
 * Turns a Node request into a Web request by using native Node APIs.
 */
export function toWeb(req: IncomingMessage, headers?: Record<string, string>) {
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
 * using native Node APIs.
 */
export function pipeFromWeb(webResponse: Response, res: ServerResponse) {
  res.writeHead(
    webResponse.status,
    Object.fromEntries(webResponse.headers.entries()),
  );

  if (webResponse.body) {
    Readable.fromWeb(webResponse.body).pipe(res);
  } else {
    res.end();
  }
}

export function getHmrUrl(viteDevServer: ViteDevServer) {
  const userHmrValue = viteDevServer.config.server?.hmr;

  if (userHmrValue === false) {
    console.warn(
      'HMR is disabled. Code changes will not be reflected in neither browser or server.',
    );

    return '';
  }

  const configHmr = typeof userHmrValue === 'object' ? userHmrValue : {};

  const hmrPort = configHmr.port;
  const hmrPath = configHmr.path;

  let hmrBase = viteDevServer.config.base;
  if (hmrPath) hmrBase = path.posix.join(hmrBase, hmrPath);

  return (hmrPort ? `http://localhost:${hmrPort}` : '') + hmrBase;
}
