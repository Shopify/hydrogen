import {outputInfo} from '@shopify/cli-kit/node/output';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
import {mergePackageJson} from '../../file.js';
import {canWriteFiles, copyAssets} from './assets.js';
import {getCodeFormatOptions} from '../../format-code.js';
import {injectVitePlugin, replaceRootLinks} from './replacers.js';
import {getAssetsDir} from '../../build.js';
import type {CssSetupConfig, CssSetupResult} from './common.js';

const tailwindCssPath = 'styles/tailwind.css';

export async function setupTailwind(
  {rootDirectory, appDirectory}: CssSetupConfig,
  force = false,
): Promise<undefined | CssSetupResult> {
  const relativeAppDirectory = relativePath(rootDirectory, appDirectory);

  const assetMap = {
    'tailwind.css': joinPath(relativeAppDirectory, tailwindCssPath),
  } as const;

  if (!(await canWriteFiles(assetMap, appDirectory, force))) {
    outputInfo(
      `Skipping CSS setup as some files already exist. You may use \`--force\` or \`-f\` to override it.`,
    );

    return;
  }

  const workPromise = Promise.all([
    mergePackageJson(await getAssetsDir('tailwind'), rootDirectory),
    copyAssets('tailwind', assetMap, rootDirectory),
    getCodeFormatOptions(rootDirectory).then((formatConfig) =>
      Promise.all([
        replaceRootLinks(appDirectory, formatConfig, {
          name: 'tailwindCss',
          path: `${tailwindCssPath}?url`,
          isDefault: true,
        }),
        injectVitePlugin(rootDirectory, formatConfig, {
          name: 'tailwindcss',
          path: '@tailwindcss/vite',
          isDefault: true,
        }),
      ]),
    ),
  ]);

  return {
    workPromise,
    generatedAssets: Object.values(assetMap),
    needsInstallDeps: true,
  };
}
