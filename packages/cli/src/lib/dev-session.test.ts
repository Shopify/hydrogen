import {Console} from 'node:console';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {listDevInstances} from '@shopify/cli-kit/node/dev-instance';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {renderFatalError, renderSuccess} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {emitCommandEvent} from '@shopify/cli-kit/node/command-events';
import {devSessionJsonOutputSchema} from './dev-session/types.js';
import {runDevSession} from './dev-session.js';
import {deferPromise} from './defer.js';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.map((directory) =>
      rm(directory, {recursive: true, force: true}),
    ),
  );
  directories.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function fixture() {
  vi.stubGlobal(
    'console',
    new Console({stdout: process.stdout, stderr: process.stderr}),
  );
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-dev-session-'));
  directories.push(directory);
  const controller = new AbortController();
  return {
    directory,
    controller,
    options: {
      command: 'hydrogen dev' as const,
      directory,
      envFile: '.env',
      signal: controller.signal,
    },
    async log() {
      const folder = join(directory, '.shopify', 'dev');
      const file = (await readdir(folder)).find((name) =>
        name.endsWith('.jsonl'),
      )!;
      return readFile(join(folder, file), 'utf8');
    },
  };
}

it('publishes readiness and drains repeated runtime output before releasing ownership', async () => {
  const {options, controller, directory, log} = await fixture();
  const close = vi.fn(async () => {
    console.log('Closing worker');
  });
  const output = await withCapturedStandardStreams(async (streams) => {
    await runDevSession(options, async (session) => {
      session.cleanup(close);
      await session.ready(['http://localhost:3000/']);
      const [info] = await listDevInstances(directory);
      expect(info).toMatchObject({
        status: 'running',
        details: {urls: ['http://localhost:3000/']},
      });
      for (let index = 0; index < 1000; index++)
        console.log(`Rebuild ${index}`);
      console.error('Recoverable worker failure');
      controller.abort();
    });
    return {stdout: streams.stdout(), stderr: streams.stderr()};
  });
  expect(output.stdout).toContain('Rebuild 999');
  expect(output.stderr).toContain('Recoverable worker failure');
  const records = (await log())
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(records).toHaveLength(1005);
  expect(records.at(-2)).toMatchObject({message: 'Closing worker'});
  expect(records.at(-1)).toMatchObject({message: 'Runtime stopped'});
  expect(close).toHaveBeenCalledTimes(1);
  expect(
    (await readdir(join(directory, '.shopify', 'dev'))).every((name) =>
      name.endsWith('.jsonl'),
    ),
  ).toBe(true);
});

it('releases resources and ownership when startup fails', async () => {
  const {options, directory} = await fixture();
  const close = vi.fn();
  const error = new Error('Worker could not start');
  await expect(
    runDevSession(options, async (session) => {
      session.cleanup(close);
      throw error;
    }),
  ).rejects.toBe(error);
  expect(close).toHaveBeenCalledTimes(1);
  expect(await readdir(join(directory, '.shopify', 'dev'))).toHaveLength(1);
});

it('only assigns severity to output with a known level', async () => {
  const {options, controller, log} = await fixture();
  await withCapturedStandardStreams(() =>
    runDevSession(options, async (session) => {
      outputInfo('Plain info line');
      renderSuccess({body: 'Setup complete'});
      renderFatalError(new AbortError('Rendered runtime failure'));
      console.warn('Worker warning');
      console.error('Worker error');
      session.log('Entry point stack', 'error');
      controller.abort();
    }),
  );
  const records = (await log())
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  for (const message of [
    'Plain info line',
    'Setup complete',
    'Rendered runtime failure',
    'Worker warning',
  ]) {
    const record = records.find((record) => record.message.includes(message));
    expect(record).toBeDefined();
    expect(record).not.toHaveProperty('level');
  }
  for (const message of ['Worker error', 'Entry point stack']) {
    expect(records).toContainEqual(
      expect.objectContaining({level: 'error', message}),
    );
  }
});

it('cancels while startup is pending and closes acquired resources', async () => {
  const {options, controller} = await fixture();
  const close = vi.fn();
  await runDevSession(options, async (session) => {
    session.cleanup(close);
    controller.abort();
    await new Promise<void>((resolve) =>
      session.cleanup(async () => resolve()),
    );
  });
  expect(close).toHaveBeenCalledTimes(1);
});

it('keeps ownership until startup settles and late resources are closed', async () => {
  const {options, controller, directory} = await fixture();
  const continueStartup = deferPromise();
  const closeEarly = vi.fn();
  const closeLate = vi.fn();
  const running = runDevSession(options, async (session) => {
    session.cleanup(closeEarly);
    controller.abort();
    await continueStartup.promise;
    session.cleanup(closeLate);
    session.signal.throwIfAborted();
  });
  try {
    await vi.waitFor(() => expect(closeEarly).toHaveBeenCalledTimes(1));
    expect(await listDevInstances(directory)).toHaveLength(1);
    await expect(
      runDevSession({...options, signal: AbortSignal.abort()}, async () => {}),
    ).rejects.toMatchObject({code: 'dev_instance_already_running'});
  } finally {
    continueStartup.resolve();
    await running;
  }
  expect(closeLate).toHaveBeenCalledTimes(1);
  expect(await listDevInstances(directory)).toHaveLength(0);
});

it('refuses a duplicate without truncating the running log', async () => {
  const {options, controller, log} = await fixture();
  await runDevSession(options, async (session) => {
    session.log('Owner output');
    await expect(runDevSession(options, async () => {})).rejects.toMatchObject({
      code: 'dev_instance_already_running',
    });
    controller.abort();
  });
  expect(await log()).toContain('Owner output');
});

it('runs all cleanup callbacks and reports a cleanup failure', async () => {
  const {options, controller, directory} = await fixture();
  const close = vi.fn();
  const error = new Error('Could not close worker');
  await expect(
    runDevSession(options, async (session) => {
      session.cleanup(close);
      session.cleanup(async () => {
        throw error;
      });
      controller.abort();
    }),
  ).rejects.toBe(error);
  expect(close).toHaveBeenCalledTimes(1);
  expect(await readdir(join(directory, '.shopify', 'dev'))).toHaveLength(1);
});

it('uses the same owner when the project is accessed through a symlink', async () => {
  const {options, controller, directory} = await fixture();
  const alias = join(directory, 'project-link');
  await symlink(directory, alias, 'junction');
  await runDevSession(options, async () => {
    await expect(
      runDevSession(
        {...options, directory: alias, signal: AbortSignal.abort()},
        async () => {},
      ),
    ).rejects.toMatchObject({code: 'dev_instance_already_running'});
    controller.abort();
  });
});

it('keys a symlinked project by the env file its original path loads', async () => {
  const {options, controller, directory} = await fixture();
  const project = join(directory, 'actual', 'project');
  const links = join(directory, 'links');
  const alias = join(links, 'project');
  await mkdir(project, {recursive: true});
  await mkdir(links);
  await symlink(project, alias, 'junction');
  const actualEnvFile = join(directory, 'actual', 'staging.env');
  const linkedEnvFile = join(links, 'staging.env');
  await writeFile(actualEnvFile, 'STORE=actual');
  await writeFile(linkedEnvFile, 'STORE=linked');
  await runDevSession(
    {...options, directory: alias, envFile: '../staging.env'},
    async () => {
      const [info] = await listDevInstances(project);
      expect(info?.details.envFile).toBe(await realpath(linkedEnvFile));
      await expect(
        runDevSession(
          {
            ...options,
            directory: project,
            envFile: '../staging.env',
            signal: AbortSignal.abort(),
          },
          async () => {},
        ),
      ).resolves.toBeUndefined();
      await expect(
        runDevSession(
          {
            ...options,
            directory: project,
            envFile: linkedEnvFile,
            signal: AbortSignal.abort(),
          },
          async () => {},
        ),
      ).rejects.toMatchObject({code: 'dev_instance_already_running'});
      controller.abort();
    },
  );
});

it('supports long project paths and environment names', async () => {
  const {options, controller, directory} = await fixture();
  const project = join(directory, 'a'.repeat(100), 'b'.repeat(100));
  await mkdir(project, {recursive: true});
  await runDevSession(
    {...options, directory: project, env: 'environment'.repeat(20)},
    async (session) => {
      await session.ready(['http://localhost:3000/']);
      controller.abort();
    },
  );
  expect(await readdir(join(project, '.shopify', 'dev'))).toHaveLength(1);
});

it('awaits resources registered during shutdown before releasing ownership', async () => {
  const {options, controller, directory} = await fixture();
  const close = vi.fn(async () => {
    expect(await listDevInstances(directory)).toHaveLength(1);
  });
  await runDevSession(options, async (session) => {
    session.cleanup(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      session.cleanup(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        await close();
      });
    });
    controller.abort();
  });
  expect(close).toHaveBeenCalledTimes(1);
});

it('streams identical JSONL bytes to stdout and the log while diagnostics use stderr', async () => {
  const {options, controller, log} = await fixture();
  const output = await withCapturedStandardStreams(async (streams) => {
    await runDevSession({...options, json: true}, async (session) => {
      await session.ready(['http://localhost:3000/']);
      outputInfo('Dependency setup diagnostic');
      console.log('\u001b[32mWorker ready\u001b[0m');
      console.error('Recoverable worker error');
      console.dir({worker: 'Hydrogen'});
      console.table([{request: '/products', status: 200}]);
      console.assert(false, 'Recoverable assertion');
      session.log('Rebuilt storefront');
      session.log('Rebuilt storefront');
      controller.abort();
    });
    return {stdout: streams.stdout(), stderr: streams.stderr()};
  });
  expect(output.stdout).toBe(await log());
  const records = output.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(
    records.map((record) => devSessionJsonOutputSchema.validate(record)),
  ).toEqual(records);
  expect(
    records.filter(({message}) => message === 'Rebuilt storefront'),
  ).toHaveLength(2);
  expect(records).toContainEqual(
    expect.objectContaining({message: 'Worker ready'}),
  );
  expect(records).toContainEqual(
    expect.objectContaining({message: expect.stringContaining('Hydrogen')}),
  );
  expect(records).toContainEqual(
    expect.objectContaining({message: expect.stringContaining('/products')}),
  );
  expect(records).toContainEqual(
    expect.objectContaining({
      level: 'error',
      message: expect.stringContaining('Recoverable assertion'),
    }),
  );
  expect(JSON.parse(output.stderr)).toMatchObject({
    type: 'diagnostic',
    message: 'Dependency setup diagnostic',
  });
});

it.each([false, true])(
  'includes setup progress in the session log only in terminal mode (JSON: %s)',
  async (json) => {
    const {options, controller, log} = await fixture();
    const output = await withCapturedStandardStreams(async (streams) => {
      await runDevSession({...options, json}, async () => {
        emitCommandEvent({
          type: 'progress',
          operation: 'storefront-setup',
          status: 'started',
          message: 'Creating storefront',
        });
        controller.abort();
      });
      return {stdout: streams.stdout(), stderr: streams.stderr()};
    });
    const sessionLog = await log();
    if (json) {
      expect(output.stdout).toBe(sessionLog);
      expect(sessionLog).not.toContain('Creating storefront');
      expect(JSON.parse(output.stderr)).toMatchObject({
        type: 'progress',
        operation: 'storefront-setup',
        status: 'started',
        message: 'Creating storefront',
      });
    } else {
      expect(sessionLog).toContain('Creating storefront');
    }
  },
);
