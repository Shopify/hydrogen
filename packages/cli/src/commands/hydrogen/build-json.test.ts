import {afterEach, expect, it, vi} from 'vitest';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {captureJsonOutput} from '../../../tests/output.js';
import {getRemixConfig} from '../../lib/remix-config.js';
import {codegen} from '../../lib/codegen.js';
import Check, {runCheckRoutes} from './check.js';
import Codegen, {runCodegen} from './codegen.js';
import Build from './build.js';
import {writeJsonResult} from '../../lib/json-output.js';

vi.mock('../../lib/remix-config.js', () => ({
  getRemixConfig: vi.fn(),
  getProjectPaths: () => ({root: '/project'}),
}));
vi.mock('../../lib/codegen.js', () => ({
  codegen: vi.fn(),
  spawnCodegenProcess: vi.fn(),
}));
afterEach(() => vi.restoreAllMocks());

it('encodes missing and reserved routes in one document without text banners', async () => {
  vi.mocked(getRemixConfig).mockResolvedValue({
    routes: {root: {id: 'root'}, cdn: {id: 'cdn', path: 'cdn/private'}},
  } as any);
  const {stdout, stderr} = await captureJsonOutput(() =>
    runCheckRoutes({directory: '/project'}),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    missingRoutes: expect.arrayContaining(['cart']),
    reservedRoutes: ['cdn/private'],
  });
  expect(stderr).toBe('');
});

it('encodes generated files and preserves diagnostics on stderr', async () => {
  vi.mocked(getRemixConfig).mockResolvedValue({
    rootDirectory: '/project',
  } as any);
  vi.mocked(codegen).mockImplementation(async () => {
    outputInfo('Generating types');
    return {'storefrontapi.generated.d.ts': ['app/**/*.tsx']};
  });
  const {stdout, stderr} = await captureJsonOutput(() =>
    runCodegen({directory: '/project'}),
  );
  expect(JSON.parse(stdout)).toEqual({
    generatedFiles: {'storefrontapi.generated.d.ts': ['app/**/*.tsx']},
  });
  expect(JSON.parse(stderr)).toMatchObject({
    type: 'diagnostic',
    message: 'Generating types',
  });
});

it('keeps codegen failures on the fatal-error path', async () => {
  vi.mocked(codegen).mockRejectedValue(new Error('Invalid query'));
  const {stdout} = await captureJsonOutput(async () => {
    await expect(runCodegen({directory: '/project'})).rejects.toThrow(
      'Invalid query',
    );
  });
  expect(stdout).toBe('');
});

it('encodes build output paths through the real writer', async () => {
  const result = {
    directory: '/project',
    clientDirectory: '/project/dist/client',
    serverDirectory: '/project/dist/server',
    serverFile: '/project/dist/server/index.js',
  };
  const {stdout} = await captureJsonOutput(() =>
    writeJsonResult(Build.jsonOutputSchema, result),
  );
  expect(JSON.parse(stdout)).toEqual(result);
  expect(() =>
    Build.jsonOutputSchema.encode({...result, serverFile: null} as any),
  ).toThrow();
});

it.each([Build, Codegen, Check])(
  'declares JSON flags and discoverable schemas: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
  },
);

it.each([Build, Codegen])(
  'rejects JSON watch mode before execution: %s',
  async (Command) => {
    const command = new Command([], {} as any);
    vi.spyOn(command as any, 'parse').mockResolvedValue({
      flags: {json: true, watch: true},
    });
    await expect(command.run()).rejects.toThrow(
      '--json cannot be combined with --watch',
    );
  },
);

it('rejects invalid fields and preserves empty collections', () => {
  expect(() =>
    Check.jsonOutputSchema.encode({
      missingRoutes: [1],
      reservedRoutes: [],
    } as any),
  ).toThrow();
  expect(() =>
    Codegen.jsonOutputSchema.encode({generatedFiles: {types: 1}} as any),
  ).toThrow();
  expect(
    JSON.parse(
      Check.jsonOutputSchema.encode({missingRoutes: [], reservedRoutes: []}),
    ),
  ).toEqual({missingRoutes: [], reservedRoutes: []});
  expect(
    JSON.parse(Codegen.jsonOutputSchema.encode({generatedFiles: {}})),
  ).toEqual({generatedFiles: {}});
});
