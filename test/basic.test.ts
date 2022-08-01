/* eslint-disable jest/no-standalone-expect */
import {describe, it, beforeAll, afterAll, expect} from 'vitest';
import {
  createFileSystem,
  createInstance,
  createBrowser,
} from './test-framework';
import {paramCase} from 'change-case';
import {join} from 'path';

describe('basic-test', () => {
  let instance;
  let fs;
  let browser;
  beforeAll(async (context) => {
    const directory = join(__dirname, paramCase(context.name));

    fs = await createFileSystem(directory);

    await fs.write('index.html', template['index.html']({title: context.name}));
    await fs.write('vite.config.js', template['vite.config.js']());
    await fs.write('hydrogen.config.js', template['hydrogen.config.js']());
    await fs.write('src/App.server.jsx', template['App.Server.jsx']());
    await fs.write('src/index.css', '');

    instance = await createInstance(directory);

    await instance.dev();

    browser = await createBrowser();

    await browser.open();
  });

  afterAll(async () => {
    await browser.close();
    await instance.destroy();
    await fs.cleanup();
  });

  it('renders a basic page', async () => {
    await fs.write(
      'src/routes/index.server.tsx',
      `
        export default function Home() {
          return <div className="text-hello-world">Hello World</div>;
        }

      `
    );

    await browser.navigate(instance.url());
    const text = await browser.text('.text-hello-world');

    expect(text).toBe('Hello World');
  });
});
/* eslint-enable jest/no-standalone-expect */

const template = {
  'index.html': ({title}) => `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link rel="stylesheet" href="/src/index.css" />
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/@shopify/hydrogen/entry-client"></script>
      </body>
    </html>
  `,

  'vite.config.ts': () => `
    import {defineConfig} from 'vite';
    import hydrogen from '@shopify/hydrogen/plugin';
    
    export default defineConfig({
      plugins: [hydrogen()],
    });  
  `,

  'vite.config.js': () =>
    `
    import {defineConfig} from 'vite';
    import hydrogen from '@shopify/hydrogen/plugin';

    export default defineConfig({
      plugins: [hydrogen()],
    });

  `,

  'tsconfig.json': () =>
    JSON.stringify(
      {
        compilerOptions: {
          outDir: 'dist',
          target: 'es2020',
          module: 'esnext',
          moduleResolution: 'node16',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          experimentalDecorators: true,
          lib: ['dom', 'dom.iterable', 'scripthost', 'es2020'],
          allowJs: true,
          checkJs: true,
          jsx: 'react',
          types: ['vite/client'],
          esModuleInterop: true,
          isolatedModules: true,
          resolveJsonModule: true,
          skipLibCheck: true,
        },
        exclude: ['node_modules', 'dist'],
        include: ['**/*.ts', '**/*.tsx'],
      },
      null,
      2
    ),

  'hydrogen.config.js': () => `
    import {defineConfig} from '@shopify/hydrogen/config';

    export default defineConfig({
      shopify: {
        storeDomain: 'hydrogen-preview.myshopify.com',
        storefrontToken: '3b580e70970c4528da70c98e097c2fa0',
        storefrontApiVersion: '2022-07',
      },
    });
  `,

  'App.Server.jsx': () => `
    import React from 'react';
    import renderHydrogen from '@shopify/hydrogen/entry-server';
    import {Router, FileRoutes, ShopifyProvider} from '@shopify/hydrogen';
    import {Suspense} from 'react';

    function App() {
      return (
        <Suspense fallback={null}>
          <ShopifyProvider>
            <Router>
              <FileRoutes />
            </Router>
          </ShopifyProvider>
        </Suspense>
      );
    }

    export default renderHydrogen(App);
  `,
};
