import {outputWarn} from '@shopify/cli-kit/node/output';
import {writeJsonResult, isJsonOutput} from '../json-output.js';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {renderProjectReady} from './common.js';
import {initJsonOutputSchema, type InitResult} from './types.js';
import type {setupLocalStarterTemplate} from './local.js';

type TemplateResult = Awaited<ReturnType<typeof setupLocalStarterTemplate>>;

export function toInitResult(result: TemplateResult): InitResult {
  if (!result) return {status: 'cancelled', project: null, failures: []};
  const {
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
    status: failures.length ? 'partial' : 'success',
    project: {
      name,
      directory,
      storefrontName: storefrontTitle || null,
      language: language ?? null,
      packageManager,
      dependenciesInstalled: depsInstalled,
      cssStrategy: cssStrategy ?? null,
      i18n: i18n ?? null,
      routes: routes ?? null,
    },
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
  const projection = toInitResult(result);
  if (projection.status === 'partial') process.exitCode = 1;
  if (writeJsonResult(initJsonOutputSchema, projection) || !result) return;
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
