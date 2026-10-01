import {AbortController} from '@shopify/cli-kit/node/abort';
import {setupLocalStarterTemplate} from './local.js';
import {setupRemoteTemplate} from './remote.js';
import type {InitOptions} from './common.js';

export type {InitOptions};

export async function setupTemplate(options: InitOptions) {
  const controller = new AbortController();

  try {
    const {template, ...starterOptions} = options;

    // `skeleton` is the starter bundled with the CLI, the same one used without a template
    return template && template !== 'skeleton'
      ? await setupRemoteTemplate({...options, template}, controller)
      : await setupLocalStarterTemplate(starterOptions, controller);
  } catch (error) {
    controller.abort();
    throw error;
  }
}
