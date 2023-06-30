import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {runGenerate} from './route.js';
import {generateMultipleRoutes} from '../../../lib/setups/routes/generate.js';

describe('runGenerate', () => {
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('../../../lib/setups/routes/generate.js');
  });

  afterEach(() => {
    vi.resetAllMocks();
    outputMock.clear();
  });

  it('calls route generation and renders the result', async () => {
    vi.mocked(generateMultipleRoutes).mockResolvedValue({
      isTypescript: true,
      transpilerOptions: {} as any,
      formatOptions: {} as any,
      v2Flags: {} as any,
      routes: [
        {sourceRoute: '', destinationRoute: '/cart', operation: 'created'},
        {sourceRoute: '', destinationRoute: '/about', operation: 'skipped'},
        {
          sourceRoute: '',
          destinationRoute: '/collections',
          operation: 'created',
        },
      ],
    });

    const options = {
      routeName: 'all',
      directory: 'there',
      typescript: true,
    };

    await runGenerate(options);

    expect(generateMultipleRoutes).toHaveBeenCalledWith(options);

    expect(outputMock.info()).toMatch(/2 of 3 routes/i);
  });
});
