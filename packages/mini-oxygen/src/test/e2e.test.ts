import {it, vi, describe, beforeEach, expect, afterEach} from 'vitest';

import {preview, MiniOxygenPreviewOptions} from '../preview';

import {createFixture, Fixture, sendRequest, checkAutoReload} from './utils';

const testPort = 1337;
const testTimeout = 9000;

// get-port does not detect a released port correctly in the testing environment
vi.mock('get-port', () => {
  return {
    default: () => testPort,
  };
});

describe('preview()', () => {
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
    const miniOxygen = await preview({
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
    const miniOxygen = await preview({
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
    const miniOxygen = await preview({
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

  it('include the auto-reload script', async () => {
    const miniOxygen = await preview({
      ...defaultOptions,
      log: mockLogger,
      port: testPort,
      workerFile: fixture.paths.workerFile,
      autoReload: true,
    });

    let receivedData;
    await sendRequest(testPort, '/html').then((response: any) => {
      receivedData = response.data;
    });
    expect(receivedData).toContain('// MiniOxygen Auto Reload');

    await checkAutoReload(testPort, fixture).then(async (response: any) => {
      console.log('xena', response);
      await miniOxygen.close();
    });
  });
});
