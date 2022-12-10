import {Plop, run} from 'plop';

import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import {path, output, file, error} from '@shopify/cli-kit';
import {flags} from '../../../../utils/flags.js';
import {Flags} from '@oclif/core';

import Command from '@shopify/cli-kit/node/base-command';

console.log(path.join(__dirname, 'tasks.js'));

// @ts-ignore
export default class Route extends Command {
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
    const {flags} = await this.parse(Route);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    Plop.prepare(
      {
        cwd: __dirname,
      },
      (env) =>
        Plop.execute(env, (env) => {
          const options = {
            ...env,
            dest: directory,
          };

          return run(options, undefined, false);
        }),
    );
  }
}
