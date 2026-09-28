import * as ui from '@shopify/cli-kit/node/ui';
import {
  commandEventOutputMode,
  emitCommandEvent,
} from '@shopify/cli-kit/node/command-events';
import {itemToString, unstyled} from '@shopify/cli-kit/node/output';

export * from '@shopify/cli-kit/node/ui';

function renderAlert(
  kind: 'Info' | 'Warning' | 'Success' | 'Error',
  options: ui.RenderAlertOptions,
) {
  if (commandEventOutputMode() !== 'json') return ui[`render${kind}`](options);
  const message = [
    options.headline,
    options.body,
    ...(options.nextSteps ?? []),
    ...(options.reference ?? []),
  ]
    .filter((item) => item !== undefined)
    .map((item) => unstyled(itemToString(item!)))
    .join('\n');
  emitCommandEvent({
    type: 'diagnostic',
    level: kind === 'Warning' ? 'warning' : kind === 'Error' ? 'error' : 'info',
    message,
  });
}

export const renderInfo: typeof ui.renderInfo = (options) =>
  renderAlert('Info', options);
export const renderWarning: typeof ui.renderWarning = (options) =>
  renderAlert('Warning', options);
export const renderSuccess: typeof ui.renderSuccess = (options) =>
  renderAlert('Success', options);
export const renderError: typeof ui.renderError = (options) =>
  renderAlert('Error', options);
