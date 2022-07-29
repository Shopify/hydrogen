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
 *    not enough to describe what is being tested.
 *
 * 3. We also run these suites in indirect and inconsistent way where we split
 *    tests into multiple files for different environments (worker, node,
 *    etc...) and pass in configuration for modes (dev, prod, etc...). This
 *    makes tests hard to follow, but the granularity at which we can run a
 *    single tests and limits share-ability between multiple tests.
 *
 * 4. We use jest to run the tests, but we are migrating to vitest.
 *
 * Each of the above can be improved upon in the following framework with the
 * overall goal to make integration tests easier to follow and easier to write.
 * The following are the current improvements:
 *
 * 1. Each tests should create a sandbox directory with a specific set of files
 *    that exist only for the lifecycle of the test. This creates an isolated
 *    enviroment where we can create an instance of a HydrogenApp to ensure
 *    nothing in the monorepo is relied on accidentally nor do we polute the
 *    repository with extra files that are only needed for e2e tests.
 *
 */

import {paramCase} from 'change-case';
import {resolve, dirname, join} from 'path';
import {
  readFile,
  mkdirp,
  writeFile,
  pathExists,
  emptyDir,
  remove,
} from 'fs-extra';
import {it as vitestIt, TestContext, TestFunction} from 'vitest';
import {createServer} from 'vite';
import type {ViteDevServer} from 'vite';
import {chromium} from 'playwright';
import type {Browser, Page} from 'playwright';

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

    await mkdirp(dirname(filePath));
    await writeFile(filePath, contents, {encoding: 'utf8'});
  }

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
}

// Instance
async function createInstance(root: string) {
  return new SandboxInstance(root);
}

class SandboxInstance {
  browser: Browser;
  server: ViteDevServer;

  constructor(public readonly root: string) {}

  async start() {
    this.server = await createServer({
      root: this.root,
      server: {
        port: 3000,
      },
    });

    await this.server.listen();

    this.browser = await chromium.launch();
    const page = await this.browser.newPage();

    return page;
  }

  async destroy() {
    await this.browser.close();
    await new Promise<void>((resolve, reject) => {
      this.server.httpServer.close((error) =>
        error ? reject(error) : resolve()
      );
    });
  }
}
