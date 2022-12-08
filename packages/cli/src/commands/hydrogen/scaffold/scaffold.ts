import {path, output, file} from '@shopify/cli-kit';
import url from 'url';
import {flags} from '../../../utils/flags.js';
import {Flags} from '@oclif/core';

// @ts-expect-error `@types/jscodeshift` doesn't have types for this
// import * as jscodeshift from 'jscodeshift/src/Runner.js';
import {createRequire} from 'module';
import Command from '@shopify/cli-kit/node/base-command';

// const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

interface ScaffoldOptions {
  transform?: string;
  path: string;
  dry?: boolean;
  print?: boolean;
  force?: boolean;
}

// @ts-ignore
export default class Scaffold extends Command {
  static description = 'Scaffolds Hydrogen in an existing Remix app';
  static flags = {
    path: flags.path,
    transform: Flags.string(),
    dry: Flags.boolean(),
    print: Flags.boolean(),
    force: Flags.boolean(),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Scaffold);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runScaffold({...flags, path: directory});
  }
}

export async function runScaffold({
  path: appPath,
  transform,
  dry,
}: ScaffoldOptions) {
  const remixConfigPath = await path.findUp('remix-config.js', {cwd: appPath});
  const transformFile = path.join(
    __dirname,
    `./transforms/${transform}/${transform}.js`,
  );

  if (!(await file.exists(transformFile))) {
    throw new Error(`No migration found for ${transform}`);
  }

  if (!remixConfigPath) {
    output.warn('Could not find a remix-config.js file in this directory');
  }

  const options = {
    babel: true,
    dry,
    extensions: 'tsx,ts,jsx,js',
    failOnError: false,
    ignorePattern: ['**/node_modules/**', '**/.cache/**', '**/build/**'],
    parser: 'tsx',
    print: true,
    runInBand: true,
    silent: false,
    stdin: false,
    verbose: 2,
  };

  const filepaths = await path.glob([`${appPath}/**/*`]);

  if (filepaths.length === 0) {
    throw new Error(`No files found for ${appPath}`);
  }

  try {
    const require = createRequire(import.meta.url);
    const jscodeshift = require('jscodeshift/src/Runner.js');
    const {error} = await jscodeshift.run(transformFile, filepaths, options);
    console.log(error);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
}
