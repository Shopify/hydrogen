import {AbortController} from '@shopify/cli-kit/node/abort';
import {setupLocalStarterTemplate} from './local.js';
import {setupRemoteTemplate} from './remote.js';
import type {InitOptions} from './common.js';

export type {InitOptions};

export async function setupTemplate(options: InitOptions) {
  const controller = new AbortController();

  try {
    const template = options.template;

    return template
      ? await setupRemoteTemplate({...options, template}, controller)
      : await setupLocalStarterTemplate(options, controller);
  } catch (error) {
    controller.abort();
    throw error;
  }
}
