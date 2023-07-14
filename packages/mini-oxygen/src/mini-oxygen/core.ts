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
import {QueueBroker} from '@miniflare/queues';

import {createServer, MiniOxygenServerOptions} from './server.js';
import {StorageFactory} from './storage.js';

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
    env: {[key: string]: unknown},
  ) {
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
