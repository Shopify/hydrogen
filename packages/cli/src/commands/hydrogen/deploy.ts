import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {outputWarn} from '@shopify/cli-kit/node/output';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {Logger, LogLevel} from '@shopify/cli-kit/node/output';

import {commonFlags} from '../../lib/flags.js';

export const deploymentLogger: Logger = (
  message: string,
  level: LogLevel = 'info',
) => {
  if (level === 'error' || level === 'warn') {
    outputWarn(message);
  }
};

export default class Deploy extends Command {
  static flags: any = {
    'env-branch': Flags.string({
      char: 'e',
      description: 'Environment branch (tag) for environment to deploy to',
      required: false,
    }),
    path: commonFlags.path,
    shop: commonFlags.shop,
    'public-deployment': Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_PUBLIC_DEPLOYMENT',
      description: 'Marks a preview deployment as publicly accessible.',
      required: false,
      default: false,
    }),
    token: Flags.string({
      char: 't',
      description: 'Oxygen deployment token',
      env: 'SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN',
      required: false,
    }),
    'metadata-url': Flags.string({
      description:
        'URL that links to the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_URL',
    }),
    'metadata-user': Flags.string({
      description:
        'User that initiated the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_USER',
    }),
    'metadata-version': Flags.string({
      description:
        'A version identifier for the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_METADATA_VERSION',
    }),
  };

  static hidden = true;

  async run() {
    renderWarning({
      body: 'Deploy command unavailable.',
      nextSteps: [
        'To use the deploy command, upgrade cli-hydrogen to v7.0.0+.',
      ],
    });
  }
}
