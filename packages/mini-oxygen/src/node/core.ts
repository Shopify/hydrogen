import {
  Miniflare,
  Request,
  Response,
  fetch,
  Log,
  LogLevel,
  NoOpLog,
  RequestInit,
  type MiniflareOptions,
  WorkerOptions,
  Json,
} from 'miniflare';
import {watch as fsWatch} from 'node:fs';
import sourceMapSupport from 'source-map-support';
import {createServer, MiniOxygenServerOptions} from './server.js';
import {isO2Verbose} from '../common/debug.js';

export type MiniOxygenOptions = {
  sourceMap?: boolean;
  globalFetch?: typeof fetch;
  modules?: boolean;
  script?: string;
  scriptPath?: string;
  bindings?: Record<string, unknown>;
  kvNamespaces?: string[] | Record<string, string>;
  r2Buckets?: string[] | Record<string, string>;
  d1Databases?: string[] | Record<string, string>;
  serviceBindings?: Record<string, string | {network: {allow?: string[]}}>;
  wrappedBindings?: Record<string, string>;
  durableObjects?: Record<string, string>;
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  buildCommand?: string;
  envPath?: string;
  watch?: boolean;
  buildWatchPaths?: string[];
  logUnhandledRejections?: boolean;
};

export class MiniOxygen {
  private miniflare: Miniflare;
  private isDisposed = false;
  private currentOptions: MiniOxygenOptions;
  private env: Record<string, unknown>;
  private reloadListeners: Array<() => void> = [];
  private fileWatcher?: ReturnType<typeof fsWatch>;
  private reloadDebounceTimer?: NodeJS.Timeout;

  constructor(options: MiniOxygenOptions, env: {[key: string]: unknown} = {}) {
    if (options.sourceMap) {
      // Node has the --enable-source-maps flag, but this doesn't work for VM scripts.
      // It also doesn't expose a way of flushing the source map cache, which we need
      // so previous versions of worker code don't end up in stack traces.
      sourceMapSupport.install({emptyCacheBetweenOperations: true});
    }

    this.currentOptions = options;
    this.env = env;
    this.miniflare = this.createMiniflare();

    // Set up file watching if enabled
    if (options.watch && options.scriptPath) {
      this.setupFileWatcher(options.scriptPath);
    }
  }

  private createMiniflare(): Miniflare {
    const {globalFetch, modules, script, scriptPath, ...options} =
      this.currentOptions;

    // Convert old Miniflare v2 options to v4 format
    const workerOptions: any = {
      name: 'mini-oxygen-worker',
      modules: modules ?? true,
      bindings: {
        ...this.env,
        ...options.bindings,
      },
      kvNamespaces: options.kvNamespaces,
      r2Buckets: options.r2Buckets,
      d1Databases: options.d1Databases,
      serviceBindings: options.serviceBindings,
      wrappedBindings: options.wrappedBindings,
      durableObjects: options.durableObjects,
      compatibilityDate: options.compatibilityDate,
      compatibilityFlags: options.compatibilityFlags,
    };

    // Handle script vs scriptPath
    if (script) {
      workerOptions.script = script;
    } else if (scriptPath) {
      workerOptions.scriptPath = scriptPath;
    }

    // Add global fetch if provided
    if (globalFetch != null) {
      // In Miniflare v4, outboundService is configured per worker
      workerOptions.outboundService = (request: Request) => {
        return globalFetch(request.url, request as any);
      };
    }

    const workers = [workerOptions];

    return new Miniflare({
      cf: false,
      port: 0,
      inspectorPort: 0,
      liveReload: false,
      log: isO2Verbose() ? new Log(LogLevel.VERBOSE) : new NoOpLog(),
      workers,
    });
  }

  async ready() {
    return this.miniflare.ready;
  }

  async getPlugins() {
    // This method is called by the node index but doesn't exist in v4
    // Just wait for ready instead
    await this.miniflare.ready;
  }

  async dispose() {
    if (!this.isDisposed) {
      await this.miniflare.dispose();
      this.fileWatcher?.close();
      if (this.reloadDebounceTimer) {
        clearTimeout(this.reloadDebounceTimer);
      }
      this.isDisposed = true;
    }
  }

  async dispatchFetch(request: Request | string | URL, init?: RequestInit) {
    if (typeof request === 'string' || request instanceof URL) {
      request = new Request(request, init);
    }
    return this.miniflare.dispatchFetch(request);
  }

  async getBindings() {
    return this.miniflare.getBindings();
  }

  async setOptions(options: Partial<MiniOxygenOptions>) {
    // Update current options
    this.currentOptions = {...this.currentOptions, ...options};

    // If bindings are provided, update env
    if (options.bindings) {
      this.env = {...this.env, ...options.bindings};
    }

    // Dispose old miniflare and create new one
    await this.miniflare.dispose();
    this.miniflare = this.createMiniflare();
    await this.miniflare.ready;

    // Emit reload event
    this.reloadListeners.forEach((listener) => listener());
  }

  createServer(options: MiniOxygenServerOptions) {
    return createServer(this, options);
  }

  addEventListener(event: string, listener: () => void) {
    if (event === 'reload') {
      this.reloadListeners.push(listener);
    }
  }

  removeEventListener(event: string, listener: () => void) {
    if (event === 'reload') {
      const index = this.reloadListeners.indexOf(listener);
      if (index > -1) {
        this.reloadListeners.splice(index, 1);
      }
    }
  }

  private setupFileWatcher(filePath: string) {
    this.fileWatcher = fsWatch(filePath, async (eventType) => {
      if (eventType === 'change') {
        // Debounce reload events to avoid multiple triggers
        if (this.reloadDebounceTimer) {
          clearTimeout(this.reloadDebounceTimer);
        }

        this.reloadDebounceTimer = setTimeout(() => {
          // Emit reload event when file changes
          this.reloadListeners.forEach((listener) => listener());
        }, 100);
      }
    });
  }
}

// Re-export types
export {Request, Response, fetch} from 'miniflare';
