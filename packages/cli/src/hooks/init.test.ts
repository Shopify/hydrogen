import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Config, Hook} from '@oclif/core';
import {
  mockAndCaptureOutput,
  withCapturedStandardStreams,
} from '@shopify/cli-kit/node/testing/output';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import hook from './init.js';

const originalArgv = process.argv;
const output = mockAndCaptureOutput();
const exitError = new Error('process.exit');
let projectPath: string;

beforeEach(() => {
  projectPath = mkdtempSync(join(tmpdir(), 'hydrogen-init-hook-'));
  vi.spyOn(process, 'cwd').mockReturnValue(projectPath);
  vi.spyOn(process, 'exit').mockImplementation(() => {
    throw exitError;
  });
  vi.stubEnv('SHOPIFY_FLAG_JSON', undefined);
  vi.stubEnv('SHOPIFY_FLAG_JSON_SCHEMA', undefined);
  vi.stubEnv('INIT_CWD', projectPath);
  output.clear();
});

afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(projectPath, {recursive: true, force: true});
});

function runHook(id = 'hydrogen:build', argv: string[] = []) {
  process.argv = [process.execPath, 'shopify', id, ...argv];
  const context: Hook.Context = {
    config: {} as Config,
    debug: vi.fn(),
    error: vi.fn(),
    exit: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  };
  return hook.call(context, {id, argv, config: context.config, context});
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

it.each([{argv: []}, {argv: ['--', '--json']}])(
  'keeps the existing non-project warning without a JSON flag: $argv',
  async ({argv}) => {
    await expect(runHook('hydrogen:build', argv)).rejects.toThrow(exitError);
    expect(output.output()).toContain('warning');
    expect(output.output().replaceAll('│', '').replace(/\s+/g, ' ')).toContain(
      'outside of a Hydrogen project',
    );
    expect(output.output()).toContain('Getting started:');
    expect(process.exit).toHaveBeenCalledWith(1);
  },
);

it.each(['--json', '-j', 'environment'])(
  'writes one standard JSON error before exiting for %s',
  async (mode) => {
    if (mode === 'environment') vi.stubEnv('SHOPIFY_FLAG_JSON', '1');
    await withCapturedStandardStreams(async ({stdout, stderr}) => {
      await expect(
        runHook('hydrogen:build', mode === 'environment' ? [] : [mode]),
      ).rejects.toThrow(exitError);
      expect(JSON.parse(stdout())).toEqual({
        error: {
          type: 'abort',
          message:
            "Looks like you're trying to run a Hydrogen command outside of a Hydrogen project.",
          tryMessage: expect.stringContaining('shopify hydrogen init'),
        },
      });
      expect(stderr()).toBe('');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  },
);

it('writes the standard JSON error for a disabled command', async () => {
  createProject(projectPath, ['hydrogen:build']);
  await withCapturedStandardStreams(async ({stdout, stderr}) => {
    await expect(runHook('hydrogen:build', ['--json'])).rejects.toThrow(
      exitError,
    );
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
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

it.each([
  {argv: []},
  {argv: ['--path', 'storefront']},
  {argv: ['--path=storefront']},
])('allows a Hydrogen project with arguments $argv', async ({argv}) => {
  createProject(argv.length ? join(projectPath, 'storefront') : projectPath);
  await runHook('hydrogen:build', argv);
  expect(process.exit).not.toHaveBeenCalled();
  expect(output.output()).toBe('');
});

it.each(['--help', '-h', '--json-schema', 'environment'])(
  'allows help and schema discovery outside a project: %s',
  async (mode) => {
    if (mode === 'environment') vi.stubEnv('SHOPIFY_FLAG_JSON_SCHEMA', '1');
    await runHook('hydrogen:build', mode === 'environment' ? [] : [mode]);
    expect(process.exit).not.toHaveBeenCalled();
    expect(output.output()).toBe('');
  },
);

it.each(['hydrogen:init', 'theme:dev'])(
  'does not require a Hydrogen project for %s',
  async (id) => {
    await runHook(id);
    expect(process.exit).not.toHaveBeenCalled();
    expect(output.output()).toBe('');
  },
);
