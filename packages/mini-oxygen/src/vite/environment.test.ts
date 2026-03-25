import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createMiniOxygenDevEnvironment} from './environment.js';

const mocks = vi.hoisted(() => {
  const createdEnvironments: Array<{
    originalClose: ReturnType<typeof vi.fn>;
    originalListen: ReturnType<typeof vi.fn>;
    dispatchFetch: ReturnType<typeof vi.fn>;
    listen: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }> = [];

  return {
    createdEnvironments,
    createFetchableDevEnvironment: vi.fn((_, __, options) => {
      const originalListen = vi.fn(async () => {});
      const originalClose = vi.fn(async () => {});
      const environment = {
        dispatchFetch: vi.fn((request: Request) =>
          options.handleRequest(request),
        ),
        listen: originalListen,
        close: originalClose,
        originalListen,
        originalClose,
      };

      createdEnvironments.push(environment);
      return environment;
    }),
    getViteUrl: vi.fn(),
    startMiniOxygenRuntime: vi.fn(),
    toMiniflareRequest: vi.fn((request: Request) => request),
  };
});

vi.mock('vite', () => ({
  createFetchableDevEnvironment: mocks.createFetchableDevEnvironment,
}));

vi.mock('./server-middleware.js', () => ({
  WARMUP_PATHNAME: '/__vite_warmup',
  getViteUrl: mocks.getViteUrl,
  startMiniOxygenRuntime: mocks.startMiniOxygenRuntime,
  toMiniflareRequest: mocks.toMiniflareRequest,
}));

type MockRuntime = {
  isDisposed: boolean;
  dispatchFetch: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

const TEST_SERVER = {} as any;

function createMockRuntime(label: string): MockRuntime {
  const runtime = {
    isDisposed: false,
    dispatchFetch: vi.fn(async (request: Request) => {
      return new Response(`${label}:${new URL(request.url).pathname}`);
    }),
    dispose: vi.fn(async () => {
      runtime.isDisposed = true;
    }),
  };

  return runtime;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {promise, resolve, reject};
}

function getCreatedEnvironment() {
  const environment = mocks.createdEnvironments.at(-1);
  if (!environment) {
    throw new Error('Expected a mocked Vite dev environment to be created.');
  }

  return environment;
}

describe('createMiniOxygenDevEnvironment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.createdEnvironments.length = 0;
    mocks.getViteUrl.mockReturnValue(undefined);
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });

  it('starts MiniOxygen lazily on the first request', async () => {
    const runtime = createMockRuntime('runtime-1');
    const resolveRuntimeOptions = vi.fn(
      async (runtimeOptions, viteDevServer) => {
        return {
          entry: './server',
          env: runtimeOptions.env,
          viteDevServer,
        };
      },
    );

    mocks.startMiniOxygenRuntime.mockReturnValue(runtime);

    const environment = createMiniOxygenDevEnvironment(
      'ssr',
      {} as any,
      {env: {TOKEN: '123'}},
      resolveRuntimeOptions,
    );

    await environment.listen(TEST_SERVER);

    expect(mocks.startMiniOxygenRuntime).not.toHaveBeenCalled();

    const response = await environment.dispatchFetch(
      new Request('http://localhost/products'),
    );

    expect(await response.text()).toBe('runtime-1:/products');
    expect(resolveRuntimeOptions).toHaveBeenCalledWith(
      {env: {TOKEN: '123'}},
      TEST_SERVER,
    );
    expect(mocks.startMiniOxygenRuntime).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent runtime startup', async () => {
    const runtime = createMockRuntime('runtime-1');
    const deferred = createDeferred<{
      entry: string;
      viteDevServer: typeof TEST_SERVER;
    }>();
    const resolveRuntimeOptions = vi.fn(() => deferred.promise);

    mocks.startMiniOxygenRuntime.mockReturnValue(runtime);

    const environment = createMiniOxygenDevEnvironment(
      'ssr',
      {} as any,
      {},
      resolveRuntimeOptions,
    );

    await environment.listen(TEST_SERVER);

    const firstRequest = environment.dispatchFetch(
      new Request('http://localhost/first'),
    );
    const secondRequest = environment.dispatchFetch(
      new Request('http://localhost/second'),
    );

    expect(resolveRuntimeOptions).toHaveBeenCalledTimes(1);
    expect(mocks.startMiniOxygenRuntime).not.toHaveBeenCalled();

    deferred.resolve({
      entry: './server',
      viteDevServer: TEST_SERVER,
    });

    const [firstResponse, secondResponse] = await Promise.all([
      firstRequest,
      secondRequest,
    ]);

    expect(await firstResponse.text()).toBe('runtime-1:/first');
    expect(await secondResponse.text()).toBe('runtime-1:/second');
    expect(mocks.startMiniOxygenRuntime).toHaveBeenCalledTimes(1);
    expect(runtime.dispatchFetch).toHaveBeenCalledTimes(2);
  });

  it('restarts MiniOxygen after the previous runtime was disposed', async () => {
    const firstRuntime = createMockRuntime('runtime-1');
    const secondRuntime = createMockRuntime('runtime-2');
    const resolveRuntimeOptions = vi.fn(async (_, viteDevServer) => {
      return {
        entry: './server',
        viteDevServer,
      };
    });

    mocks.startMiniOxygenRuntime
      .mockReturnValueOnce(firstRuntime)
      .mockReturnValueOnce(secondRuntime);

    const environment = createMiniOxygenDevEnvironment(
      'ssr',
      {} as any,
      {},
      resolveRuntimeOptions,
    );

    await environment.listen(TEST_SERVER);
    await environment.dispatchFetch(new Request('http://localhost/first'));

    firstRuntime.isDisposed = true;

    const response = await environment.dispatchFetch(
      new Request('http://localhost/second'),
    );

    expect(await response.text()).toBe('runtime-2:/second');
    expect(mocks.startMiniOxygenRuntime).toHaveBeenCalledTimes(2);
    expect(firstRuntime.dispatchFetch).toHaveBeenCalledTimes(1);
    expect(secondRuntime.dispatchFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects runtime reconfiguration after startup', async () => {
    const resolveRuntimeOptions = vi.fn(async (_, viteDevServer) => {
      return {
        entry: './server',
        viteDevServer,
      };
    });

    mocks.startMiniOxygenRuntime.mockReturnValue(
      createMockRuntime('runtime-1'),
    );

    const environment = createMiniOxygenDevEnvironment(
      'ssr',
      {} as any,
      {},
      resolveRuntimeOptions,
    );

    await environment.listen(TEST_SERVER);
    await environment.dispatchFetch(new Request('http://localhost/started'));

    expect(() => environment.configureRuntime({env: {TOKEN: '456'}})).toThrow(
      'MiniOxygen runtime options cannot be updated after the runtime has started.',
    );
  });

  it('rejects runtime reconfiguration while startup is in flight', async () => {
    const deferred = createDeferred<{
      entry: string;
      viteDevServer: typeof TEST_SERVER;
    }>();
    const resolveRuntimeOptions = vi.fn(() => deferred.promise);

    mocks.startMiniOxygenRuntime.mockReturnValue(
      createMockRuntime('runtime-1'),
    );

    const environment = createMiniOxygenDevEnvironment(
      'ssr',
      {} as any,
      {},
      resolveRuntimeOptions,
    );

    await environment.listen(TEST_SERVER);

    const pendingRequest = environment.dispatchFetch(
      new Request('http://localhost/pending'),
    );

    expect(() => environment.configureRuntime({env: {TOKEN: '456'}})).toThrow(
      'MiniOxygen runtime options cannot be updated after the runtime has started.',
    );

    deferred.resolve({
      entry: './server',
      viteDevServer: TEST_SERVER,
    });

    const response = await pendingRequest;
    expect(await response.text()).toBe('runtime-1:/pending');
  });

  it('warms up the runtime after the Vite server starts listening', async () => {
    const runtime = createMockRuntime('runtime-1');
    const resolveRuntimeOptions = vi.fn(async (_, viteDevServer) => {
      return {
        entry: './server',
        viteDevServer,
      };
    });

    mocks.getViteUrl.mockReturnValue('http://localhost:3000');
    mocks.startMiniOxygenRuntime.mockReturnValue(runtime);

    const environment = createMiniOxygenDevEnvironment(
      'ssr',
      {} as any,
      {},
      resolveRuntimeOptions,
    );

    const viteEnvironment = getCreatedEnvironment();

    await environment.listen(TEST_SERVER);
    await vi.advanceTimersByTimeAsync(200);

    expect(viteEnvironment.originalListen).toHaveBeenCalledWith(TEST_SERVER);
    expect(mocks.startMiniOxygenRuntime).toHaveBeenCalledTimes(1);
    expect(runtime.dispatchFetch).toHaveBeenCalledTimes(1);

    const warmupRequest = mocks.toMiniflareRequest.mock.calls[0]?.[0];
    expect(warmupRequest).toBeInstanceOf(Request);
    expect(new URL(warmupRequest.url).pathname).toBe('/__vite_warmup');
  });

  it('closes the Vite environment and disposes the active runtime', async () => {
    const runtime = createMockRuntime('runtime-1');
    const resolveRuntimeOptions = vi.fn(async (_, viteDevServer) => {
      return {
        entry: './server',
        viteDevServer,
      };
    });

    mocks.startMiniOxygenRuntime.mockReturnValue(runtime);

    const environment = createMiniOxygenDevEnvironment(
      'ssr',
      {} as any,
      {},
      resolveRuntimeOptions,
    );

    const viteEnvironment = getCreatedEnvironment();

    await environment.listen(TEST_SERVER);
    await environment.dispatchFetch(new Request('http://localhost/close'));
    await environment.close();

    expect(viteEnvironment.originalClose).toHaveBeenCalledTimes(1);
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
  });
});
