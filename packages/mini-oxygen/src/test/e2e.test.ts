import {it, vi, describe, beforeEach, expect, afterEach} from 'vitest';
import EventSource from 'eventsource';

import {startServer, MiniOxygenPreviewOptions} from '../startServer.js';

import {
  createFixture,
  Fixture,
  sendRequest,
  createMockProxyServer,
} from './utils';

const testPort = 1337;

// get-port does not detect a released port correctly in the testing environment
vi.mock('get-port', () => {
  return {
    default: () => testPort,
  };
});

describe('start()', () => {
  let fixture: Fixture;
  const defaultOptions: MiniOxygenPreviewOptions = {
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
});
