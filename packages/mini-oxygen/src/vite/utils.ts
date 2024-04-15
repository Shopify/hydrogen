import type {IncomingMessage} from 'node:http';
import path from 'node:path';
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
