import type {ServerResponse, IncomingMessage} from 'node:http';
import {Readable} from 'node:stream';
import {Request, Response} from 'miniflare';

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

export function toWeb(req: IncomingMessage, headers?: Record<string, string>) {
  return new Request(toURL(req), {
    method: req.method,
    headers: {...headers, ...(req.headers as object)},
    body: req.headers['content-length'] ? Readable.toWeb(req) : undefined,
    duplex: 'half', // This is required when sending a ReadableStream as body
    redirect: 'manual', // Avoid consuming 300 responses here, return to browser
  });
}
