import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {unlinkJsonOutputSchema} from '../../lib/storefronts/types.js';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess} from '../../lib/ui.js';
import {outputWarn} from '@shopify/cli-kit/node/output';

import {commonFlags} from '../../lib/flags.js';
import {getConfig, unsetStorefront} from '../../lib/shopify-config.js';

export default class Unlink extends Command {
  static get jsonOutputSchema(): typeof unlinkJsonOutputSchema {
    return unlinkJsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Unlinks your local development environment from a remote Hydrogen storefront.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Unlink);
    await unlinkStorefront(flags, flags.json);
  }
}

export interface LinkFlags {
  path?: string;
}

export async function unlinkStorefront(options: LinkFlags, json?: boolean) {
  const result = await removeStorefrontLink(options);
  if (!writeJsonResult(unlinkJsonOutputSchema, result, json)) {
    if (result.storefront)
      renderSuccess({
        body: ['You are no longer linked to', {bold: result.storefront.title}],
      });
    else outputWarn("This project isn't linked to a Hydrogen storefront.");
  }
  return result;
}

export async function removeStorefrontLink({
  path,
}: LinkFlags): Promise<import('../../lib/storefronts/types.js').UnlinkResult> {
  const actualPath = path ?? process.cwd();
  const {storefront: configStorefront} = await getConfig(actualPath);

  if (!configStorefront) return {unlinked: false, storefront: null};
  await unsetStorefront(actualPath);
  return {
    unlinked: true,
    storefront: {id: configStorefront.id, title: configStorefront.title},
  };
}
