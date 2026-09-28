import {outputWarn} from '@shopify/cli-kit/node/output';
import {writeJsonResult, isJsonOutput} from '../json-output.js';
import {renderInfo} from '../ui.js';
import {renderProjectReady} from './common.js';
import {initJsonOutputSchema, type InitResult} from './types.js';
import type {setupLocalStarterTemplate} from './local.js';

type TemplateResult = Awaited<ReturnType<typeof setupLocalStarterTemplate>>;

export function toInitResult(result: TemplateResult): InitResult {
  if (!result) return null;
  const {
    location,
    name,
    directory,
    storefrontTitle,
    language,
    packageManager,
    depsInstalled,
    cssStrategy,
    i18n,
    routes,
  } = result;
  const failures: NonNullable<InitResult>['failures'] = [];
  if (result.depsError) failures.push('dependencies');
  if (result.i18nError) failures.push('markets');
  if (result.routesError) failures.push('routes');
  return {
    location,
    name,
    directory,
    storefrontTitle,
    language,
    packageManager,
    depsInstalled,
    cssStrategy,
    i18n,
    routes,
    failures,
  };
}

export async function presentTemplateResult(
  result: TemplateResult,
  template?: string,
) {
  if (isJsonOutput()) {
    for (const error of [
      result?.depsError,
      result?.i18nError,
      result?.routesError,
    ]) {
      if (error) outputWarn(error.message);
    }
  }
  if (writeJsonResult(initJsonOutputSchema, toInitResult(result)) || !result)
    return;
  await renderProjectReady(result, result);
  if (template)
    renderInfo({
      headline: `Your project will display inventory from ${template.endsWith('shopify/hydrogen-demo-store') ? 'the Hydrogen Demo Store' : 'Mock.shop'}.`,
      body:
        'To connect this project to your Shopify store’s inventory, update `' +
        result.name +
        '/.env` with your store ID and Storefront API key.',
    });
}
