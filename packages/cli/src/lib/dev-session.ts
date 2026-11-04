import {format} from 'node:util';
import {realpath} from 'node:fs/promises';
import {setupResourceCleanup} from './resource-cleanup.js';
import {basename, dirname, resolvePath} from '@shopify/cli-kit/node/path';
import {hashString} from '@shopify/cli-kit/node/crypto';
import {unstyled} from '@shopify/cli-kit/node/output';
import {
  acquireDevInstance,
  type DevInstanceLogEntry,
} from '@shopify/cli-kit/node/dev-instance';
import {
  renderCommandEvent,
  runWithCommandEvents,
} from '@shopify/cli-kit/node/command-events';

type SessionOptions = {
  command: 'hydrogen dev';
  directory: string;
  env?: string;
  envBranch?: string;
  envFile: string;
  signal?: AbortSignal;
};

export type DevSession = {
  signal: AbortSignal;
  cleanup: (close: () => void | Promise<unknown>) => void;
  log: (message: string, level?: DevInstanceLogEntry['level']) => void;
  ready: (urls: string[]) => Promise<void>;
};

/** Own the runtime and its output until shutdown has drained the session log. */
export async function runDevSession(
  options: SessionOptions,
  start: (session: DevSession) => Promise<unknown>,
) {
  const envFile = await resolveRealPath(
    resolvePath(options.directory, options.envFile),
  );
  const directory = await realpath(options.directory);
  const instance = await acquireDevInstance({
    command: options.command,
    directory,
    key: hashString(
      JSON.stringify([options.env ?? null, options.envBranch ?? null, envFile]),
    ),
    details: {
      environment: options.env ?? null,
      environmentBranch: options.envBranch ?? null,
      envFile,
      urls: [],
      watch: true,
    },
  });
  const controller = new AbortController();
  const externalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', externalAbort, {once: true});
  const cleanups: (() => void | Promise<unknown>)[] = [];
  let pendingCleanup = Promise.resolve();
  let pendingOutput = Promise.resolve();
  let failure: unknown;
  let exitCode: number | undefined;
  let closing = false;
  let active = true;
  let startup: Promise<unknown> = Promise.resolve();
  const originalConsole = {...console};
  const log: DevSession['log'] = (message, level) => {
    const plainMessage = unstyled(message).trimEnd();
    if (!active || !plainMessage) return;
    pendingOutput = pendingOutput
      .then(() =>
        instance.log({source: options.command, level, message: plainMessage}),
      )
      .catch((error: unknown) => {
        failure ??= error;
        controller.abort();
      });
  };
  const stop = () => controller.abort();
  const exitOnSignal = (code: number) => {
    exitCode = code;
    stop();
    // Start the shared exit deadline even when startup never settles.
    process.exit(code);
  };
  const interrupt = () => exitOnSignal(130);
  const terminate = () => exitOnSignal(143);
  const loseOwnership = () => {
    failure ??= instance.abortSignal.reason;
    stop();
  };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  instance.abortSignal.addEventListener('abort', loseOwnership, {once: true});
  const stopped = new Promise<void>((resolve) =>
    controller.signal.addEventListener('abort', () => resolve(), {once: true}),
  );
  let finishCleanup!: () => void;
  const cleanedUp = new Promise<void>((resolve) => {
    finishCleanup = resolve;
  });
  const restoreExit = setupResourceCleanup(
    async () => {
      stop();
      await cleanedUp;
    },
    () => exitCode,
  );
  if (options.signal?.aborted) stop();
  const session: DevSession = {
    signal: controller.signal,
    cleanup(close) {
      if (closing) {
        pendingCleanup = pendingCleanup
          .then(close)
          .then(() => {})
          .catch((error: unknown) => {
            failure ??= error;
          });
      } else cleanups.push(close);
    },
    log,
    async ready(urls) {
      controller.signal.throwIfAborted();
      await instance.update({status: 'running', details: {urls}});
      log(`Ready: ${urls.join(', ')}`);
    },
  };

  for (const method of ['log', 'info', 'debug', 'warn', 'error'] as const) {
    console[method] = (...args: unknown[]) => {
      log(format(...args), method === 'error' ? 'error' : undefined);
      originalConsole[method](...args);
    };
  }
  try {
    await runWithCommandEvents(
      {
        outputMode: 'text',
        sink(event, eventOptions) {
          if (event.type === 'progress' && event.message) log(event.message);
          if (!eventOptions?.alreadyRendered) renderCommandEvent(event);
        },
      },
      async () => {
        log('Starting runtime');
        if (!controller.signal.aborted) {
          startup = Promise.resolve().then(() => {
            controller.signal.throwIfAborted();
            return start(session);
          });
          await Promise.race([startup, stopped]);
        }
        await stopped;
      },
    );
  } finally {
    closing = true;
    stop();
    try {
      for (const close of cleanups.reverse()) session.cleanup(close);
      // In-flight startup can still acquire resources and register their cleanup.
      // Its failure already propagates through the race unless shutdown won.
      await Promise.allSettled([startup]);
      let drainedCleanup: Promise<void>;
      do {
        drainedCleanup = pendingCleanup;
        await drainedCleanup;
        await pendingOutput;
      } while (drainedCleanup !== pendingCleanup);
      log('Runtime stopped');
      await pendingOutput;
    } finally {
      active = false;
      Object.assign(console, originalConsole);
      options.signal?.removeEventListener('abort', externalAbort);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', terminate);
      instance.abortSignal.removeEventListener('abort', loseOwnership);
      try {
        await instance.release();
      } finally {
        restoreExit();
        finishCleanup();
      }
    }
  }
  if (failure) throw failure;
  if (exitCode !== undefined) process.exit(exitCode);
}

async function resolveRealPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const parent = dirname(path);
    if (parent === path) throw error;
    // The optional env file can be missing while its parents contain symlinks.
    return resolvePath(await resolveRealPath(parent), basename(path));
  }
}
