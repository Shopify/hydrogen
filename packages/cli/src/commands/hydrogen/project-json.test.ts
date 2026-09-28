import {beforeEach, expect, it, vi} from 'vitest';
import {captureJsonOutput} from '../../../tests/output.js';
import {login, logout} from '../../lib/auth.js';
import {getConfig, unsetStorefront} from '../../lib/shopify-config.js';
import {getStorefrontsWithDeployment} from '../../lib/graphql/admin/list-storefronts.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import List, {runList} from './list.js';
import Link, {runLink} from './link.js';
import Login, {runLogin} from './login.js';
import Logout, {runLogout} from './logout.js';
import Unlink, {unlinkStorefront} from './unlink.js';
import Init from './init.js';
import {presentTemplateResult} from '../../lib/onboarding/result.js';

vi.mock('../../lib/auth.js');
vi.mock('../../lib/log.js');
vi.mock('../../lib/shopify-config.js');
vi.mock('../../lib/graphql/admin/list-storefronts.js');
vi.mock('../../lib/graphql/admin/link-storefront.js');
vi.mock('../../lib/shell.js', () => ({
  getCliCommand: () => 'h2',
  ALIAS_NAME: 'h2',
}));

const config = {
  shop: 'example.myshopify.com',
  shopName: 'Example',
  email: 'developer@example.com',
};
const storefront = {
  id: 'gid://shopify/HydrogenStorefront/1',
  parsedId: '1',
  title: 'Example',
  productionUrl: 'https://example.com',
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(login).mockResolvedValue({
    session: {token: 'secret', storeFqdn: config.shop},
    config,
  });
  vi.mocked(getStorefrontsWithDeployment).mockResolvedValue([
    {...storefront, currentProductionDeployment: null},
  ]);
  vi.mocked(getStorefronts).mockResolvedValue([storefront]);
  vi.mocked(getConfig).mockResolvedValue({storefront});
});

it('lists full storefront and deployment fields without authentication tokens', async () => {
  const {stdout, stderr} = await captureJsonOutput(() => runList({}));
  expect(JSON.parse(stdout)).toEqual({
    shop: config.shop,
    storefronts: [{...storefront, currentProductionDeployment: null}],
  });
  expect(stdout).not.toContain('secret');
  expect(stderr).toBe('');
});

it('encodes empty storefront collections', async () => {
  vi.mocked(getStorefrontsWithDeployment).mockResolvedValue([]);
  const {stdout} = await captureJsonOutput(() => runList({}));
  expect(JSON.parse(stdout)).toEqual({shop: config.shop, storefronts: []});
});

it('encodes the selected storefront after linking', async () => {
  const {stdout} = await captureJsonOutput(() =>
    runLink({storefront: 'Example', force: true}),
  );
  expect(JSON.parse(stdout)).toEqual({shop: config.shop, storefront});
});

it('reports authentication and logout results without exposing session data', async () => {
  const loggedIn = await captureJsonOutput(() => runLogin({shop: config.shop}));
  expect(JSON.parse(loggedIn.stdout)).toEqual(config);
  const loggedOut = await captureJsonOutput(() =>
    runLogout({path: '/project'}),
  );
  expect(JSON.parse(loggedOut.stdout)).toEqual({loggedOut: true});
  expect(logout).toHaveBeenCalledWith('/project');
});

it('reports both unlinking and an already unlinked project', async () => {
  const unlinked = await captureJsonOutput(() =>
    unlinkStorefront({path: '/project'}),
  );
  expect(JSON.parse(unlinked.stdout)).toEqual({
    unlinked: true,
    storefront: {id: storefront.id, title: storefront.title},
  });
  expect(unsetStorefront).toHaveBeenCalledWith('/project');
  vi.mocked(getConfig).mockResolvedValue({});
  const alreadyUnlinked = await captureJsonOutput(() => unlinkStorefront({}));
  expect(JSON.parse(alreadyUnlinked.stdout)).toEqual({
    unlinked: false,
    storefront: null,
  });
});

it('encodes initialization outcomes and emits partial failures as diagnostics', async () => {
  const project = {
    location: 'example',
    name: 'example',
    directory: '/example',
    language: 'ts' as const,
    packageManager: 'npm' as const,
    depsInstalled: false,
    cliCommand: 'h2' as const,
    depsError: new Error('Install failed'),
  };
  const {stdout, stderr} = await captureJsonOutput(() =>
    presentTemplateResult(project),
  );
  expect(JSON.parse(stdout)).toEqual({
    location: 'example',
    name: 'example',
    directory: '/example',
    language: 'ts',
    packageManager: 'npm',
    depsInstalled: false,
    failures: ['dependencies'],
  });
  expect(JSON.parse(stderr)).toMatchObject({
    type: 'diagnostic',
    message: 'Install failed',
  });
  const cancelled = await captureJsonOutput(() =>
    presentTemplateResult(undefined),
  );
  expect(JSON.parse(cancelled.stdout)).toBeNull();
});

it('does not produce success output on authentication failure', async () => {
  vi.mocked(login).mockRejectedValue(new Error('Authentication failed'));
  const {stdout} = await captureJsonOutput(async () => {
    await expect(runLogin({})).rejects.toThrow('Authentication failed');
  });
  expect(stdout).toBe('');
});

it.each([List, Link, Login, Logout, Unlink, Init])(
  'exposes flags, schema and help: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
  },
);
