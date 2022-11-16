import path from 'path';
import * as esbuild from 'esbuild';
import fsExtra from 'fs-extra';
import {getProjectPaths} from '../../utils/config.js';
import {getRemixConfig} from '../../utils/config.js';
import {flags} from '../../utils/flags.js';

// TODO: why can't we use the shopify kit version of this?
// import Command from '@shopify/cli-kit/node/base-command';
import {Flags, Command} from '@oclif/core';

import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const remix = require('@remix-run/dev/dist/compiler');

export default class Build extends Command {
  static description = 'Builds a Hydrogen storefront for production';
  static flags = {
    ...flags,
    devReload: Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_DEV_RELOAD',
    }),
    sourcemap: Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
    }),
    entry: Flags.string({
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
      default: '', // TODO: what is the default entry?
    }),
    minify: Flags.boolean({
      description: 'Minify the build output',
      env: 'SHOPIFY_HYDROGEN_FLAG_MINIFY',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Build);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runBuild({...flags, path: directory});
  }
}

export async function runBuild({
  entry,
  devReload = false,
  sourcemap = true,
  minify = !devReload,
  path: appPath,
}: {
  entry: string;
  devReload?: boolean;
  sourcemap?: boolean;
  minify?: boolean;
  path?: string;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  const {
    root,
    entryFile,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  } = getProjectPaths(appPath, entry);

  if (!devReload) {
    const remixConfig = await getRemixConfig(root);
    await fsExtra.rm(buildPath, {force: true, recursive: true});

    // eslint-disable-next-line no-console
    console.log(`Building app in ${process.env.NODE_ENV} mode...`);

    await remix.build(remixConfig, {
      mode: process.env.NODE_ENV as any,
      sourcemap,
      onBuildFailure: (failure: typeof remix.BuildError) => {
        remix.formatBuildFailure(failure);
        // Stop here and prevent waterfall errors
        throw Error();
      },
    });
  }

  await fsExtra.copy(publicPath, buildPathClient, {
    recursive: true,
    overwrite: true,
  });

  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    outfile: buildPathWorkerFile,
    format: 'esm',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    sourcemap,
    minify,
  });

  if (process.env.NODE_ENV !== 'development') {
    const {size} = await fsExtra.stat(buildPathWorkerFile);
    const sizeMB = size / (1024 * 1024);

    // eslint-disable-next-line no-console
    console.log(
      '\n' + path.relative(root, buildPathWorkerFile),
      '  ',
      Number(sizeMB.toFixed(2)),
      'MB',
    );

    if (sizeMB >= 1) {
      // eslint-disable-next-line no-console
      console.warn(
        '\n-- Worker bundle exceeds 1 MB! This can delay your worker response.',
      );
    }
  }
}
