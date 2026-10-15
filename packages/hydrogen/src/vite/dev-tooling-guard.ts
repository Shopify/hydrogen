import type {IncomingMessage, ServerResponse} from 'node:http';
import type {Connect} from 'vite';

// cloudflared connects from loopback, so a tunneled request is only
// recognizable by the Host header it forwards. Keep in sync with
// TUNNEL_DOMAIN in packages/cli/src/lib/dev-shared.ts.
const TUNNEL_HOST_SUFFIXES = ['.trycloudflare.com', '.tryhydrogen.dev'];

const DEV_TOOL_ROUTES = [
  '/graphiql',
  '/subrequest-profiler',
  '/debug-network-server',
];

const LOOPBACK_V4_PREFIX = '127.';
const LOOPBACK_V6 = '::1';
const MAPPED_LOOPBACK_PREFIX = '::ffff:127.';

function isLoopback(addr: string | undefined): boolean {
  if (!addr) return false;
  return (
    addr.startsWith(LOOPBACK_V4_PREFIX) ||
    addr === LOOPBACK_V6 ||
    addr.startsWith(MAPPED_LOOPBACK_PREFIX)
  );
}

function hostFromHeader(raw: string | undefined): string {
  if (!raw) return '';
  if (raw.startsWith('[')) {
    const bracketEnd = raw.indexOf(']');
    if (bracketEnd !== -1) return raw.slice(1, bracketEnd);
  }
  const colonIdx = raw.lastIndexOf(':');
  return colonIdx > 0 ? raw.slice(0, colonIdx) : raw;
}

function isTunnelHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return TUNNEL_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

// The dev routes are mounted with connect's `use(route, handler)`, which
// compares case-insensitively and also matches any subpath bordered by `/`
// or `.`. The guard has to match at least as broadly, or `/Debug-Network-Server`
// and `/debug-network-server/` reach the handler unguarded.
function isDevToolRoute(pathname: string): boolean {
  const path = pathname.toLowerCase();
  for (const route of DEV_TOOL_ROUTES) {
    if (!path.startsWith(route)) continue;
    const border = path[route.length];
    if (border === undefined || border === '/' || border === '.') return true;
  }
  return false;
}

export function isRemoteDevToolingRequest(params: {
  pathname: string;
  host: string | undefined;
  remoteAddress: string | undefined;
}): boolean {
  if (!isDevToolRoute(params.pathname)) return false;
  if (isTunnelHost(hostFromHeader(params.host))) return true;
  return !isLoopback(params.remoteAddress);
}

export function createDevToolingGuard(): Connect.NextHandleFunction {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const rawPath = req.url?.split('?')[0] ?? '';

    let resolvedPath: string;
    try {
      const canonical = new URL(req.url ?? '/', 'http://n').pathname;
      try {
        resolvedPath = decodeURIComponent(canonical);
      } catch {
        resolvedPath = canonical;
      }
    } catch {
      resolvedPath = rawPath;
    }

    const check = {
      host: req.headers.host,
      remoteAddress: req.socket?.remoteAddress,
    };

    if (
      isRemoteDevToolingRequest({pathname: rawPath, ...check}) ||
      isRemoteDevToolingRequest({pathname: resolvedPath, ...check})
    ) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Hydrogen dev tooling is only available from localhost.');
      return;
    }

    next();
  };
}
