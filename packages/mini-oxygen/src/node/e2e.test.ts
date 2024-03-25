import {join, resolve} from 'node:path';
import http, {type IncomingMessage} from 'node:http';

import {writeFile, ensureDir, remove} from 'fs-extra';
import {temporaryDirectory} from 'tempy';
import {it, vi, describe, beforeEach, expect, afterEach} from 'vitest';
import EventSource from 'eventsource';

import {startServer, Response, type MiniOxygenOptions} from './index.js';

const testPort = 1337;

// get-port does not detect a released port correctly in the testing environment
vi.mock('get-port', () => {
  return {
    default: () => testPort,
    portNumbers: () => [testPort],
  };
});

describe('start()', () => {
  let fixture: Fixture;
  const defaultOptions: MiniOxygenOptions = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    fixture = await createFixture('basic-fixture');
  });

  afterEach(async () => {
    await fixture.destroy();
  });

  const mockLogger = vi.fn();

  it('displays a message when the server is running', async () => {
    const mockLogger = vi.fn();
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      workerFile: fixture.paths.workerFile,
    });
    await miniOxygen.close();

    expect(mockLogger).toHaveBeenCalledWith(
      `\nStarted miniOxygen server. Listening at http://localhost:${testPort}\n`,
    );
  });

  it('receives HTML from test worker', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      workerFile: fixture.paths.workerFile,
    });

    let receivedData;
    let mimeType;
    await sendRequest(testPort, '/html').then(async (response: any) => {
      receivedData = response.data;
      mimeType = response.mimeType;
      await miniOxygen.close();
    });

    expect(receivedData).toBe('<html><body>Hello, world</body>');
    expect(mimeType).toBe('text/html');
  });

  it('serves a static asset', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      workerFile: fixture.paths.workerFile,
      assetsDir: fixture.paths.assets,
    });

    let receivedData;
    let mimeType;
    await sendRequest(testPort, '/star.svg').then(async (response: any) => {
      receivedData = response.data;
      mimeType = response.mimeType;
      await miniOxygen.close();
    });
    expect(receivedData).toBe(
      '<svg><polygon points="100,10 40,198 190,78 10,78 160,198" style="fill:gold;"/></svg>',
    );
  });

  it('includes the auto-reload script and sends reload event on worker change', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      workerFile: fixture.paths.workerFile,
      autoReload: true,
      watch: true,
    });

    let receivedData;
    await sendRequest(testPort, '/html').then((response: any) => {
      receivedData = response.data;
    });
    expect(receivedData).toContain('// MiniOxygen Auto Reload');

    const eventStream = new EventSource(
      `http://localhost:${testPort}/__minioxygen_events`,
    );
    const eventsCaught: MessageEvent[] = [];
    eventStream.addEventListener('message', (event: MessageEvent) =>
      eventsCaught.push(event),
    );
    fixture.updateWorker();

    // we need a short timeout to allow the "reload" event on the MiniOxygen instance to fire
    await new Promise((resolve, _reject) => {
      setTimeout(() => resolve(null), 500);
    });

    expect(eventsCaught.length).toBe(2);
    expect(eventsCaught[0].data).toBe('connected');
    expect(eventsCaught[1].data).toBe('reload');
    await miniOxygen.close();
  });

  it('adds the nonce found in response headers to the auto-reload scripts', async () => {
    const nonce = 'd1406e0c6f5f820878cf3f3af597365b';
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      autoReload: true,
      script:
        `export default { fetch: () =>` +
        `new Response("<div>foo</div>", {headers: {` +
        `"content-type": "text/html",` +
        `"content-security-policy": "base-uri 'self'; default-src 'self' 'nonce-${nonce}' https://cdn.shopify.com; frame-ancestors none; style-src 'self' 'unsafe-inline' https://cdn.shopify.com"` +
        `}}) }`,
    });

    let receivedData;
    await sendRequest(testPort, '/').then((response: any) => {
      receivedData = response.data;
    });

    expect(receivedData).toContain(`<script nonce="${nonce}" `);

    await miniOxygen.close();
  });

  it('adds Oxygen request headers', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      script:
        'export default { fetch: (req) =>' +
        ' new Response(JSON.stringify(Object.fromEntries(req.headers.entries())))' +
        '}',
    });

    let receivedData = '';
    await sendRequest(testPort, '/').then((response: any) => {
      receivedData = response.data;
    });

    expect(receivedData.at(0)).toEqual(`{`);

    const headers = JSON.parse(receivedData);
    expect(headers['request-id']).toMatch(/^[a-z0-9-]{36}$/);
    expect(headers['oxygen-buyer-ip']).toEqual('127.0.0.1');

    await miniOxygen.close();
  });

  it('proxies requests to a proxy server', async () => {
    const mockLogger = vi.fn();
    const proxyPort = 1338;
    const proxyServer = createMockProxyServer(proxyPort);

    proxyServer.on('connection', () => {
      mockLogger('Proxy request received');
    });

    const miniOxygen = await startServer({
      ...defaultOptions,
      port: testPort,
      workerFile: fixture.paths.workerFile,
      proxyServer: `localhost:${proxyPort}`,
    });

    let receivedData;
    await sendRequest(testPort, '/html').then((response: any) => {
      receivedData = response.data;
    });

    expect(mockLogger).toHaveBeenLastCalledWith(`Proxy request received`);
    expect(receivedData).toBe('bogus content');
    await miniOxygen.close();
    proxyServer.close();
  });

  it('reloads environment variables', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      workerFile: fixture.paths.workerFile,
      env: {test: 'foo'},
    });

    let response = (await sendRequest(testPort, '/')) as {data: string};
    expect(response.data).toEqual(JSON.stringify({test: 'foo'}));

    await miniOxygen.reload({env: {test: 'bar'}});

    response = (await sendRequest(testPort, '/')) as {data: string};
    expect(response.data).toEqual(JSON.stringify({test: 'bar'}));

    await miniOxygen.close();
  });

  it('reloads script', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      script: 'export default { fetch: () => new Response("foo") }',
    });

    let response = (await sendRequest(testPort, '/')) as {data: string};
    expect(response.data).toEqual('foo');

    await miniOxygen.reload({
      script: 'export default { fetch: () => new Response("bar") }',
    });

    response = (await sendRequest(testPort, '/')) as {data: string};
    expect(response.data).toEqual('bar');

    await miniOxygen.close();
  });

  it('stubs global fetch', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      script: 'export default { fetch: () => fetch("foo") }',
      globalFetch: (url) => {
        return Promise.resolve(new Response(`${url}bar`));
      },
    });

    const response = (await sendRequest(testPort, '/')) as {data: string};
    expect(response.data).toEqual('foobar');

    await miniOxygen.close();
  });

  it('can intercept and respond to requests in onRequest', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      script: 'export default { fetch: () => new Response("foo") }',
      onRequest: (request) => {
        if (new URL(request.url).pathname === '/test') {
          return new Response('bar');
        }
      },
    });

    let response = (await sendRequest(testPort, '/')) as {data: string};
    expect(response.data).toEqual('foo');

    response = (await sendRequest(testPort, '/test')) as {data: string};
    expect(response.data).toEqual('bar');

    await miniOxygen.close();
  });

  it('can call dispatchFetch from onRequest', async () => {
    const miniOxygen = await startServer({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      script: 'export default { fetch: () => new Response("foo") }',
      onRequest: async (request, dispatchFetch) => {
        const response = await dispatchFetch();
        return new Response(`${await response.text()}bar`);
      },
    });

    const response = (await sendRequest(testPort, '/')) as {data: string};
    expect(response.data).toEqual('foobar');

    await miniOxygen.close();
  });
});

// ---- TEST UTILS

interface Fixture {
  destroy(): Promise<void>;
  paths: {
    root: string;
    config: string;
    assets: string;
    workerFile: string;
  };
  updateWorker: () => Promise<void>;
}

async function createFixture(name: string): Promise<Fixture> {
  const directory = await temporaryDirectory({prefix: name});
  const paths = {
    root: directory,
    config: join(directory, 'mini-oxygen.config.json'),
    workerFile: join(directory, 'worker.mjs'),
    assets: join(directory, 'assets'),
  };

  await ensureDir(paths.assets);
  await writeFile(join(directory, '.gitignore'), '*');

  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify(
      {
        name: 'test-worker',
        version: '1.0.0',
        description: 'A test worker',
        main: 'worker.mjs',
        license: 'MIT',
        type: 'module',
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(directory, 'worker.mjs'),
    `
export default {
  async fetch(request, environment, context) {
    if (new URL(request.url).pathname === '/html') {
      return new Response('<html><body>Hello, world</body>', {
        headers: {"Content-Type": "text/html"}
      });
    }

    return new Response(JSON.stringify(environment), {
      headers: {"Content-Type": "application/json"}
    });
  }
}
    `.trim(),
  );

  await writeFile(
    join(paths.assets, 'star.svg'),
    `<svg><polygon points="100,10 40,198 190,78 10,78 160,198" style="fill:gold;"/></svg>`.trim(),
  );

  return {
    paths,
    destroy: async () => {
      await remove(paths.assets);
      await remove(directory);
    },
    updateWorker: () => {
      return writeFile(
        join(directory, 'worker.mjs'),
        `
export default {
  async fetch(request, environment, context) {
    return new Response('<html><body><q>Forty-two</q> said Deep Thought, with infinite majesty and calm.</body>', {
      headers: {"Content-Type": "text/html"}
    });
  }
}
        `,
      );
    },
  };
}

async function sendRequest(port: number, path: string) {
  return new Promise((resolve, _reject) => {
    http.get(`http://localhost:${port}${path}`, (response) => {
      let data = '';
      response
        .on('data', (chunk) => {
          data += chunk;
        })
        .on('end', () => {
          resolve({
            mimeType: response.headers['content-type'],
            data,
          });
        });
    });
  });
}

function createMockProxyServer(port: number): http.Server {
  const onRequest = (_req: IncomingMessage, res: any) => {
    res.writeHead(200, {'Content-Type': 'text/plain; charset=UTF-8'});
    res.end('bogus content', 'utf8');
  };

  return http.createServer(onRequest).listen(port);
}
