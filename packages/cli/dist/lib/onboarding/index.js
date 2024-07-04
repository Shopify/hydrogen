import { AbortController } from '@shopify/cli-kit/node/abort';
import { setupLocalStarterTemplate } from './local.js';
import { setupRemoteTemplate } from './remote.js';

async function setupTemplate(options) {
  const controller = new AbortController();
  try {
    const template = options.template;
    return template ? await setupRemoteTemplate({ ...options, template }, controller) : await setupLocalStarterTemplate(options, controller);
  } catch (error) {
    controller.abort();
    throw error;
  }
}

export { setupTemplate };
