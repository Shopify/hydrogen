import Command from '@shopify/cli-kit/node/base-command';
import { renderSuccess } from '@shopify/cli-kit/node/ui';
import { outputWarn } from '@shopify/cli-kit/node/output';
import { commonFlags } from '../../lib/flags.js';
import { getConfig, unsetStorefront } from '../../lib/shopify-config.js';

class Unlink extends Command {
  static descriptionWithMarkdown = "Unlinks your local development environment from a remote Hydrogen storefront.";
  static description = "Unlink a local project from a Hydrogen storefront.";
  static flags = {
    ...commonFlags.path
  };
  async run() {
    const { flags } = await this.parse(Unlink);
    await unlinkStorefront(flags);
  }
}
async function unlinkStorefront({ path }) {
  const actualPath = path ?? process.cwd();
  const { storefront: configStorefront } = await getConfig(actualPath);
  if (!configStorefront) {
    outputWarn("This project isn't linked to a Hydrogen storefront.");
    return;
  }
  const storefrontTitle = configStorefront.title;
  await unsetStorefront(actualPath);
  renderSuccess({
    body: ["You are no longer linked to", { bold: storefrontTitle }]
  });
}

export { Unlink as default, unlinkStorefront };
