/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import {PassThrough} from 'node:stream';

import type {
  AppLoadContext,
  DataFunctionArgs,
  EntryContext,
} from '@remix-run/node';
import {Response} from '@remix-run/node';
import {RemixServer} from '@remix-run/react';
import isbot from 'isbot';
import {renderToPipeableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  return isbot(request.headers.get('user-agent'))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    const {nonce, header, NonceProvider} = createContentSecurityPolicy();

    const {pipe, abort} = renderToPipeableStream(
      <NonceProvider>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </NonceProvider>,
      {
        nonce,
        onAllReady() {
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');
          responseHeaders.set('Content-Security-Policy', header);

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          console.error(
            (error as Error)?.stack ? (error as Error).stack : error,
          );
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy();

  return new Promise((resolve, reject) => {
    const {pipe, abort} = renderToPipeableStream(
      <NonceProvider>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </NonceProvider>,
      {
        nonce,
        onShellReady() {
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');
          responseHeaders.set('Content-Security-Policy', header);

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          console.error(
            (error as Error)?.stack ? (error as Error).stack : error,
          );
          responseStatusCode = 500;
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

export function handleError(error: any, {request}: DataFunctionArgs) {
  // Avoids logging when the request is aborted, since Remix's cancellation
  // and race-condition handling can cause a lot of requests to be aborted.
  if (!request.signal.aborted) {
    // eslint-disable-next-line no-console
    console.error((error as Error)?.stack ? (error as Error).stack : error);
  }
}
