import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {copyDiffBuild, prepareDiffDirectory} from '../../lib/template-diff.js';
import {hasViteConfig} from '../../lib/vite-config.js';
import {runClassicCompilerBuild} from '../../lib/classic-compiler/build.js';

export default class Build extends Command {
  static descriptionWithMarkdown = `Builds a Hydrogen storefront for production. The client and app worker files are compiled to a \`/dist\` folder in your Hydrogen project directory.`;

  static description = 'Builds a Hydrogen storefront for production.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.sourcemap,
    'bundle-stats': Flags.boolean({
      description:
        'Show a bundle size summary after building. Defaults to true, use `--no-bundle-stats` to disable.',
      default: true,
      allowNo: true,
    }),
    ...commonFlags.lockfileCheck,
    ...commonFlags.disableRouteWarning,
    ...commonFlags.codegen,
    ...commonFlags.diff,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Build);
    const originalDirectory = flags.path
      ? resolvePath(flags.path)
      : process.cwd();
    let directory = originalDirectory;

    if (flags.diff) {
      directory = await prepareDiffDirectory(originalDirectory, false);
    }

    const buildParams = {
      ...flagsToCamelObject(flags),
      useCodegen: flags.codegen,
      directory,
    };

    if (await hasViteConfig(directory ?? process.cwd())) {
      const {runViteBuild} = await import('./build-vite.js');
      await runViteBuild(buildParams);
    } else {
      await runClassicCompilerBuild(buildParams);
    }

    if (flags.diff) {
      await copyDiffBuild(directory, originalDirectory);
    }

    // The Remix compiler hangs due to a bug in ESBuild:
    // https://github.com/evanw/esbuild/issues/2727
    // The actual build has already finished so we can kill the process.
    process.exit(0);
  }
}
