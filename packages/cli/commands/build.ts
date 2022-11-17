import path from 'path';
import * as esbuild from 'esbuild';
import * as remix from '@remix-run/dev/dist/compiler';
import fsExtra from 'fs-extra';
import {getProjectPaths} from '../utils/config';
import {getRemixConfig} from '../utils/config';

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
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = devReload ? 'development' : 'production';
  }

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
      onBuildFailure: (failure: remix.BuildError) => {
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
    conditions: ['worker', process.env.NODE_ENV],
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
