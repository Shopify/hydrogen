import {path, output, file, error} from '@shopify/cli-kit';
import url from 'url';
import {flags} from '../../../utils/flags.js';
import {Flags} from '@oclif/core';

import Command from '@shopify/cli-kit/node/base-command';

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
  const transformFile = path.join(
    __dirname,
    `./transforms/${transform}/${transform}.js`,
  );

  console.log(transformFile);

  if (!(await file.exists(transformFile))) {
    throw new error.Abort(`No transform module found for ${transform}`);
  }

  // @ts-expect-error `@types/jscodeshift` doesn't have types for this
  const applyTransform = (await import('jscodeshift/dist/testUtils.js'))
    .applyTransform;
  const transforms = await import(transformFile);
  const transformOptions = {
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
    const output = applyTransform(transforms, transformOptions, 'input');

    console.log(output);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
}
