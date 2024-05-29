import {outputInfo} from '@shopify/cli-kit/node/output';
import {mergePackageJson} from '../../file.js';
import {canWriteFiles, copyAssets} from './assets.js';
import {getSetupAssetDir} from '../../build.js';
import type {CssSetupConfig, CssSetupResult} from './common.js';

export async function setupPostCss(
  {rootDirectory, appDirectory, ...futureOptions}: CssSetupConfig,
  force = false,
): Promise<undefined | CssSetupResult> {
  const assetMap = {
    'postcss.config.js': 'postcss.config.js',
  } as const;

  if (futureOptions.postcss) {
    outputInfo(`PostCSS is already setup in ${rootDirectory}.`);
    return;
  }

  if (!(await canWriteFiles(assetMap, appDirectory, force))) {
    outputInfo(
      `Skipping CSS setup as some files already exist. You may use \`--force\` or \`-f\` to override it.`,
    );

    return;
  }

  const workPromise = Promise.all([
    mergePackageJson(await getSetupAssetDir('postcss'), rootDirectory),
    copyAssets('postcss', assetMap, rootDirectory),
  ]);

  return {
    workPromise,
    generatedAssets: Object.values(assetMap),
    helpUrl: 'https://postcss.org/',
  };
}
