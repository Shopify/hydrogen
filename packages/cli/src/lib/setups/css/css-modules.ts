import {mergePackageJson} from './assets.js';
import {getCodeFormatOptions} from '../../format-code.js';
import type {SetupConfig, SetupResult} from './common.js';
import {replaceRootLinks} from './replacers.js';

export async function setupCssModules({
  rootDirectory,
  appDirectory,
}: SetupConfig): Promise<undefined | SetupResult> {
  const workPromise = Promise.all([
    mergePackageJson('css-modules', rootDirectory),
    getCodeFormatOptions(rootDirectory).then((formatConfig) =>
      replaceRootLinks(appDirectory, formatConfig, {
        name: 'cssBundleHref',
        path: '@remix-run/css-bundle',
        isDefault: false,
        isConditional: true,
        isAbsolute: true,
      }),
    ),
  ]);

  return {
    workPromise,
    generatedAssets: [],
    helpUrl: 'https://github.com/css-modules/css-modules',
  };
}
