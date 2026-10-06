import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Config} from '@oclif/core';
import ShopifyCommand from '@shopify/cli-kit/node/base-command';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import HydrogenCommand from './hydrogen-command.js';

class TestCommand extends HydrogenCommand {
  static id = 'hydrogen:build';
  ran = false;

  async run(): Promise<void> {
    this.ran = true;
  }

  async execute(): Promise<unknown> {
    return this._run();
  }
}

let projectPath: string;
const originalArgv = process.argv;
const originalExitCode = process.exitCode;

beforeEach(() => {
  projectPath = mkdtempSync(join(tmpdir(), 'hydrogen-command-'));
  vi.spyOn(process, 'cwd').mockReturnValue(projectPath);
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    process.exitCode = code ?? 0;
    return undefined as never;
  });
  vi.spyOn(
    ShopifyCommand.prototype as unknown as {init(): Promise<unknown>},
    'init',
  ).mockResolvedValue(undefined);
  vi.stubEnv('SHOPIFY_FLAG_JSON', undefined);
  vi.stubEnv('SHOPIFY_FLAG_JSON_SCHEMA', undefined);
  vi.stubEnv('SHOPIFY_HYDROGEN_FLAG_PATH', undefined);
  vi.stubEnv('INIT_CWD', projectPath);
  vi.stubEnv('NODE_ENV', 'production');
});

afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(projectPath, {recursive: true, force: true});
});

function command(argv: string[] = [], id = 'hydrogen:build') {
  const result = new TestCommand(argv, undefined as unknown as Config);
  result.id = id;
  vi.spyOn(
    result as unknown as {removeEnvVar(): void},
    'removeEnvVar',
  ).mockImplementation(() => {});
  process.argv = [process.execPath, 'shopify', id, ...argv];
  return result;
}

function createProject(path = projectPath, disabledCommands: string[] = []) {
  mkdirSync(path, {recursive: true});
  writeFileSync(
    join(path, 'package.json'),
    JSON.stringify({dependencies: {'@shopify/hydrogen': '*'}}),
  );
  const packagePath = join(path, 'node_modules/@shopify/hydrogen');
  mkdirSync(packagePath, {recursive: true});
  writeFileSync(
    join(packagePath, 'package.json'),
    JSON.stringify({shopify: {cli: {disabledCommands}}}),
  );
}

it.each(['--json', '-j', 'environment'])(
  'uses the command error lifecycle for non-project JSON errors: %s',
  async (mode) => {
    if (mode === 'environment') vi.stubEnv('SHOPIFY_FLAG_JSON', '1');
    const subject = command(mode === 'environment' ? [] : [mode]);
    await withCapturedStandardStreams(async ({stdout, stderr}) => {
      await subject.execute();
      expect(JSON.parse(stdout())).toEqual({
        error: {
          type: 'abort',
          message:
            "Looks like you're trying to run a Hydrogen command outside of a Hydrogen project.",
          tryMessage: expect.stringContaining('shopify hydrogen init'),
        },
      });
      expect(stderr()).toBe('');
      expect(subject.ran).toBe(false);
      expect(process.exitCode).toBe(1);
    });
  },
);

it('uses the command error lifecycle for disabled commands', async () => {
  createProject(projectPath, ['hydrogen:build']);
  const subject = command(['--json']);
  await withCapturedStandardStreams(async ({stdout, stderr}) => {
    await subject.execute();
    expect(JSON.parse(stdout())).toEqual({
      error: {
        type: 'abort',
        message:
          '`shopify hydrogen build` is not supported by this version of Hydrogen',
        tryMessage:
          'The installed version of @shopify/hydrogen disables this command.',
        nextSteps: ['Use your framework or package tooling instead.'],
      },
    });
    expect(stderr()).toBe('');
    expect(subject.ran).toBe(false);
    expect(process.exitCode).toBe(1);
  });
});

it.each([{argv: []}, {argv: ['--', '--json']}])(
  'rejects non-project text commands with arguments %j',
  async ({argv}) => {
    const subject = command(argv);
    await withCapturedStandardStreams(async ({stdout, stderr}) => {
      await subject.execute();
      expect(stdout()).toBe('');
      expect(stderr().replaceAll('│', '').replace(/\s+/g, ' ')).toContain(
        'outside of a Hydrogen project',
      );
      expect(subject.ran).toBe(false);
      expect(process.exitCode).toBe(1);
    });
  },
);

it.each([
  {argv: []},
  {argv: ['--path', 'storefront']},
  {argv: ['--path=storefront']},
  {argv: ['environment']},
])('runs in a Hydrogen project: %j', async ({argv}) => {
  if (argv[0] === 'environment')
    vi.stubEnv('SHOPIFY_HYDROGEN_FLAG_PATH', 'storefront');
  createProject(argv.length ? join(projectPath, 'storefront') : projectPath);
  const subject = command(argv[0] === 'environment' ? [] : argv);
  await subject.execute();
  expect(subject.ran).toBe(true);
});

it.each(['--help', '-h', '--json-schema', 'environment'])(
  'permits help and schema discovery outside a project: %s',
  async (mode) => {
    if (mode === 'environment') vi.stubEnv('SHOPIFY_FLAG_JSON_SCHEMA', '1');
    const subject = command(mode === 'environment' ? [] : [mode]);
    await subject.execute();
    expect(subject.ran).toBe(true);
  },
);

it.each(['hydrogen:init', 'theme:dev'])(
  'does not validate another command: %s',
  async (id) => {
    const subject = command([], id);
    await subject.execute();
    expect(subject.ran).toBe(true);
  },
);
