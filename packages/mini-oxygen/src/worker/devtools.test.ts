import {once} from 'node:events';
import {request} from 'node:http';
import getPort, {portNumbers} from 'get-port';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {WebSocket, type ClientOptions, type RawData} from 'ws';
import {createInspectorProxy, type InspectorProxy} from './devtools.js';
import type {InspectorConnection} from './inspector.js';
import {createMiniOxygen} from './index.js';

const inspectorProxies: InspectorProxy[] = [];

afterEach(async () => {
  await Promise.all(inspectorProxies.splice(0).map((proxy) => proxy.close()));
});

describe('MiniOxygen inspector proxy', () => {
  it('listens on IPv4 loopback and advertises loopback URLs', async () => {
    const {port, proxy} = await startInspectorProxy();
    const address = await proxy.ready;

    expect(address).toMatchObject({address: '127.0.0.1', family: 'IPv4'});

    const response = await fetch(`http://127.0.0.1:${port}/json`);
    const [target] = (await response.json()) as Array<{
      webSocketDebuggerUrl: string;
      devtoolsFrontendUrl: string;
    }>;

    expect(target).toMatchObject({
      webSocketDebuggerUrl: `ws://127.0.0.1:${port}/ws`,
      devtoolsFrontendUrl: expect.stringContaining(`ws=127.0.0.1:${port}/ws`),
    });
  });

  it('rejects HTTP requests with a non-loopback Host', async () => {
    const {port} = await startInspectorProxy();
    const response = await makeHttpRequest(port, '/json', {
      Host: 'attacker.example',
    });

    expect(response.statusCode).toBe(403);
  });

  it('only exposes source maps to allowed browser origins', async () => {
    const {port} = await startInspectorProxy();

    const rejected = await makeHttpRequest(port, '/__index.js.map', {
      Origin: 'https://attacker.example',
    });
    expect(rejected.statusCode).toBe(403);

    const allowed = await makeHttpRequest(port, '/__index.js.map', {
      Origin: 'devtools://devtools',
    });
    expect(allowed.statusCode).toBe(404);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'devtools://devtools',
    );
  });

  it('allows Chrome DevTools and VSCode debugger connections', async () => {
    const {port} = await startInspectorProxy();
    const url = `ws://127.0.0.1:${port}/ws`;

    const localDevTools = await openWebSocket(url, {
      origin: `http://127.0.0.1:${port}`,
      headers: {'User-Agent': 'Mozilla/5.0'},
    });
    await closeWebSocket(localDevTools);

    const chromeDevTools = await openWebSocket(url, {
      origin: 'devtools://devtools',
      headers: {'User-Agent': 'Mozilla/5.0'},
    });
    await closeWebSocket(chromeDevTools);

    // VSCode sends neither Origin nor User-Agent.
    const vscode = await openWebSocket(url);
    await closeWebSocket(vscode);
  });

  it('rejects untrusted browser origins and Host headers', async () => {
    const {port} = await startInspectorProxy();
    const url = `ws://127.0.0.1:${port}/ws`;

    await expect(
      rejectedWebSocketStatus(url, {
        origin: 'https://attacker.example',
        headers: {'User-Agent': 'Mozilla/5.0'},
      }),
    ).resolves.toBe(401);

    await expect(
      rejectedWebSocketStatus(url, {
        headers: {'User-Agent': 'Mozilla/5.0'},
      }),
    ).resolves.toBe(401);

    await expect(
      rejectedWebSocketStatus(url, {
        headers: {Host: 'attacker.example'},
      }),
    ).resolves.toBe(401);
  });

  it('proxies CDP to a real workerd inspector without exposing it to untrusted origins', async () => {
    const inspectorPort = await findInspectorPort();
    const miniOxygen = createMiniOxygen({
      debug: true,
      inspectorPort,
      requestHook: null,
      workers: [
        {
          name: 'test',
          modules: true,
          script: `export default {
            fetch(_request, env) {
              globalThis.__miniOxygenInspectorTestSecret = env.TEST_SECRET;
              debugger;
              return new Response('ok');
            }
          }`,
          bindings: {TEST_SECRET: 'inspector-secret'},
        },
      ],
    });

    try {
      const {workerUrl} = await withTimeout(
        miniOxygen.ready,
        'MiniOxygen readiness',
      );

      await expect(
        withTimeout(
          rejectedWebSocketStatus(`ws://127.0.0.1:${inspectorPort}/ws`, {
            origin: 'https://attacker.example',
            headers: {'User-Agent': 'Mozilla/5.0'},
          }),
          'untrusted WebSocket rejection',
        ),
      ).resolves.toBe(401);

      const debuggerWs = await withTimeout(
        openWebSocket(`ws://127.0.0.1:${inspectorPort}/ws`, {
          origin: `http://127.0.0.1:${inspectorPort}`,
          headers: {'User-Agent': 'Mozilla/5.0'},
        }),
        'trusted WebSocket connection',
      );

      const workerPaused = waitForCdpEvent(
        debuggerWs,
        'Debugger.paused',
        () => true,
      );
      await withTimeout(
        sendCdpCommand(debuggerWs, 1, 'Debugger.enable'),
        'Debugger.enable',
      );
      const workerRequest = fetch(workerUrl);
      const {callFrames} = await withTimeout(workerPaused, 'worker pause');
      const [{callFrameId}] = callFrames as Array<{callFrameId: string}>;
      const result = await withTimeout(
        sendCdpCommand(debuggerWs, 2, 'Debugger.evaluateOnCallFrame', {
          callFrameId,
          expression: 'globalThis.__miniOxygenInspectorTestSecret',
          returnByValue: true,
        }),
        'Debugger.evaluateOnCallFrame',
      );

      expect(result).toMatchObject({
        result: {type: 'string', value: 'inspector-secret'},
      });
      await withTimeout(
        sendCdpCommand(debuggerWs, 3, 'Debugger.resume'),
        'Debugger.resume',
      );
      await withTimeout(workerRequest, 'worker request');
      await withTimeout(closeWebSocket(debuggerWs), 'debugger close');
    } finally {
      await withTimeout(miniOxygen.dispose(), 'MiniOxygen disposal');
    }
  });
});

async function startInspectorProxy() {
  const port = await findInspectorPort();
  const proxy = createInspectorProxy(port, createMockInspectorConnection());
  inspectorProxies.push(proxy);
  await proxy.ready;

  return {port, proxy};
}

function findInspectorPort() {
  return getPort({
    host: '127.0.0.1',
    port: portNumbers(9229, 9329),
  });
}

function createMockInspectorConnection() {
  const ws = Object.assign(new EventTarget(), {
    url: 'ws://127.0.0.1:1234/ws',
    readyState: WebSocket.OPEN,
    send: vi.fn(),
  });

  return {ws, sourceMapPath: undefined} as unknown as InspectorConnection;
}

function makeHttpRequest(
  port: number,
  path: string,
  headers: Record<string, string>,
) {
  return new Promise<{
    statusCode: number | undefined;
    headers: Record<string, string | string[] | undefined>;
  }>((resolve, reject) => {
    const req = request(
      {hostname: '127.0.0.1', port, path, headers},
      (response) => {
        response.resume();
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
        });
      },
    );
    req.once('error', reject);
    req.end();
  });
}

function openWebSocket(url: string, options?: ClientOptions) {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(url, options);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

async function closeWebSocket(ws: WebSocket) {
  ws.close();
  await once(ws, 'close');
}

function rejectedWebSocketStatus(url: string, options: ClientOptions) {
  return new Promise<number | undefined>((resolve, reject) => {
    const ws = new WebSocket(url, options);
    ws.once('error', () => {});
    ws.once('open', () => {
      ws.close();
      reject(new Error('Expected the WebSocket upgrade to be rejected'));
    });
    ws.once('unexpected-response', (_request, response) => {
      response.resume();
      resolve(response.statusCode);
    });
  });
}

function sendCdpCommand(
  ws: WebSocket,
  id: number,
  method: string,
  params?: Record<string, unknown>,
) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const onMessage = (data: RawData) => {
      const message = JSON.parse(data.toString()) as {
        id?: number;
        result?: Record<string, unknown>;
        error?: {message: string};
      };

      if (message.id !== id) return;
      ws.off('message', onMessage);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result ?? {});
      }
    };

    ws.on('message', onMessage);
    ws.send(JSON.stringify({id, method, params}));
  });
}

function waitForCdpEvent(
  ws: WebSocket,
  method: string,
  predicate: (params: Record<string, unknown>) => boolean,
) {
  return new Promise<Record<string, unknown>>((resolve) => {
    const onMessage = (data: RawData) => {
      const message = JSON.parse(data.toString()) as {
        method?: string;
        params?: Record<string, unknown>;
      };
      const params = message.params ?? {};

      if (message.method !== method || !predicate(params)) return;
      ws.off('message', onMessage);
      resolve(params);
    };

    ws.on('message', onMessage);
  });
}

function withTimeout<T>(promise: Promise<T>, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`${label} timed out`)),
      5_000,
    );

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
