import {
  CorePlugin,
  MiniflareCore,
  MiniflareCoreOptions,
  BuildPlugin,
  BindingsPlugin,
} from '@miniflare/core';
import {CachePlugin} from '@miniflare/cache';
import {VMScriptRunner} from '@miniflare/runner-vm';
import {Log, LogLevel} from '@miniflare/shared';

import {createServer, MiniOxygenServerOptions} from './server';
import {StorageFactory} from './storage';

const PLUGINS = {
  CorePlugin,
  CachePlugin,
  BuildPlugin,
  BindingsPlugin,
};

export type MiniOxygenType = typeof PLUGINS;

export class MiniOxygen extends MiniflareCore<MiniOxygenType> {
  constructor(
    options: MiniflareCoreOptions<MiniOxygenType>,
    env: Record<string, unknown>
  ) {
    const storageFactory = new StorageFactory();

    super(
      PLUGINS,
      {
        log: new Log(LogLevel.VERBOSE),
        storageFactory,
        scriptRunner: new VMScriptRunner(),
      },
      {
        bindings: env,
        ...options,
      }
    );
  }

  async dispose() {
    return super.dispose();
  }

  createServer(options: MiniOxygenServerOptions) {
    return createServer(this, options);
  }
}
