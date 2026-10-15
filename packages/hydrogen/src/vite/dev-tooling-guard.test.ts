import {describe, it, expect, vi} from 'vitest';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {createDevToolingGuard} from './dev-tooling-guard.js';

const LOOPBACK = '::1';
const LAN = '::ffff:192.168.86.52';
const BLOCKED_BODY = 'Hydrogen dev tooling is only available from localhost.';

function run(req: {url: string; remoteAddress?: string; host?: string}) {
  const res = {writeHead: vi.fn().mockReturnThis(), end: vi.fn()};
  const next = vi.fn();

  createDevToolingGuard()(
    {
      url: req.url,
      headers: {host: req.host ?? 'localhost:3000'},
      socket: {remoteAddress: req.remoteAddress},
    } as unknown as IncomingMessage,
    res as unknown as ServerResponse,
    next,
  );

  return {res, next};
}

describe('createDevToolingGuard', () => {
  it.each([
    ['/debug-network-server', LOOPBACK, 'localhost:3000'],
    ['/subrequest-profiler', '::ffff:127.0.0.1', 'localhost:3000'],
    ['/graphiql', '127.0.0.1', '[::1]:3000'],
    ['/products/foo', LAN, undefined],
    ['/debug-network-serverx', LAN, undefined],
    ['/graphiql-docs', LAN, undefined],
    ['/%67raphiql', LOOPBACK, undefined],
    ['/debug-network-server/..', LOOPBACK, undefined],
  ])('passes %s from %s with Host %s', (url, remoteAddress, host) => {
    const {res, next} = run({url, remoteAddress, host});

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  it.each([
    ['/debug-network-server', LAN, undefined],
    ['/debug-network-server', LOOPBACK, 'abc.tryhydrogen.dev'],
    ['/debug-network-server', LOOPBACK, 'abc.trycloudflare.com:443'],
    ['/debug-network-server', LOOPBACK, 'abc.TRYCLOUDFLARE.COM'],
    ['/debug-network-server', LOOPBACK, 'ABC.TRYHYDROGEN.DEV'],
    ['/debug-network-server', LOOPBACK, 'abc.trycloudflare.com.'],
    ['/debug-network-server', LOOPBACK, 'abc.tryhydrogen.dev.'],
    ['/graphiql', LOOPBACK, 'abc.trycloudflare.com.:443'],
    ['/debug-network-server', undefined, undefined],
    ['/debug-network-server/', LAN, undefined],
    ['/debug-network-server/x', LAN, undefined],
    ['/debug-network-server.json', LAN, undefined],
    ['/Debug-Network-Server', LAN, undefined],
    ['/debug-network-server?x=1', LAN, undefined],
    ['/graphiql/customer-account.schema.json', LAN, undefined],
    ['/GraphiQL', LAN, undefined],
    ['/x/../graphiql', LAN, undefined],
    ['/x/../subrequest-profiler', LAN, undefined],
    ['/x/../debug-network-server', LAN, undefined],
    ['/./graphiql', LAN, undefined],
    ['/debug-network-server/..', LAN, undefined],
    ['/debug-network-server/../', LAN, undefined],
    ['/graphiql/..', LAN, undefined],
    ['/%67raphiql', LAN, undefined],
    ['/subrequest%2dprofiler', LAN, undefined],
    ['/%64ebug-network-server', LAN, undefined],
  ])('blocks %s from %s with Host %s', (url, remoteAddress, host) => {
    const {res, next} = run({url, remoteAddress, host});

    expect(next).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(404, {
      'Content-Type': 'text/plain',
    });
    expect(res.end).toHaveBeenCalledWith(BLOCKED_BODY);
  });

  it.each([
    // Absolute-form targets — parser mismatch between WHATWG and Connect
    ['http:///debug-network-server', LOOPBACK],
    ['http:///graphiql', LOOPBACK],
    ['http:///subrequest-profiler', LOOPBACK],
    ['http://192.168.86.52:3000/graphiql', LAN],
    ['http://192.168.86.52:3000/debug-network-server', LAN],
    // Malformed URLs that fail URL parsing
    ['//[::1/../../graphiql', LAN],
  ])('rejects %s with 400', (url, remoteAddress) => {
    const {res, next} = run({url, remoteAddress});

    expect(next).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      'Content-Type': 'text/plain',
    });
    expect(res.end).toHaveBeenCalledWith('Bad Request');
  });
});
