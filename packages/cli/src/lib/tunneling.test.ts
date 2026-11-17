import {expect, it, vi} from 'vitest';
import type {TunnelClient} from '@shopify/cli-kit/node/plugins/tunnel';
import {pollTunnelURL} from './tunneling.js';

it.each(['not-started', 'starting'] as const)(
  'waits for a %s tunnel to connect',
  async (status) => {
    const tunnel: TunnelClient = {
      provider: 'cloudflare',
      port: 3000,
      stopTunnel: vi.fn(),
      getTunnelStatus: vi
        .fn()
        .mockReturnValueOnce({status})
        .mockReturnValue({status: 'connected', url: 'https://example.com'}),
    };

    await expect(pollTunnelURL(tunnel)).resolves.toBe('https://example.com');
  },
);

it('cancels a pending tunnel without waiting for the next poll', async () => {
  const controller = new AbortController();
  const tunnel: TunnelClient = {
    provider: 'cloudflare',
    port: 3000,
    stopTunnel: vi.fn(),
    getTunnelStatus: vi.fn<TunnelClient['getTunnelStatus']>(() => ({
      status: 'starting',
    })),
  };
  const pending = pollTunnelURL(tunnel, controller.signal);
  const nextPoll = new Promise((resolve) => setTimeout(resolve, 400));

  controller.abort();

  await expect(Promise.race([pending, nextPoll])).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(tunnel.getTunnelStatus).toHaveBeenCalledTimes(1);
});

it('does not poll after cancellation', async () => {
  const reason = new Error('Cancelled');
  const tunnel: TunnelClient = {
    provider: 'cloudflare',
    port: 3000,
    stopTunnel: vi.fn(),
    getTunnelStatus: vi.fn<TunnelClient['getTunnelStatus']>(() => ({
      status: 'starting',
    })),
  };

  await expect(pollTunnelURL(tunnel, AbortSignal.abort(reason))).rejects.toBe(
    reason,
  );
  expect(tunnel.getTunnelStatus).not.toHaveBeenCalled();
});

it('reports a provider error', async () => {
  const tunnel: TunnelClient = {
    provider: 'cloudflare',
    port: 3000,
    stopTunnel: vi.fn(),
    getTunnelStatus: () => ({status: 'error', message: 'Tunnel failed'}),
  };

  await expect(pollTunnelURL(tunnel)).rejects.toThrow('Tunnel failed');
});
