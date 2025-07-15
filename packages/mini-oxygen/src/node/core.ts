import * as path from 'node:path';
import * as fs from 'node:fs';
import {watch} from 'node:fs';
import {
  Miniflare,
  Log,
  LogLevel,
  NoOpLog,
  fetch,
  Request,
  Response,
} from 'miniflare';
import sourceMapSupport from 'source-map-support';

import {createServer, MiniOxygenServerOptions} from './server.js';
import {isO2Verbose} from '../common/debug.js';
import {OXYGEN_COMPAT_PARAMS} from '../common/compat.js';

export type MiniOxygenOptions = {
  sourceMap?: boolean;
  globalFetch?: typeof fetch;
  script?: string;
  scriptPath?: string;
  modules?: boolean;
  bindings?: Record<string, unknown>;
  buildCommand?: string;
  buildWatchPaths?: string[];
  envPath?: string;
  watch?: boolean;
  logUnhandledRejections?: boolean;
  // We don't want the user to configure these.
  // Compatibility params from OXYGEN_COMPAT_PARAMS
  // compatibilityDate?: string;
  //compatibilityFlags?: string[];
  [key: string]: any; // Allow additional Miniflare options
};

export class MiniOxygen {
  private miniflare: Miniflare;
  private sourceMap: boolean;
  private reloadListeners: Array<() => void> = [];
  private workerName = 'mini-oxygen-worker';
  private currentWorkerConfig: any = {};
  private fileWatcher?: fs.FSWatcher;
  private watchedFile?: string;

  constructor(
    {sourceMap, globalFetch, ...options}: MiniOxygenOptions,
    env: {[key: string]: unknown},
  ) {
    this.sourceMap = sourceMap ?? false;

    if (sourceMap) {
      // Node has the --enable-source-maps flag, but this doesn't work for VM scripts.
      // It also doesn't expose a way of flushing the source map cache, which we need
      // so previous versions of worker code don't end up in stack traces.
      sourceMapSupport.install({emptyCacheBetweenOperations: true});
    }

    // Build the worker configuration
    const worker: any = {
      name: this.workerName,
      modules: options.modules !== undefined ? options.modules : true,
      bindings: {
        ...env,
        ...options.bindings,
      },
      // Apply oxygen compatibility params if not already set
      ...OXYGEN_COMPAT_PARAMS,
    };

    // Add script or scriptPath
    if (options.script) {
      worker.script = options.script;
    } else if (options.scriptPath) {
      // For Miniflare v4, read the script content instead of using scriptPath
      // to avoid path resolution issues
      worker.script = fs.readFileSync(options.scriptPath, 'utf-8');
      this.watchedFile = options.scriptPath;
    }

    // Store the current configuration
    this.currentWorkerConfig = worker;

    // Extract Miniflare-specific options
    const {
      script,
      scriptPath,
      modules,
      bindings,
      buildCommand,
      buildWatchPaths,
      envPath,
      logUnhandledRejections,
      ...miniflareOptions
    } = options;

    // Create Miniflare instance with a single worker
    const miniflareConfig: any = {
      verbose: isO2Verbose(),
      log: isO2Verbose() ? undefined : new NoOpLog(),
      cf: false,
      workers: [worker],
      ...miniflareOptions,
    };

    // Add global fetch handler if provided
    if (globalFetch) {
      // Store globalFetch for later use
      (this as any).globalFetch = globalFetch;
      // In Miniflare v4, outboundService should be configured on the worker
      // The outboundService receives a Request object, but globalFetch expects a URL string
      worker.outboundService = async (request: Request) => {
        return globalFetch(request.url);
      };
    }

    this.miniflare = new Miniflare(miniflareConfig);

    // Set up file watching if requested
    if (options.watch && this.watchedFile) {
      this.setupFileWatcher();
    }
  }

  async ready() {
    return this.miniflare.ready;
  }

  async dispatchFetch(request: Request): Promise<Response> {
    return this.miniflare.dispatchFetch(request) as Promise<Response>;
  }

  async setOptions(
    options: Partial<MiniOxygenOptions> & {bindings?: Record<string, unknown>},
  ) {
    const {
      script,
      scriptPath,
      modules,
      bindings,
      globalFetch,
      ...otherOptions
    } = options;

    // Start with the current configuration
    const worker: any = {
      ...this.currentWorkerConfig,
      name: this.workerName,
    };

    // Update script/scriptPath if provided
    if (script !== undefined) {
      worker.script = script;
    } else if (scriptPath !== undefined) {
      // For Miniflare v4, read the script content instead of using scriptPath
      worker.script = fs.readFileSync(scriptPath, 'utf-8');
      // Update the watched file if it changes
      if (this.watchedFile !== scriptPath) {
        if (this.fileWatcher) {
          this.fileWatcher.close();
        }
        this.watchedFile = scriptPath;
        if (otherOptions.watch) {
          this.setupFileWatcher();
        }
      }
    }

    if (modules !== undefined) {
      worker.modules = modules;
    }

    if (bindings !== undefined) {
      worker.bindings = bindings;
    }

    // Handle globalFetch if provided
    const storedGlobalFetch = (this as any).globalFetch;
    if (globalFetch !== undefined) {
      (this as any).globalFetch = globalFetch;
    }

    // Apply compatibility params if not in otherOptions
    if (!otherOptions.compatibilityDate && !worker.compatibilityDate) {
      Object.assign(worker, OXYGEN_COMPAT_PARAMS);
    }

    // Update stored configuration
    this.currentWorkerConfig = worker;

    const setOptionsConfig: any = {
      workers: [worker],
      ...otherOptions,
    };

    // Update globalFetch if it has changed
    const currentGlobalFetch = (this as any).globalFetch;
    if (globalFetch !== undefined) {
      (this as any).globalFetch = globalFetch;
    }

    // Update outboundService if globalFetch is provided
    const fetchToUse =
      globalFetch !== undefined ? globalFetch : currentGlobalFetch;
    if (fetchToUse) {
      worker.outboundService = async (request: Request) => {
        return fetchToUse(request.url);
      };
    }

    return this.miniflare.setOptions(setOptionsConfig);
  }

  async getPlugins() {
    // This method is called in index.ts but doesn't exist in Miniflare v4
    // We'll return a promise that resolves when ready
    await this.ready();
  }

  addEventListener(event: string, listener: () => void) {
    if (event === 'reload') {
      this.reloadListeners.push(listener);
    }
  }

  async reload(
    options?: Partial<MiniOxygenOptions> & {
      bindings?: Record<string, unknown>;
      env?: Record<string, unknown>;
    },
  ) {
    // If options are provided, update them first
    if (options) {
      const {env, ...otherOptions} = options;
      if (env) {
        // Merge env into bindings
        await this.setOptions({
          ...otherOptions,
          bindings: env,
        });
      } else {
        await this.setOptions(otherOptions);
      }
    }

    // Trigger any reload listeners
    for (const listener of this.reloadListeners) {
      listener();
    }
  }

  private setupFileWatcher() {
    if (!this.watchedFile) return;

    // Use a debounce timer to avoid multiple rapid reloads
    let debounceTimer: NodeJS.Timeout | null = null;

    this.fileWatcher = watch(this.watchedFile, async (eventType) => {
      if (eventType === 'change') {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          try {
            // Retry reading the file a few times in case of race conditions
            let retries = 3;
            let newScript: string | null = null;
            
            while (retries > 0 && !newScript) {
              if (fs.existsSync(this.watchedFile!)) {
                try {
                  newScript = fs.readFileSync(this.watchedFile!, 'utf-8');
                  break;
                } catch (readErr) {
                  // File might be locked, wait a bit and retry
                  retries--;
                  if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                  }
                }
              } else {
                // File doesn't exist yet, wait a bit and retry
                retries--;
                if (retries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              }
            }
            
            if (!newScript) {
              console.error('Worker file not found or could not be read:', this.watchedFile);
              return;
            }

            // Call reload with the new script instead of setOptions
            await this.reload({script: newScript});
          } catch (err) {
            console.error('Error reloading worker:', err);
          }
        }, 200); // Increased from 100ms to 200ms for CI environments
      }
    });
  }

  async dispose() {
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }
    return this.miniflare.dispose();
  }

  createServer(options: MiniOxygenServerOptions) {
    return createServer(this, options);
  }
}
