import {cli} from '@remix-run/dev';
import fsExtra from 'fs-extra';
import esbuild from 'esbuild';
import {getProjectPaths} from '../utils/paths';

export async function runBuild({
  entry,
  sourcemap = true,
  minify = true,
}: {
  entry: string;
  sourcemap?: boolean;
  minify?: boolean;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  const {
    root,
    entryFile,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  } = getProjectPaths(entry);

  await fsExtra.rm(buildPath, {force: true, recursive: true});
  await cli.run(['build', root]);

  await fsExtra.copy(publicPath, buildPathClient, {
    recursive: true,
    overwrite: true,
  });

  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    outfile: buildPathWorkerFile,
    format: 'esm',
    logOverride: {'this-is-undefined-in-esm': 'silent'},
    define: {'process.env.REMIX_DEV_SERVER_WS_PORT': '8002'},
    sourcemap,
    minify,
  });
}
