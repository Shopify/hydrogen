import GenerateRoute, {runGenerate} from './route.js';
import GenerateRoutes from './routes.js';
import {captureJsonOutput} from '../../../../tests/output.js';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {generateRoutes} from '../../../lib/setups/routes/generate.js';

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
    vi.mocked(generateRoutes).mockResolvedValue({
      isTypescript: true,
      formatOptions: {} as any,
      routeGroups: {},
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

    expect(generateRoutes).toHaveBeenCalledWith({
      ...options,
      v1RouteConvention: false,
    });

    expect(outputMock.info()).toMatch(/2 of 3 routes/i);
  });
});

it.each([GenerateRoute, GenerateRoutes])(
  'exposes JSON on route commands: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
  },
);

it('encodes created, replaced and skipped routes without the success banner', async () => {
  const result = {
    isTypescript: true,
    routeGroups: {cart: ['cart.tsx']},
    routes: [
      {
        sourceRoute: 'cart.tsx',
        destinationRoute: 'app/routes/cart.tsx',
        operation: 'created' as const,
      },
      {
        sourceRoute: 'account.tsx',
        destinationRoute: 'app/routes/account.tsx',
        operation: 'replaced' as const,
      },
      {
        sourceRoute: 'search.tsx',
        destinationRoute: 'app/routes/search.tsx',
        operation: 'skipped' as const,
      },
    ],
  };
  vi.mocked(generateRoutes).mockResolvedValue({
    ...result,
    formatOptions: {} as any,
  });
  const {stdout, stderr} = await captureJsonOutput(() =>
    runGenerate({routeName: 'all', directory: '/project'}),
  );
  expect(JSON.parse(stdout)).toEqual(result);
  expect(stderr).toBe('');
  expect(() =>
    GenerateRoute.jsonOutputSchema.encode({
      ...result,
      isTypescript: 'yes',
    } as any),
  ).toThrow();
});

it('forwards all-route flags without reconstructing false boolean arguments', async () => {
  vi.mocked(generateRoutes).mockResolvedValue({
    routes: [],
    routeGroups: {},
    isTypescript: false,
    formatOptions: {} as any,
  });
  const command = new GenerateRoutes([], {} as any);
  const parse = vi
    .spyOn(command as any, 'parse')
    .mockResolvedValue({flags: {json: true, path: '/project', force: false}});
  try {
    const {stdout} = await captureJsonOutput(() => command.run());
    expect(JSON.parse(stdout)).toEqual({
      routes: [],
      routeGroups: {},
      isTypescript: false,
    });
    expect(generateRoutes).toHaveBeenLastCalledWith(
      expect.objectContaining({routeName: 'all', force: false}),
    );
  } finally {
    parse.mockRestore();
  }
});
