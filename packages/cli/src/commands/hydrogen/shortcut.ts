import Command from '@shopify/cli-kit/node/base-command';
import {renderFatalError, renderSuccess} from '@shopify/cli-kit/node/ui';
import {ALIAS_NAME, createPlatformShortcut} from '../../lib/shell.js';

export default class Shortcut extends Command {
  static descriptionWithMarkdown = `Creates a global h2 shortcut for Shopify CLI using shell aliases.

  The following shells are supported:

  - Bash (using \`~/.bashrc\`)
  - ZSH (using \`~/.zshrc\`)
  - Fish (using \`~/.config/fish/functions\`)
  - PowerShell (added to \`$PROFILE\`)

  After the alias is created, you can call Shopify CLI from anywhere in your project using \`h2 <command>\`.`;

  static description = `Creates a global \`${ALIAS_NAME}\` shortcut for the Hydrogen CLI`;

  async run(): Promise<void> {
    await runCreateShortcut();
  }
}

export async function runCreateShortcut() {
  const shortcuts = await createPlatformShortcut();

  if (shortcuts.length > 0) {
    renderSuccess({
      headline: `Shortcut ready for the following shells: ${shortcuts.join(
        ', ',
      )}.\nRestart your terminal session and run \`${ALIAS_NAME}\` from your local project.`,
    });
  } else {
    renderFatalError({
      name: 'error',
      type: 0,
      message: 'No supported shell found.',
      skipOclifErrorHandling: true,
      tryMessage: 'Please create a shortcut manually.',
    });
  }
}
