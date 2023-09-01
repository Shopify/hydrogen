import {readFileSync} from 'node:fs';

import {
  CorePlugin,
  MiniflareCore,
  MiniflareCoreOptions,
  BuildPlugin,
  BindingsPlugin,
  fetch,
} from '@miniflare/core';
import {CachePlugin} from '@miniflare/cache';
import {VMScriptRunner} from '@miniflare/runner-vm';
import {Log, LogLevel} from '@miniflare/shared';
import {QueueBroker} from '@miniflare/queues';
import sourceMapSupport from 'source-map-support';

import {createServer, MiniOxygenServerOptions} from './server.js';
import {StorageFactory} from './storage.js';

const PLUGINS = {
  CorePlugin,
  CachePlugin,
  BuildPlugin,
  BindingsPlugin,
};

export type MiniOxygenType = typeof PLUGINS;

type MiniOxygenOptions = MiniflareCoreOptions<MiniOxygenType> & {
  sourceMap?: boolean;
  globalFetch?: typeof fetch;
};

export class MiniOxygen extends MiniflareCore<MiniOxygenType> {
  constructor(
    {sourceMap, ...options}: MiniOxygenOptions,
    env: {[key: string]: unknown},
  ) {
    if (sourceMap) {
      // Node has the --enable-source-maps flag, but this doesn't work for VM scripts.
      // It also doesn't expose a way of flushing the source map cache, which we need
      // so previous versions of worker code don't end up in stack traces.
      sourceMapSupport.install({
        emptyCacheBetweenOperations: true,
        // When using `script` option, we need to manually retrieve the source map.
        // Use the `scriptPath` option to specify the path to the sourcemap file.
        // Miniflare ignores `scriptPath` when `script` is provided.
        retrieveSourceMap:
          options.script && options.scriptPath
            ? (source) => {
                // This is what Miniflare assigns as the name when `script` is provided.
                // https://github.com/cloudflare/miniflare/blob/aa80286020dbaf9aa78aeb5a3734161532ab3427/packages/shared/src/runner.ts#L23
                if (source === '<script>') {
                  try {
                    return {
                      url: options.scriptPath,
                      map: readFileSync(`${options.scriptPath}.map`, 'utf-8'),
                    };
                  } catch {
                    // Ignore errors
                  }
                }

                return null;
              }
            : undefined,
      });
    }

    const storageFactory = new StorageFactory();

    super(
      PLUGINS,
      {
        log: new Log(LogLevel.VERBOSE),
        storageFactory,
        scriptRunner: new VMScriptRunner(),
        queueBroker: new QueueBroker(),
      },
      {
        bindings: env,
        globals: options.globalFetch
          ? {
              fetch: options.globalFetch,
            }
          : {},
        ...options,
      },
    );
  }

  async dispose() {
    return super.dispose();
  }

  createServer(options: MiniOxygenServerOptions) {
    return createServer(this, options);
  }
}
