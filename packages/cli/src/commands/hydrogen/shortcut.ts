import {AbortError} from '@shopify/cli-kit/node/error';
import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {shortcutJsonOutputSchema} from '../../lib/maintenance/types.js';
import Command from '../../lib/hydrogen-command.js';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {ALIAS_NAME, createPlatformShortcut} from '../../lib/shell.js';

export default class Shortcut extends Command {
  static get jsonOutputSchema(): typeof shortcutJsonOutputSchema {
    return shortcutJsonOutputSchema;
  }

  static descriptionWithMarkdown = `Creates a global h2 shortcut for Shopify CLI using shell aliases.

  The following shells are supported:

  - Bash (using \`~/.bashrc\`)
  - ZSH (using \`~/.zshrc\`)
  - Fish (using \`~/.config/fish/functions\`)
  - PowerShell (added to \`$PROFILE\`)

  After the alias is created, you can call Shopify CLI from anywhere in your project using \`h2 <command>\`.`;

  static description = this.descriptionForHelp();

  static flags = {...jsonFlag};

  async run(): Promise<void> {
    const {flags} = await this.parse(Shortcut);
    await runCreateShortcut(flags.json);
  }
}

export async function runCreateShortcut(json?: boolean) {
  const shortcuts = await createPlatformShortcut();

  if (shortcuts.length > 0) {
    if (
      writeJsonResult(
        shortcutJsonOutputSchema,
        {
          alias: ALIAS_NAME,
          shells: shortcuts.map((shell) =>
            shell === 'CMD'
              ? ('cmd' as const)
              : shell === 'PowerShell'
                ? ('powershell' as const)
                : shell === 'PowerShell 7+'
                  ? ('powershell-7' as const)
                  : shell,
          ),
        },
        json,
      )
    )
      return;
    renderSuccess({
      headline: `Shortcut ready for the following shells: ${shortcuts.join(
        ', ',
      )}.\nRestart your terminal session and run \`${ALIAS_NAME}\` from your local project.`,
    });
  } else {
    throw new AbortError(
      'No supported shell found.',
      'Please create a shortcut manually.',
    );
  }
}
