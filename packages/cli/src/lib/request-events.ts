import path from 'node:path';
import {EventEmitter} from 'node:events';
import {ReadableStream} from 'node:stream/web';
import {getGraphiQLUrl} from './graphiql-url.js';
import type {Request, Response} from '@shopify/mini-oxygen';
import type {
  Request as WorkerdRequest,
  Response as WorkerdResponse,
  ResponseInit,
} from 'miniflare';
import {mapSourcePosition} from 'source-map-support';

export const H2O_BINDING_NAME = 'H2O_LOG_EVENT';

// These 2 types are based on Undici but have slight differences
type RequestKind = Request | WorkerdRequest;
type InferredResponse<R extends RequestKind> = R extends WorkerdRequest
  ? WorkerdResponse
  : Response;

let ResponseConstructor: typeof Response | typeof WorkerdResponse;
export function setConstructors(constructors: {
  Response: typeof ResponseConstructor;
}) {
  ResponseConstructor = constructors.Response;
}

export const DEV_ROUTES = new Set(['/graphiql', '/subrequest-profiler']);

type RequestEvent = {
  event: string;
  data: string;
};

const EVENT_MAP: Record<string, string> = {
  request: 'Request',
  subrequest: 'Sub request',
};

// Make sure to match this type with the one in packages/remix-oxygen/src/event-logger.ts
export type H2OEvent = {
  url: string;
  eventType: 'request' | 'subrequest';
  requestId?: string | null;
  purpose?: string | null;
  startTime: number;
  endTime: number;
  cacheStatus?: 'MISS' | 'HIT' | 'STALE' | 'PUT';
  waitUntil?: ExecutionContext['waitUntil'];
  graphql?: string | null;
  stackInfo?: {
    file?: string;
    func?: string;
    line?: number;
    column?: number;
  };
  responsePayload?: any;
  responseInit?: ResponseInit;
  cache?: {
    status?: string;
    strategy?: string;
    key?: string | readonly unknown[];
  };
  displayName?: string;
};

async function getRequestInfo(request: RequestKind) {
  const data = (await request.json()) as H2OEvent;

  return {
    ...data,
    requestId: data.requestId ?? '',
    eventType: data.eventType || 'unknown',
    endTime: data.endTime || Date.now(),
    purpose: data.purpose === 'prefetch' ? '(prefetch)' : '',
    cacheStatus: data.cacheStatus ?? '',
    graphql: data.graphql
      ? (JSON.parse(data.graphql) as {query: string; variables: object})
      : null,
  };
}

const eventEmitter = new EventEmitter();
const eventHistory: RequestEvent[] = [];

function createResponse<R extends RequestKind>(
  main: string | ReadableStream = 'ok',
  init?: Pick<ResponseInit, 'headers'>,
) {
  return new ResponseConstructor(main, init) as InferredResponse<R>;
}

async function clearHistory<R extends RequestKind>(
  request: R,
): Promise<InferredResponse<R>> {
  eventHistory.length = 0;
  return createResponse<R>();
}

export function createLogRequestEvent(options?: {absoluteBundlePath?: string}) {
  return async function logRequestEvent<R extends RequestKind>(
    request: R,
  ): Promise<InferredResponse<R>> {
    const url = new URL(request.url);
    if (DEV_ROUTES.has(url.pathname)) {
      return createResponse<R>();
    }

    const {
      url: displayUrl,
      displayName: displayNameData,
      eventType,
      purpose,
      graphql,
      stackInfo,
      ...data
    } = await getRequestInfo(request);

    let graphiqlLink = '';
    let descriptionUrl = request.url;
    let displayName = displayNameData;

    if (eventType === 'subrequest') {
      displayName =
        displayName ||
        graphql?.query
          .match(/(query|mutation)\s+(\w+)/)?.[0]
          ?.replace(/\s+/, ' ');
      descriptionUrl = displayUrl || request.url;

      if (graphql) {
        graphiqlLink = getGraphiQLUrl({graphql});
      }
    }

    let stackLine: string | null = null;
    let stackLink: string | null = null;

    if (stackInfo?.file) {
      if (!path.isAbsolute(stackInfo.file) && options?.absoluteBundlePath) {
        stackInfo.file = options.absoluteBundlePath;
      }

      const {source, line, column} = mapSourcePosition({
        source: stackInfo.file,
        line: stackInfo.line ?? 0,
        column: stackInfo.column ?? 0,
      });

      stackLine = `${source}:${line}:${column + 1}`;
      stackLink = `vscode://${path.join('file', stackLine)}`;

      stackLine = stackLine.split(path.sep + 'app' + path.sep)[1] ?? stackLine;
      if (stackInfo.func) {
        stackLine = `${stackInfo.func.replace(/\d+$/, '')} (${stackLine})`;
      }
    }

    const event = {
      event: EVENT_MAP[eventType] || eventType,
      data: JSON.stringify({
        ...data,
        displayName,
        url: `${purpose} ${descriptionUrl}`.trim(),
        graphiqlLink,
        stackLine,
        stackLink,
      }),
    };

    eventHistory.push(event);
    if (eventHistory.length > 100) eventHistory.shift();

    eventEmitter.emit('request', event);

    return createResponse<R>();
  };
}

function streamRequestEvents<R extends RequestKind>(
  request: R,
): InferredResponse<R> {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const enqueueEvent = ({event = 'message', data}: RequestEvent) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      eventHistory.forEach(enqueueEvent);
      eventEmitter.addListener('request', enqueueEvent);

      let closed = false;

      function close() {
        if (closed) return;
        closed = true;
        request.signal.removeEventListener('abort', close);
        eventEmitter.removeListener('request', enqueueEvent);
        controller.close();
      }

      request.signal.addEventListener('abort', close);

      if (request.signal.aborted) return close();
    },
  });

  return createResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}

export function handleDebugNetworkRequest<R extends RequestKind>(request: R) {
  return request.method === 'DELETE'
    ? clearHistory(request)
    : streamRequestEvents(request);
}
