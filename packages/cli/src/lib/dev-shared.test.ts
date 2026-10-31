import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {listDevInstances} from '@shopify/cli-kit/node/dev-instance';
import type {TunnelClient} from '@shopify/cli-kit/node/plugins/tunnel';
import type {Config} from '@oclif/core';
import {runCustomerAccountPush} from '../commands/hydrogen/customer-account-push.js';
import {startTunnelAndPushConfig} from './dev-shared.js';
import {startTunnelPlugin} from './tunneling.js';
import {runDevSession} from './dev-session.js';
import {deferPromise} from './defer.js';

vi.mock('../commands/hydrogen/customer-account-push.js');
vi.mock('./tunneling.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./tunneling.js')>()),
  startTunnelPlugin: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

it.each([false, true])(
  'stops a pending tunnel and releases ownership on cancellation (late acquisition: %s)',
  async (lateAcquisition) => {
    const directory = await mkdtemp(join(tmpdir(), 'hydrogen-tunnel-'));
    const controller = new AbortController();
    const acquired = deferPromise();
    const tunnel: TunnelClient = {
      provider: 'cloudflare',
      port: 3000,
      stopTunnel: vi.fn(),
      getTunnelStatus: vi.fn<TunnelClient['getTunnelStatus']>(() => ({
        status: 'starting',
      })),
    };
    vi.mocked(startTunnelPlugin).mockImplementation(async () => {
      if (lateAcquisition) await acquired.promise;
      return tunnel;
    });
    const running = runDevSession(
      {
        command: 'hydrogen dev',
        directory,
        envFile: '.env',
        signal: controller.signal,
      },
      (session) =>
        startTunnelAndPushConfig(
          directory,
          {} as Config,
          3000,
          undefined,
          session.signal,
        ),
    );
    const settled = running.catch(() => {});
    try {
      await vi.waitFor(() => {
        expect(startTunnelPlugin).toHaveBeenCalled();
        if (!lateAcquisition) expect(tunnel.getTunnelStatus).toHaveBeenCalled();
      });
      controller.abort();
      acquired.resolve();
      await expect(running).resolves.toBeUndefined();
      expect(tunnel.stopTunnel).toHaveBeenCalledTimes(1);
      expect(runCustomerAccountPush).not.toHaveBeenCalled();
      expect(await listDevInstances(directory)).toHaveLength(0);
    } finally {
      controller.abort();
      acquired.resolve();
      await settled;
      await rm(directory, {recursive: true, force: true});
    }
  },
);

it('stops a connected tunnel and removes its temporary URLs during cleanup', async () => {
  const removeUrls = vi.fn();
  const stopTunnel = vi.fn();
  vi.mocked(startTunnelPlugin).mockResolvedValue({
    provider: 'cloudflare',
    port: 3000,
    stopTunnel,
    getTunnelStatus: () => ({
      status: 'connected',
      url: 'https://example.trycloudflare.com',
    }),
  });
  vi.mocked(runCustomerAccountPush).mockResolvedValue(removeUrls);

  const tunnel = await startTunnelAndPushConfig('/project', {} as Config, 3000);
  expect(tunnel.host).toBe('https://example.tryhydrogen.dev');
  expect(runCustomerAccountPush).toHaveBeenCalledWith({
    path: '/project',
    devOrigin: tunnel.host,
    storefrontId: undefined,
    signal: undefined,
  });

  await tunnel.cleanup();

  expect(stopTunnel).toHaveBeenCalledTimes(1);
  expect(removeUrls).toHaveBeenCalledTimes(1);
});

it('releases ownership when cancelled during the Customer Account push', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-tunnel-push-'));
  const controller = new AbortController();
  const pushing = deferPromise();
  const stopTunnel = vi.fn();
  vi.mocked(startTunnelPlugin).mockResolvedValue({
    provider: 'cloudflare',
    port: 3000,
    stopTunnel,
    getTunnelStatus: () => ({
      status: 'connected',
      url: 'https://example.trycloudflare.com',
    }),
  });
  vi.mocked(runCustomerAccountPush).mockImplementationOnce(
    async ({signal}) =>
      new Promise((_resolve, reject) => {
        signal!.addEventListener('abort', () => reject(signal!.reason), {
          once: true,
        });
        pushing.resolve();
      }),
  );
  const running = runDevSession(
    {
      command: 'hydrogen dev',
      directory,
      envFile: '.env',
      signal: controller.signal,
    },
    (session) =>
      startTunnelAndPushConfig(
        directory,
        {} as Config,
        3000,
        undefined,
        session.signal,
      ),
  );
  const settled = running.catch(() => {});
  try {
    await Promise.race([pushing.promise, running]);
    controller.abort();
    await expect(running).resolves.toBeUndefined();
    expect(stopTunnel).toHaveBeenCalledTimes(1);
    expect(await listDevInstances(directory)).toHaveLength(0);
  } finally {
    controller.abort();
    await settled;
    await rm(directory, {recursive: true, force: true});
  }
});

it('stops the tunnel when its provider fails before returning a URL', async () => {
  const stopTunnel = vi.fn();
  vi.mocked(startTunnelPlugin).mockResolvedValue({
    provider: 'cloudflare',
    port: 3000,
    stopTunnel,
    getTunnelStatus: () => ({status: 'error', message: 'Tunnel failed'}),
  });

  await expect(
    startTunnelAndPushConfig('/project', {} as Config, 3000),
  ).rejects.toThrow('Tunnel failed');
  expect(stopTunnel).toHaveBeenCalledTimes(1);
});
