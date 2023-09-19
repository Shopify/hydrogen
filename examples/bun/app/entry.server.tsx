/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */
import type {AppLoadContext, EntryContext} from '@remix-run/node';
import {RemixServer} from '@remix-run/react';
import isbot from 'isbot';
import {renderToReadableStream, renderToString} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

const ABORT_DELAY = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  const result = isbot(request.headers.get('user-agent'))
    ? await handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      )
    : await handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      );

  return result;
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise(async (resolve, reject) => {
    const {header, NonceProvider} = createContentSecurityPolicy();
    let error;

    const stream = renderToString(
      <NonceProvider>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </NonceProvider>,
    );

    responseHeaders.set('Content-Type', 'text/html');
    responseHeaders.set('Content-Security-Policy', header);

    resolve(
      new Response(stream, {
        status: error ? 500 : responseStatusCode,
        headers: responseHeaders,
      }),
    );
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise(async (resolve, reject) => {
    const {nonce, header, NonceProvider} = createContentSecurityPolicy();
    let error;

    const stream = await renderToReadableStream(
      <NonceProvider>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </NonceProvider>,
      {
        nonce,
        onError(e: unknown) {
          error = e;
        },
      },
    );

    responseHeaders.set('Content-Type', 'text/html');
    responseHeaders.set('Content-Security-Policy', header);

    resolve(
      new Response(stream, {
        status: error ? 500 : responseStatusCode,
        headers: responseHeaders,
      }),
    );
  });
}
