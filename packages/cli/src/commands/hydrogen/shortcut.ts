import Command from '@shopify/cli-kit/node/base-command';
import {renderFatalError, renderSuccess} from '@shopify/cli-kit/node/ui';
import {execSync} from 'child_process';
import Flags from '@oclif/core/lib/flags.js';
import {fileURLToPath} from 'url';
import path from 'path';

export default class GenerateRoute extends Command {
  static description: 'Creates a global `h2` shortcut for the Hydrogen CLI';
  static flags = {
    ['bin-path']: Flags.string({
      description:
        'The path where the shortcut should be created. This is generally the path to a global NPM bin directory (`npm bin -g`).',
      env: 'SHOPIFY_HYDROGEN_FLAG_BIN_PATH',
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(GenerateRoute);

    await runCreateShortcut(flags.binPath);
  }
}

const isWindows = process.platform === 'win32';

export async function runCreateShortcut(userBinDir?: string) {
  userBinDir =
    userBinDir ||
    execSync(isWindows ? 'npm prefix -g' : 'npm bin -g', {encoding: 'utf-8'});

  const globalBinDir = userBinDir?.trim();

  if (!globalBinDir) {
    return renderFatalError({
      name: 'error',
      type: 0,
      message: 'Could not find a global NPM bin directory.',
      tryMessage:
        'Try passing the path to a directory for global executables in the `--bin-path` flag.',
    });
  }

  if (!process.env.PATH?.split(isWindows ? ';' : ':').includes(globalBinDir)) {
    return renderFatalError({
      name: 'error',
      type: 0,
      message: `The path \`${globalBinDir}\` is not included in your global $PATH.`,
      tryMessage:
        'Please add it to $PATH and run this command again. Alternatively, try passing an included path with the `--bin-path` flag.',
    });
  }

  // Usage: https://github.com/npm/bin-links/blob/main/lib/link-bins.js
  const {default: linkBin} = await import(
    isWindows ? 'bin-links/lib/shim-bin.js' : 'bin-links/lib/link-bin.js'
  );

  const absFrom = fileURLToPath(new URL('../../h2.cjs', import.meta.url));

  await linkBin({
    absFrom,
    from: path.relative(globalBinDir, absFrom),
    to: path.join(globalBinDir, 'h2'),
    force: true,
    path: '', // Required but not used
  });

  renderSuccess({
    headline: 'Shortcut created. You can now run `h2` from your local project.',
  });
}
