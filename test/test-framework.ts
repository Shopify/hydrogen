/**
 * Hydrogen integration tests for the framework
 *
 * ## How do we currently do things?
 *
 * 1. We keep all integration tests in the packages/playground directory and
 *    each of these sub-folders runs a test suite on itself. This relies on
 *    physical files being present in each of those directories, which adds a
 *    lot of weight and confusion to the repository (lots of hydrogen.config.js
 *    files, etc).
 *
 * 2. This structure also makes integration tests hard to follow -requiring
 *    developers to traverse all the files in the sub-folder to understand what
 *    is unique to this project. The test definition code file itself is often
 *    not enough to describe what is being tested, and worse, we often layer a
 *    number of tests together in one sub-folder. This makes it even harder to
 *    know what each sub-folder is responsible for and easy for different tests
 *    to bleed into each other.
 *
 * 3. We also run these tests in indirect and inconsistent way where we separate
 *    out the the test definitions into a single file that is wrapped in a
 *    function that takes in environment configuration. We then have multiple
 *    similar files that import and call the test function, passing in a
 *    configuration for different environments (worker, node, etc...) and pass
 *    in configuration for modes (dev, prod, etc...). This makes tests hard to
 *    follow, and limits the granularity at which we can run a single tests and
 *    the share-ability between multiple tests.
 *
 * 4. We use jest to run the tests, but we are migrating to vitest. We have a
 *    lot of plumbing that is tucked away in various setups scripts. These are
 *    not very discoverable and very tied to the jest way of doing things.
 *
 * 5. We do hacky stuff to extend and support playwright for RSC and we lack
 *    primitives for testing HMR.
 *
 * Each of the above can be improved upon in the following framework with the
 * overall goal to make integration tests easier to follow and easier to write.
 * The following are the current improvements:
 *
 * 1. Each tests should create a sandbox directory with a specific set of files
 *    that exist only for the lifecycle of the test. This creates an isolated
 *    environment where we can create an instance of a HydrogenApp to ensure
 *    nothing in the monorepo is relied on accidentally nor do we pollute the
 *    repository with extra files that are only needed for e2e tests.
 *
 */

import {paramCase} from 'change-case';
import {execSync} from 'child_process';
import {resolve, dirname, join, extname} from 'path';
import {createServer as createNodeServer} from 'http';
import type {Server as NodeServer} from 'http';
import {
  readFile,
  mkdirp,
  writeFile,
  pathExists,
  emptyDir,
  remove,
} from 'fs-extra';
import {it as vitestIt, TestContext} from 'vitest';
import {
  build,
  createServer as createViteServer,
  InlineConfig,
  loadEnv,
} from 'vite';
import type {ViteDevServer} from 'vite';
import {chromium} from 'playwright';
import type {Browser} from 'playwright';
import {format as prettierFormat} from 'prettier';
import getPort from 'get-port';
import sirv from 'sirv';
// TODO: Use Mini-Oxygen
import {Miniflare} from 'miniflare';

interface Context {
  fs: SandboxFileSystem;
  instance: SandboxInstance;
}

interface Options {
  debug?: boolean;
}

export {expect} from 'vitest';
export function it(
  name: string,
  test: (TestContext) => void,
  options: Options = {}
) {
  vitestIt(name, async (context: TestContext) => {
    await withFixture(
      context.meta.name,
      async ({fs, instance}) => {
        await test({fs, instance, ...context});
      },
      options
    );
  });
}

async function withFixture(
  name: string,
  runner: (context: Context) => void,
  options: Options = {}
) {
  const directory = join(__dirname, paramCase(name));

  const fs = await createFileSystem(directory);
  const instance = await createInstance(directory, options);

  try {
    await runner({
      fs,
      instance,
    });
  } catch (error) {
    if (!options.debug) {
      await instance.destroy();
      await fs.cleanup();
    }

    throw error;
  } finally {
    if (!options.debug) {
      await instance.destroy();
      await fs.cleanup();
    }
  }
}

// FileSystem
async function createFileSystem(directory: string) {
  await mkdirp(directory);
  await writeFile(join(directory, '.gitignore'), '*');
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify(
      {
        name: `@fixture/${directory.split('/').pop()}`,
        private: true,
        scripts: {
          dev: 'shopify hydrogen dev',
          build: 'shopify hydrogen build',
          [`build:server`]: 'shopify hydrogen build --target node',
          preview: 'shopify hydrogen preview',
        },
        devDependencies: {
          '@shopify/cli': 'latest',
          '@shopify/cli-hydrogen': 'latest',
          vite: '^2.9.0',
        },
        dependencies: {
          '@shopify/hydrogen': '^1.2.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
      },
      null,
      2
    )
  );
  await mkdirp(join(directory, 'public'));
  await mkdirp(join(directory, 'src'));

  return new SandboxFileSystem(directory);
}

class SandboxFileSystem {
  constructor(public readonly root: string) {}

  private resolvePath(...parts: string[]) {
    return resolve(this.root, ...parts);
  }

  async write(file: string | [string, string][], contents: string) {
    if (Array.isArray(file)) {
      file.forEach((value) => this.write(...value));
      return;
    }

    const filePath = this.resolvePath(file);
    const formattedContent = await this.format(filePath, contents);

    await mkdirp(dirname(filePath));
    await writeFile(filePath, formattedContent, {encoding: 'utf8'});
  }

  async edit(file: string) {}

  async read(file: string) {
    const filePath = this.resolvePath(file);
    return readFile(filePath, 'utf8');
  }

  async exists(file: string) {
    const filePath = this.resolvePath(file);
    return pathExists(filePath);
  }

  async cleanup() {
    await emptyDir(this.root);
    await remove(this.root);
  }

  async format(path, content) {
    const ext = extname(path);
    const prettierConfig = {
      arrowParens: 'always' as const,
      singleQuote: true,
      bracketSpacing: false,
      trailingComma: 'all' as const,
      parser: 'babel',
    };

    switch (ext) {
      case '.md':
        prettierConfig.parser = 'markdown';
        break;
      case '.html':
      case '.svg':
        prettierConfig.parser = 'html';
        break;
      case '.json':
      case '.css':
        prettierConfig.parser = ext.slice(1);
        break;
    }

    const formattedContent = await prettierFormat(content, prettierConfig);

    return formattedContent;
  }
}

// Instance
async function createInstance(root: string, options?: SandboxInstanceOptions) {
  const instance = new SandboxInstance(root, options);

  return instance;
}

interface SandboxInstanceOptions {
  debug?: boolean;
}

class SandboxInstance {
  debug: boolean;
  browser: Browser;
  devServer: ViteDevServer;
  startServer: NodeServer;

  constructor(
    public readonly root: string,
    options: SandboxInstanceOptions = {}
  ) {
    this.debug = options.debug;
  }

  url() {
    if (this.devServer) {
      const port = this.devServer.config.server.port;
      return `http://localhost:${port}`;
    }

    console.log(this.startServer);

    if (this.startServer) {
      const address = this.startServer.address();
      const port = typeof address === 'string' ? address : address.port;

      return `http://localhost:${port}`;
    }
  }

  async config(): Promise<InlineConfig> {
    return {
      root: this.root,
      logLevel: 'silent',
      server: {
        watch: {
          usePolling: true,
          interval: 100,
        },
        host: true,
        port: await getPort(),
      },
      build: {
        target: 'esnext',
      },
    };
  }

  async build() {
    // const output = await build(await this.config());
    execSync('yarn build:server', {
      cwd: this.root,
      env: {...process.env},
    });
  }

  async start({target}: {target: ('node' | 'worker')[]}) {
    const currentTarget = target.pop();

    if (!currentTarget) {
      return;
    }

    await this.install();
    await this.build();

    if (currentTarget === 'node') {
      const serve = sirv(resolve(this.root, 'dist'));
      const {createServer: createNodeServer} = await import(
        join(this.root, 'dist', 'node')
      );

      const env = await this.loadEnv();

      Object.assign(process.env, env);

      const {app} = await createNodeServer(serve);

      const port = await getPort();

      await this.start({target});

      return new Promise((resolve, reject) => {
        this.startServer = app.listen(port, () => {
          const browser = createSandboxBrowser({debug: this.debug});

          resolve(browser);
        });
      });
    }

    if (currentTarget === 'worker') {
      const mf = new Miniflare({
        scriptPath: resolve(this.root, 'dist/worker/index.js'),
        sitePath: resolve(this.root, 'dist/client'),
        bindings: await this.loadEnv(),
      });

      const app = mf.createServer();

      const port = await getPort();

      return new Promise((resolve, reject) => {
        this.startServer = app.listen(port, () => {
          const browser = createSandboxBrowser({debug: this.debug});

          resolve(browser);
        });
      });
    }
  }

  async dev() {
    this.devServer = await createViteServer(await this.config());

    await this.devServer.listen();

    const browser = createSandboxBrowser({debug: this.debug});

    return browser;
  }

  public async loadEnv() {
    const env = await loadEnv('production', this.root, '');

    Object.keys(env).forEach((key) => {
      if (['VITE_', 'PUBLIC_'].some((prefix) => key.startsWith(prefix))) {
        delete env[key];
      }
    });

    return env;
  }

  async install() {
    execSync('yarn', {
      cwd: this.root,
      env: {...process.env},
    });
  }

  async destroy() {
    await this.browser?.close();
    await this.devServer?.httpServer.close();
    await this.startServer?.close();
  }
}

async function createSandboxBrowser({debug}: SandboxInstanceOptions = {}) {
  const browser = await chromium.launch({
    headless: !debug,

    args: process.env.CI
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : undefined,
  });

  const page = await browser.newPage();

  return {
    navigate: async (url: string) => {
      await page.goto(url);
    },

    text: async (selector: string) => {
      await page.waitForSelector(selector);

      const text = await page.evaluate(
        (querySelector) => document.querySelector(querySelector).textContent,
        selector
      );

      return text;
    },
  };
}

export const template = {
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
    // `
    //   const hydrogen = require('@shopify/hydrogen/plugin.cjs');

    //   /**
    //    * @type {import('vite').UserConfig}
    //    */
    //   module.exports = {
    //     plugins: [
    //       hydrogen(),
    //     ],
    //   };
    //   `
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
