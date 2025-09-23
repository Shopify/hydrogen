import {AbortController} from '@shopify/cli-kit/node/abort';
import {setupLocalStarterTemplate} from './local.js';
import {setupRemoteTemplate} from './remote.js';
import {setupVersionedTemplate} from './versioned.js';
import type {InitOptions} from './common.js';

export type {InitOptions};

export async function setupTemplate(options: InitOptions) {
  const controller = new AbortController();

  try {
    if (options.template) {
      return await setupRemoteTemplate(
        {...options, template: options.template},
        controller,
      );
    } else if (options.version) {
      return await setupVersionedTemplate(options, controller);
    } else {
      return await setupLocalStarterTemplate(options, controller);
    }
  } catch (error) {
    controller.abort();
    throw error;
  }
}
