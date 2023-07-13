import {createRequire} from 'module';
import {getRemixConfig, type RemixConfig} from './config.js';

export function isRemixV2() {
  try {
    const require = createRequire(import.meta.url);
    const version: string =
      require('@remix-run/server-runtime/package.json')?.version ?? '';

    return version.startsWith('2.');
  } catch {
    return false;
  }
}

export async function getV2Flags(
  root: string,
  remixConfigFuture?: RemixConfig['future'],
) {
  const isV2 = isRemixV2();
  const futureFlags = {
    ...(!isV2 &&
      (remixConfigFuture ?? (await getRemixConfig(root, true)).future)),
  };

  return {
    isV2Meta: isV2 || !!futureFlags.v2_meta,
    isV2ErrorBoundary: isV2 || !!futureFlags.v2_errorBoundary,
    isV2RouteConvention: isV2
      ? !isV1RouteConventionInstalled()
      : !!futureFlags.v2_routeConvention,
  };
}

export type RemixV2Flags = Partial<Awaited<ReturnType<typeof getV2Flags>>>;

export function convertRouteToV1(route: string) {
  return route.replace(/(^|\.)_index$/, '$1index').replace(/\.(?!\w+\])/g, '/');
}

export function convertTemplateToRemixVersion(
  template: string,
  {isV2Meta, isV2ErrorBoundary}: RemixV2Flags,
) {
  template = isV2Meta ? convertToMetaV2(template) : convertToMetaV1(template);

  template = isV2ErrorBoundary
    ? convertToErrorBoundaryV2(template)
    : convertToErrorBoundaryV1(template);

  return template;
}

function convertToMetaV2(template: string) {
  return template
    .replace(/type MetaFunction\s*,?/, '')
    .replace(/export (const|function) metaV1.+?\n};?\n/s, '')
    .replace(/import \{\s*\} from '@shopify\/remix-oxygen';/, '');
}

function convertToMetaV1(template: string) {
  return template
    .replace(/type V2_MetaFunction\s*,?/, '')
    .replace(/export (const|function) meta[^V].+?\n};?\n/s, '')
    .replace(/(const|function) metaV1/, '$1 meta')
    .replace(/import \{\s*\} from '@remix-run\/react';/, '');
}

function convertToErrorBoundaryV2(template: string) {
  return template
    .replace(/type ErrorBoundaryComponent\s*,?/s, '')
    .replace(/useCatch\s*,?/s, '')
    .replace(/export function CatchBoundary.+?\n}/s, '')
    .replace(/export (const|function) ErrorBoundaryV1.+?\n};?/s, '')
    .replace(/import \{\s*\} from '@shopify\/remix-oxygen';/, '')
    .replace(/import \{\s*\} from '@remix-run\/react';/, '');
}

function convertToErrorBoundaryV1(template: string) {
  return template
    .replace(/useRouteError\s*,?/s, '')
    .replace(/isRouteErrorResponse\s*,?/s, '')
    .replace(/export function ErrorBoundary[^V].+?\n}/s, '')
    .replace(/(const|function) ErrorBoundaryV1/, '$1 ErrorBoundary')
    .replace(/import \{\s*\} from '@remix-run\/react';/, '');
}

function isV1RouteConventionInstalled() {
  try {
    const require = createRequire(import.meta.url);
    require.resolve('@remix-run/v1-route-convention/package.json');
    return true;
  } catch {
    return false;
  }
}
