import {mkdtemp, rm, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {captureJsonOutput} from '../../../../tests/output.js';
import {login} from '../../../lib/auth.js';
import {verifyLinkedStorefront} from '../../../lib/verify-linked-storefront.js';
import {getStorefrontEnvironments} from '../../../lib/graphql/admin/list-environments.js';
import {getStorefrontEnvVariables} from '../../../lib/graphql/admin/pull-variables.js';
import {pushStorefrontEnvVariables} from '../../../lib/graphql/admin/push-variables.js';
import EnvList, {runEnvList} from './list.js';
import EnvPull, {runEnvPull} from './pull.js';
import EnvPush, {runEnvPush} from './push.js';

vi.mock('../../../lib/auth.js');
vi.mock('../../../lib/verify-linked-storefront.js');
vi.mock('../../../lib/graphql/admin/list-environments.js');
vi.mock('../../../lib/graphql/admin/pull-variables.js');
vi.mock('../../../lib/graphql/admin/push-variables.js');
vi.mock('../../../lib/shell.js', () => ({getCliCommand: () => 'h2'}));
vi.mock('@shopify/cli-kit/node/ui', async (original) => ({
  ...(await original<any>()),
  renderConfirmationPrompt: vi.fn(),
}));

const storefront = {
  id: 'gid://shopify/HydrogenStorefront/1',
  title: 'Example',
  productionUrl: 'https://example.com',
};
const environment = {
  id: '1',
  name: 'Production',
  handle: 'production',
  branch: 'main',
  createdAt: '2026-01-01',
  type: 'PRODUCTION' as const,
  url: null,
};
let directory: string;

beforeEach(async () => {
  vi.clearAllMocks();
  directory = await mkdtemp(join(tmpdir(), 'hydrogen-env-json-'));
  vi.mocked(login).mockResolvedValue({
    session: {token: 'secret', storeFqdn: 'example.myshopify.com'},
    config: {
      storefront,
      shop: 'example.myshopify.com',
      shopName: 'Example',
      email: 'developer@example.com',
    },
  });
  vi.mocked(verifyLinkedStorefront).mockResolvedValue(storefront);
  vi.mocked(getStorefrontEnvironments).mockResolvedValue({
    ...storefront,
    environments: [environment],
  });
  vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
    id: storefront.id,
    environmentVariables: [],
  });
  vi.mocked(pushStorefrontEnvVariables).mockResolvedValue({
    userErrors: [],
  } as any);
});
afterEach(async () => {
  await rm(directory, {recursive: true, force: true});
});

it('lists every environment field and handles a missing preview environment', async () => {
  const {stdout, stderr} = await captureJsonOutput(() =>
    runEnvList({path: directory}),
  );
  expect(JSON.parse(stdout)).toEqual({
    ...storefront,
    environments: [environment],
  });
  expect(stderr).toBe('');
});

it('encodes an empty environment list', async () => {
  vi.mocked(getStorefrontEnvironments).mockResolvedValue({
    ...storefront,
    environments: [],
  });
  const {stdout} = await captureJsonOutput(() => runEnvList({path: directory}));
  expect(JSON.parse(stdout).environments).toEqual([]);
});

it('pulls values into the file and emits a receipt without values on stdout', async () => {
  vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
    id: storefront.id,
    environmentVariables: [
      {
        id: '1',
        key: 'PUBLIC_KEY',
        value: 'public-value',
        isSecret: false,
        readOnly: false,
      },
      {
        id: '2',
        key: 'SECRET_KEY',
        value: 'secret-value',
        isSecret: true,
        readOnly: false,
      },
    ],
  });
  const {stdout} = await captureJsonOutput(() =>
    runEnvPull({path: directory, envFile: '.env', force: true}),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    status: 'pulled',
    file: join(directory, '.env'),
    variables: [{key: 'PUBLIC_KEY'}, {key: 'SECRET_KEY'}],
  });
  expect(stdout).not.toContain('public-value');
  expect(stdout).not.toContain('secret-value');
  expect(await readFile(join(directory, '.env'), 'utf8')).toContain(
    'PUBLIC_KEY=public-value',
  );
});

it('preserves confirmation prompts in JSON mode and reports cancellation', async () => {
  await writeFile(join(directory, '.env'), 'KEY=value\n');
  vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);
  const {stdout} = await captureJsonOutput(() =>
    runEnvPush({path: directory, envFile: '.env', env: 'production'}),
  );
  expect(renderConfirmationPrompt).toHaveBeenCalled();
  expect(JSON.parse(stdout).status).toBe('cancelled');
  expect(pushStorefrontEnvVariables).not.toHaveBeenCalled();
});

it('reports dry runs without exposing diff values or making a mutation', async () => {
  await writeFile(join(directory, '.env'), 'KEY=private-value\n');
  const {stdout} = await captureJsonOutput(() =>
    runEnvPush({
      path: directory,
      envFile: '.env',
      env: 'production',
      dryRun: true,
    }),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    status: 'dry-run',
    environment,
    variables: ['KEY'],
    skipped: [],
  });
  expect(stdout).not.toContain('private-value');
  expect(pushStorefrontEnvVariables).not.toHaveBeenCalled();
});

it('propagates upload failures without a successful document', async () => {
  await writeFile(join(directory, '.env'), 'KEY=value\n');
  vi.mocked(pushStorefrontEnvVariables).mockResolvedValue({
    userErrors: [{message: 'Permission denied'}],
  } as any);
  const {stdout} = await captureJsonOutput(async () => {
    await expect(
      runEnvPush({
        path: directory,
        envFile: '.env',
        env: 'production',
        force: true,
      }),
    ).rejects.toThrow('Failed to upload');
  });
  expect(stdout).toBe('');
});

it.each([EnvList, EnvPull, EnvPush])(
  'advertises its schema and rejects invalid results: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
    expect(() => command.jsonOutputSchema.validate({status: 12})).toThrow();
  },
);
