import {mkdtemp, rm, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {isTTY, renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {readAndParseDotEnv} from '@shopify/cli-kit/node/dot-env';
import {handler} from '@shopify/cli-kit/node/error';
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
  isTTY: vi.fn(),
  renderConfirmationPrompt: vi.fn(),
}));

const storefront = {
  id: 'gid://shopify/HydrogenStorefront/1',
  title: 'Example',
  productionUrl: 'https://example.com',
};
const environment = {
  id: 'gid://shopify/HydrogenStorefrontEnvironment/1',
  name: 'Production',
  handle: 'production',
  branch: 'main',
  createdAt: '2026-01-01T10:30:00.999+02:00',
  type: 'PRODUCTION' as const,
  url: null,
};
let directory: string;
const previewEnvironment = {
  ...environment,
  id: 'gid://shopify/HydrogenStorefrontEnvironment/2',
  name: 'Preview',
  handle: 'preview',
  branch: null,
  type: 'PREVIEW' as const,
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(isTTY).mockReturnValue(true);
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
    environments: [environment, previewEnvironment],
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
  vi.mocked(getStorefrontEnvironments).mockResolvedValue({
    ...storefront,
    environments: [environment],
  });
  const {stdout, stderr} = await captureJsonOutput(() =>
    runEnvList({path: directory}),
  );
  expect(JSON.parse(stdout)).toEqual({
    status: 'success',
    storefront: {
      gid: storefront.id,
      name: storefront.title,
      productionUrl: storefront.productionUrl,
    },
    environments: [
      {
        gid: environment.id,
        name: environment.name,
        handle: environment.handle,
        branch: environment.branch,
        createdAt: '2026-01-01T08:30:00Z',
        type: environment.type,
        url: null,
      },
    ],
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
    status: 'success',
    changed: true,
    path: join(directory, '.env'),
    variables: [{name: 'PUBLIC_KEY'}, {name: 'SECRET_KEY'}],
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

it.each([
  ['pull', runEnvPull],
  ['push', runEnvPush],
] as const)(
  'rejects non-interactive %s confirmation without leaking values',
  async (name, run) => {
    vi.mocked(isTTY).mockReturnValue(false);
    const original = 'KEY=local-private-value\n';
    await writeFile(join(directory, '.env'), original);
    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: storefront.id,
      environmentVariables: [
        {
          id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
          key: 'KEY',
          value: 'remote-private-value',
          isSecret: false,
          readOnly: false,
        },
      ],
    });
    const {stdout, stderr} = await captureJsonOutput(async () => {
      await expect(
        run({path: directory, envFile: '.env', env: 'production'}),
      ).rejects.toMatchObject({
        message: `${name === 'pull' ? 'Pulling' : 'Pushing'} environment variables requires confirmation.`,
        tryMessage: expect.stringContaining('--force'),
      });
    });
    expect(stdout + stderr).not.toContain('private-value');
    expect(renderConfirmationPrompt).not.toHaveBeenCalled();
    expect(pushStorefrontEnvVariables).not.toHaveBeenCalled();
    expect(await readFile(join(directory, '.env'), 'utf8')).toBe(original);
  },
);

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
    status: 'success',
    changed: false,
    dryRun: true,
    wouldChange: true,
    environment: {gid: environment.id, createdAt: '2026-01-01T08:30:00Z'},
    variables: [{name: 'KEY'}],
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

it('reports protected local variables as skipped even when their values match', async () => {
  await writeFile(
    join(directory, '.env'),
    'READ_ONLY=same\nSECRET=\nKEY=updated\n',
  );
  vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
    id: storefront.id,
    environmentVariables: [
      {
        id: '1',
        key: 'READ_ONLY',
        value: 'same',
        readOnly: true,
        isSecret: false,
      },
      {id: '2', key: 'SECRET', value: '', readOnly: false, isSecret: true},
      {
        id: '3',
        key: 'KEY',
        value: 'original',
        readOnly: false,
        isSecret: false,
      },
    ],
  });
  const {stdout} = await captureJsonOutput(() =>
    runEnvPush({
      path: directory,
      envFile: '.env',
      env: 'production',
      force: true,
    }),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    status: 'success',
    changed: true,
    variables: [{name: 'KEY'}],
    skipped: [{name: 'READ_ONLY'}, {name: 'SECRET'}],
  });
  expect(pushStorefrontEnvVariables).toHaveBeenCalledWith(
    expect.anything(),
    storefront.id,
    environment.id,
    [{key: 'KEY', value: 'updated'}],
  );
});

it.each([EnvList, EnvPull, EnvPush])(
  'advertises its schema and rejects invalid results: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
    expect(() => command.jsonOutputSchema.validate({status: 12})).toThrow();
  },
);

it.each([
  [{}, previewEnvironment],
  [{env: 'production'}, environment],
  [{envBranch: 'main'}, environment],
])(
  'reports the resolved pull environment for %j',
  async (selection, expected) => {
    const {stdout} = await captureJsonOutput(() =>
      runEnvPull({path: directory, envFile: '.env', ...selection}),
    );
    expect(JSON.parse(stdout).environment).toEqual({
      gid: expected.id,
      name: expected.name,
      handle: expected.handle,
      branch: expected.branch,
      createdAt: '2026-01-01T08:30:00Z',
      type: expected.type,
      url: expected.url,
    });
    expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
      expect.anything(),
      storefront.id,
      expected.handle,
    );
  },
);

it('fails before pulling when there is no Preview environment', async () => {
  vi.mocked(getStorefrontEnvironments).mockResolvedValue({
    ...storefront,
    environments: [environment],
  });
  await expect(runEnvPull({path: directory, envFile: '.env'})).rejects.toThrow(
    'Could not find the Preview environment.',
  );
  expect(getStorefrontEnvVariables).not.toHaveBeenCalled();
});

it.each(['list', 'pull'] as const)(
  'fails when %s cannot find the linked storefront',
  async (command) => {
    vi.mocked(getStorefrontEnvironments).mockResolvedValue(null);
    const {stdout} = await captureJsonOutput(async () => {
      await expect(
        command === 'list'
          ? runEnvList({path: directory})
          : runEnvPull({path: directory, envFile: '.env'}),
      ).rejects.toThrow('Couldn’t find Hydrogen storefront.');
    });
    expect(stdout).toBe('');
  },
);

it('names an unrepresentable variable without exposing its value in JSON errors', async () => {
  const value = "it's $5-private-value";
  vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
    id: storefront.id,
    environmentVariables: [
      {id: '1', key: 'PROBLEM_KEY', value, isSecret: false, readOnly: false},
    ],
  });
  vi.stubEnv('SHOPIFY_FLAG_JSON', '1');
  try {
    const {stdout, stderr} = await captureJsonOutput(async () => {
      try {
        await runEnvPull({path: directory, envFile: '.env', force: true});
      } catch (error) {
        await handler(error);
      }
    });
    expect(JSON.parse(stdout).error).toMatchObject({
      type: 'abort',
      message: expect.stringContaining('PROBLEM_KEY'),
    });
    expect(stdout + stderr).not.toContain(value);
    expect(stdout + stderr).not.toContain('private-value');
  } finally {
    vi.unstubAllEnvs();
  }
});

it.each([true, false])(
  'safely compares values containing every quote and a newline (matching=%s)',
  async (matching) => {
    const value = "private \" 'b' `c`\nd";
    await writeFile(join(directory, '.env'), `KEY=${JSON.stringify(value)}\n`);
    const {variables} = await readAndParseDotEnv(join(directory, '.env'));
    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: storefront.id,
      environmentVariables: [
        {
          id: '1',
          key: 'KEY',
          value: matching ? variables.KEY! : value,
          isSecret: false,
          readOnly: false,
        },
      ],
    });
    const {stdout, stderr} = await captureJsonOutput(() =>
      runEnvPush({
        path: directory,
        envFile: '.env',
        env: 'production',
        dryRun: true,
      }),
    );
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'success',
      changed: false,
      dryRun: true,
      wouldChange: !matching,
    });
    expect(stdout + stderr).not.toContain('private');
    expect(pushStorefrontEnvVariables).not.toHaveBeenCalled();
  },
);

it('reports no pending changes when only protected variables differ', async () => {
  await writeFile(join(directory, '.env'), 'SECRET=local-private-value\n');
  vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
    id: storefront.id,
    environmentVariables: [
      {
        id: '1',
        key: 'SECRET',
        value: 'remote-private-value',
        isSecret: true,
        readOnly: false,
      },
    ],
  });
  const {stdout, stderr} = await captureJsonOutput(() =>
    runEnvPush({
      path: directory,
      envFile: '.env',
      env: 'production',
      dryRun: true,
    }),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    wouldChange: false,
    changed: false,
    skipped: [{name: 'SECRET'}],
  });
  expect(stdout + stderr).not.toContain('private-value');
  expect(pushStorefrontEnvVariables).not.toHaveBeenCalled();
});

it('pushes a value containing every quote and a newline without serializing it as dotenv', async () => {
  const value = "private \" 'b' `c`\nd";
  await writeFile(join(directory, '.env'), `KEY=${JSON.stringify(value)}\n`);
  const {variables} = await readAndParseDotEnv(join(directory, '.env'));
  const {stdout, stderr} = await captureJsonOutput(() =>
    runEnvPush({
      path: directory,
      envFile: '.env',
      env: 'production',
      force: true,
    }),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    status: 'success',
    changed: true,
    wouldChange: true,
  });
  expect(pushStorefrontEnvVariables).toHaveBeenCalledWith(
    expect.anything(),
    storefront.id,
    environment.id,
    [{key: 'KEY', value: variables.KEY}],
  );
  expect(stdout + stderr).not.toContain('private');
});
