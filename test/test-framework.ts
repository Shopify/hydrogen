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
import {resolve, dirname, join, extname} from 'path';
import {createServer as createNodeServer} from 'http';
import type {Server as NodeServer} from 'http';
import {readFile, mkdirp, writeFile, pathExists} from 'fs-extra';
import {it as vitestIt, TestContext} from 'vitest';
import {
  build,
  createServer as createViteServer,
  InlineConfig,
  UserConfig,
} from 'vite';
import type {ViteDevServer} from 'vite';
import {chromium} from 'playwright';
import type {Browser} from 'playwright';
import {format as prettierFormat} from 'prettier';
import getPort from 'get-port';
import sirv from 'sirv';

interface Context {
  fs: SandboxFileSystem;
  instance: SandboxInstance;
}

export {expect} from 'vitest';
export function it(name: string, test: (TestContext) => void) {
  vitestIt(name, async (context: TestContext) => {
    await withFixture(context.meta.name, async ({fs, instance}) => {
      await test({fs, instance, ...context});
    });
  });
}

async function withFixture(name: string, runner: (context: Context) => void) {
  const directory = join(__dirname, paramCase(name));

  const fs = await createFileSystem(directory);
  const instance = await createInstance(directory);

  try {
    await runner({
      fs,
      instance,
    });
  } catch (error) {
    await instance.destroy();
    await fs.cleanup();

    throw error;
  } finally {
    await instance.destroy();
    await fs.cleanup();
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
        devDependencies: {
          vite: 'latest',
        },
      },
      null,
      2
    )
  );

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
    // await emptyDir(this.root);
    // await remove(this.root);
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
async function createInstance(root: string) {
  return new SandboxInstance(root);
}

class SandboxInstance {
  browser: Browser;
  devServer: ViteDevServer;
  startServer: NodeServer;

  constructor(public readonly root: string) {}

  url() {
    return `http://localhost:${this.server.config.server.port}`;
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
    const output = await build(await this.config());

    return output;
  }

  async start() {
    const serve = sirv(resolve(this.root, 'dist'));
    this.startServer = createNodeServer(serve);
    const port = await getPort();

    return new Promise((resolve, reject) => {
      this.startServer.on('error', reject);

      this.startServer.listen(port, () => {
        this.startServer.removeListener('error', reject);
        resolve(`http://localhost:${port}`);
      });
    });
  }

  async dev() {
    this.devServer = await createViteServer(await this.config());

    await this.devServer.listen();

    this.browser = await chromium.launch({
      headless: !process.env.VITE_DEBUG_SERVE,

      args: process.env.CI
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : undefined,
    });
    const page = await this.browser.newPage();

    return page;
  }

  async destroy() {
    await this.browser?.close();
    await this.devServer?.httpServer.close();
    await this.startServer?.close();
  }
}
