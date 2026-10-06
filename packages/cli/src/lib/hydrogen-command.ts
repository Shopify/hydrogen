import Command from '@shopify/cli-kit/node/base-command';
import {globalFlags} from '@shopify/cli-kit/node/cli';
import {AbortError} from '@shopify/cli-kit/node/error';
import {cwd, resolvePath} from '@shopify/cli-kit/node/path';
import {isTruthy} from '@shopify/cli-kit/node/context/utilities';
import {withJsonConsole} from './json-output.js';
import {
  applyHydrogenCommandPolicy,
  isHydrogenProject,
} from './hydrogen-command-policy.js';

export default abstract class HydrogenCommand extends Command {
  static baseFlags = {...Command.baseFlags, ...globalFlags};

  async _run<T>() {
    return withJsonConsole(() => super._run<T>());
  }

  protected async init(): Promise<unknown> {
    await super.init();

    if (!this.id?.startsWith('hydrogen:') || this.id === 'hydrogen:init')
      return;

    const separatorIndex = this.argv.indexOf('--');
    const argv =
      separatorIndex < 0 ? this.argv : this.argv.slice(0, separatorIndex);
    if (
      argv.some((arg) => ['--help', '-h', '--json-schema'].includes(arg)) ||
      isTruthy(process.env.SHOPIFY_FLAG_JSON_SCHEMA)
    )
      return;

    // Validate before running the command, inside CLI Kit's error and event context.
    // Read only the project path here so command-specific parsing still owns its flags.
    const pathFlagIndex = argv.findIndex((arg) => /^--path($|=)/.test(arg));
    const pathFlagValue =
      pathFlagIndex < 0
        ? process.env.SHOPIFY_HYDROGEN_FLAG_PATH
        : argv[pathFlagIndex]?.startsWith('--path=')
          ? argv[pathFlagIndex]!.slice('--path='.length)
          : argv[pathFlagIndex + 1];
    const projectPath =
      pathFlagValue && !pathFlagValue.startsWith('--')
        ? resolvePath(cwd(), pathFlagValue)
        : cwd();

    if (!isHydrogenProject(projectPath)) {
      throw new AbortError(
        "Looks like you're trying to run a Hydrogen command outside of a Hydrogen project.",
        'Run `shopify hydrogen init` to create a new Hydrogen project or use the `--path` flag to specify an existing Hydrogen project.',
      );
    }

    await applyHydrogenCommandPolicy({id: this.id, projectPath});
  }
}
