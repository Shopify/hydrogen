import {afterEach, expect, it, vi} from 'vitest';
import {AbortError, handler} from '@shopify/cli-kit/node/error';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {captureJsonOutput} from '../../tests/output.js';
import {renderMissingStorefront} from './render-errors.js';

afterEach(() => vi.unstubAllEnvs());

it.each(['json', 'text'])(
  'uses CLI Kit to render a missing storefront as %s',
  async (mode) => {
    vi.stubEnv('SHOPIFY_FLAG_JSON', mode === 'json' ? '1' : '0');
    const run = async () => {
      let failure: unknown;
      try {
        renderMissingStorefront({
          session: {token: 'secret', storeFqdn: 'example.myshopify.com'},
          storefront: {
            id: 'gid://shopify/HydrogenStorefront/1',
            title: 'Example',
          },
          cliCommand: 'h2',
        });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(AbortError);
      await handler(failure);
    };
    const {stdout, stderr} =
      mode === 'json'
        ? await captureJsonOutput(run)
        : await withCapturedStandardStreams(async (streams) => {
            await run();
            return {stdout: streams.stdout(), stderr: streams.stderr()};
          });

    if (mode === 'json') {
      expect(JSON.parse(stdout)).toEqual({
        error: {
          type: 'abort',
          message: 'Couldn’t find Hydrogen storefront.',
          tryMessage: expect.stringContaining(
            'Example (ID: 1) on example.myshopify.com',
          ),
        },
      });
      expect(stdout).toContain('h2 link');
      expect(stdout).toContain('https://');
      expect(stdout).not.toContain('secret');
      expect(stderr).toBe('');
    } else {
      expect(stdout).toBe('');
      expect(stderr).toContain('Couldn’t find Hydrogen storefront.');
      expect(stderr).toContain('Hydrogen Storefronts Admin');
    }
  },
);
