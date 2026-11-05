import {readFile} from '@shopify/cli-kit/node/fs';
import {Session, type Profiler} from 'node:inspector';
import type {SourceMapConsumer} from 'source-map';
import vm from 'node:vm';
import {isBuiltin} from 'node:module';
import {AbortError} from '@shopify/cli-kit/node/error';

// Only expose built-ins that cannot perform host I/O. This Node profiler runs
// trusted project code (the build already loads its Vite config); a vm.Context
// isolates globals between runs but is not a security sandbox.
const STARTUP_BUILTINS = new Set([
  'assert',
  'assert/strict',
  'buffer',
  'events',
  'path',
  'path/posix',
  'path/win32',
  'querystring',
  'string_decoder',
  'url',
  'util',
  'util/types',
]);

export async function createCpuStartupProfiler() {
  return {
    async run(scriptPath: string, sourceEntrypoint?: string) {
      const script = await readFile(scriptPath);
      const context = createStartupContext();
      const linkBuiltin = (specifier: string) =>
        importBuiltin(specifier, context);
      const stopProfiler = await startProfiler();
      let rawProfile: Profiler.Profile;
      try {
        // The inspector samples this Node process. Workerd runs in another
        // process, so loading the worker there cannot measure its startup.
        // Use a fresh Worker-like global scope on every build so module-level
        // memoization cannot turn subsequent profiles into warm starts.
        const module = new vm.SourceTextModule(script, {
          identifier: '<script>',
          context,
          importModuleDynamically: async (specifier) => {
            const dependency = await linkBuiltin(specifier);
            await dependency.link(linkBuiltin);
            await dependency.evaluate();
            return dependency;
          },
        });
        await module.link(linkBuiltin);
        await module.evaluate();
      } finally {
        rawProfile = await stopProfiler();
      }

      return enhanceProfileNodes(
        rawProfile,
        scriptPath + '.map',
        sourceEntrypoint,
      );
    },
  };
}

function createStartupContext() {
  // This profiles module initialization, not request handling. Expose the web
  // APIs used by Worker bundles, but reject request-only I/O at startup.
  // Oxygen's workerd runtime also rejects setTimeout/setInterval in global
  // scope: timers are available only inside a request handler.
  const requestOnly = () => {
    throw new AbortError(
      'Asynchronous I/O and timers are unavailable during Worker startup.',
    );
  };
  const context = vm.createContext({
    console,
    performance,
    crypto,
    URL,
    URLSearchParams,
    Request,
    Response,
    Headers,
    FormData,
    Blob,
    File,
    TextEncoder,
    TextDecoder,
    TextEncoderStream,
    TextDecoderStream,
    ReadableStream,
    WritableStream,
    TransformStream,
    CompressionStream,
    DecompressionStream,
    AbortController,
    AbortSignal,
    DOMException,
    Event,
    EventTarget,
    atob,
    btoa,
    structuredClone,
    queueMicrotask,
    fetch: requestOnly,
    setTimeout: requestOnly,
    setInterval: requestOnly,
    clearTimeout: () => {},
    clearInterval: () => {},
    caches: {
      default: {match: requestOnly, put: requestOnly, delete: requestOnly},
      open: requestOnly,
    },
  });
  vm.runInContext('globalThis.self = globalThis', context);
  return context;
}

async function importBuiltin(specifier: string, context: vm.Context) {
  if (!isBuiltin(specifier)) {
    throw new AbortError(
      `Cannot profile an unbundled import: ${specifier}`,
      'Bundle this dependency into the server build before profiling startup.',
    );
  }
  const name = specifier.replace(/^node:/, '');
  if (!STARTUP_BUILTINS.has(name)) {
    throw new AbortError(
      `Cannot profile unsupported Node built-in: ${specifier}`,
      'CPU startup profiling supports only built-ins without host I/O.',
    );
  }
  const namespace = await import(`node:${name}`);
  const exports = Object.keys(namespace);
  return new vm.SyntheticModule(
    exports,
    function () {
      for (const name of exports) this.setExport(name, namespace[name]);
    },
    {context},
  );
}

function startProfiler(): Promise<
  (filepath?: string) => Promise<Profiler.Profile>
> {
  const session = new Session();
  session.connect();

  return new Promise((resolveStart) => {
    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        resolveStart(() => {
          return new Promise((resolveStop, rejectStop) => {
            session.post('Profiler.stop', (err, {profile}) => {
              session.disconnect();

              if (err) {
                return rejectStop(err);
              }

              resolveStop(profile);
            });
          });
        });
      });
    });
  });
}

async function enhanceProfileNodes(
  profile: Profiler.Profile,
  sourceMapPath: string,
  sourceEntrypoint?: string,
) {
  const {SourceMapConsumer} = await import('source-map');
  const sourceMap = JSON.parse(await readFile(sourceMapPath));
  const smc = await new SourceMapConsumer(sourceMap, 'file://' + sourceMapPath);

  const scriptDescendants = new Set<number>();
  let totalScriptTimeMicrosec = 0;
  const totalTimeMicrosec = profile.endTime - profile.startTime;
  const timePerSample = profile.samples?.length
    ? totalTimeMicrosec / profile.samples.length
    : 0;

  for (const node of profile.nodes) {
    if (node.callFrame.url === '<script>' || scriptDescendants.has(node.id)) {
      scriptDescendants.add(node.id);
      node.children?.forEach((id) => scriptDescendants.add(id));
    }

    if (scriptDescendants.has(node.id)) {
      // Enhance paths with sourcemaps of known files.
      if (
        node.callFrame.url === '<script>' &&
        node.callFrame.lineNumber >= 0 &&
        node.callFrame.columnNumber >= 0
      ) {
        augmentNode(node, smc);
      }

      if (
        node.callFrame.url === '<script>' &&
        !node.callFrame.functionName &&
        !node.callFrame.lineNumber &&
        !node.callFrame.columnNumber
      ) {
        // If the node wasn't augmented, it's likely a top-level script
        // in one of the app files. We'll give it a more descriptive name.
        node.callFrame.url = sourceEntrypoint ?? '';
        node.callFrame.functionName = '(top-level app code)';
      }

      // Accrue total time spent by the script (app + deps).
      totalScriptTimeMicrosec +=
        Math.round((node.hitCount ?? 0) * timePerSample * 1000) / 1000;
    } else {
      // These nodes are not part of the script (app + deps), so we
      // silence them to remove visual noise from the profile.
      silenceNode(node);
    }
  }

  smc.destroy();

  return {
    profile,
    totalTimeMs: totalTimeMicrosec / 1000,
    totalScriptTimeMs: totalScriptTimeMicrosec / 1000,
  };
}

function augmentNode(node: Profiler.ProfileNode, smc: SourceMapConsumer) {
  const originalPosition = smc.originalPositionFor({
    line: node.callFrame.lineNumber + 1,
    column: node.callFrame.columnNumber + 1,
  });

  node.callFrame.url = originalPosition.source || node.callFrame.url;

  // Some helpers like `__toESM(...)` etc. might not have a name
  // after minification. These will show up as `(annonymous)`.
  node.callFrame.functionName =
    originalPosition.name || node.callFrame.functionName;

  node.callFrame.lineNumber = originalPosition.line
    ? originalPosition.line - 1
    : node.callFrame.lineNumber;

  node.callFrame.columnNumber =
    originalPosition.column ?? node.callFrame.columnNumber;
}

function silenceNode(node: Profiler.ProfileNode) {
  Object.assign(node, {
    children: [],
    callFrame: {
      functionName: '(profiler)',
      scriptId: '0',
      url: '',
      lineNumber: -1,
      columnNumber: -1,
    },
  });
}
