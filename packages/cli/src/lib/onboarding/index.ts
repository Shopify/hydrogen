import {AbortController} from '@shopify/cli-kit/node/abort';
import {setupLocalStarterTemplate} from './local.js';
import {setupRemoteTemplate} from './remote.js';
import {setupVersionedTemplate} from './versioned.js';
import type {InitOptions} from './common.js';

export type {InitOptions};

export async function setupTemplate(options: InitOptions) {
  const controller = new AbortController();

  try {
    // If a specific Hydrogen version is requested, use versioned setup
    if (options.version && !options.template) {
      return await setupVersionedTemplate(options, controller);
    }

    const template = options.template;

    return template
      ? await setupRemoteTemplate({...options, template}, controller)
      : await setupLocalStarterTemplate(options, controller);
  } catch (error) {
    controller.abort();
    throw error;
  }
}
