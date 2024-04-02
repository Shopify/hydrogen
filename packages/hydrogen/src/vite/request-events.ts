import path from 'node:path';
import {EventEmitter} from 'node:events';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {mapSourcePosition} from 'source-map-support';

export const H2O_BINDING_NAME = 'H2O_LOG_EVENT';
export const SUBREQUEST_PROFILER_ENDPOINT = '/debug-network-server';

// These 2 types are based on Undici but have slight differences
type RequestKind = {
  url: string;
  headers: Request['headers'];
  json: () => Promise<unknown>;
  method: string;
  signal: AbortSignal;
};

let ResponseConstructor = Response;

export function setConstructors(constructors: {
  Response: typeof ResponseConstructor;
}) {
  ResponseConstructor = constructors.Response;
}

export const DEV_ROUTES = new Set([
  '/graphiql',
  '/subrequest-profiler',
  '/__vite_warmup',
]);

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
      ? (JSON.parse(data.graphql) as {
          query: string;
          variables: object;
          schema?: string;
        })
      : null,
  };
}

const eventEmitter = new EventEmitter();
const eventHistory: RequestEvent[] = [];

function createResponse(main = 'ok', init?: Pick<ResponseInit, 'headers'>) {
  // @ts-ignore
  return new ResponseConstructor(main, init);
}

export function createLogRequestEvent(options?: {
  transformLocation?: (partialPath: string) => string;
}) {
  return async function logRequestEvent(
    request: RequestKind,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (DEV_ROUTES.has(url.pathname)) {
      return createResponse();
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
        graphiqlLink = getGraphiQLUrl(graphql);
      }
    }

    let stackLine: string | null = null;
    let stackLink: string | null = null;

    if (stackInfo?.file) {
      if (options?.transformLocation) {
        stackInfo.file = options.transformLocation(stackInfo.file);
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

    return createResponse();
  };
}

export function clearHistory(): Response {
  eventHistory.length = 0;
  return createResponse();
}

export function streamRequestEvents(
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
  });

  const enqueueEvent = ({event = 'message', data}: RequestEvent) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${data}\n\n`);
  };

  eventHistory.forEach(enqueueEvent);
  eventEmitter.addListener('request', enqueueEvent);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    eventEmitter.removeListener('request', enqueueEvent);
  }

  req.on('close', close);
  res.on('close', close);
}

type GraphiQLOptions = {
  query: string;
  variables: string | Record<string, any>;
  schema?: string;
};

function getGraphiQLUrl({query, variables, schema}: GraphiQLOptions) {
  let url = `/graphiql?query=${encodeURIComponent(query)}`;

  if (variables) {
    if (typeof variables !== 'string') variables = JSON.stringify(variables);
    url += `&variables=${encodeURIComponent(variables)}`;
  }

  if (schema) {
    url += `&schema=${schema}`;
  }

  return url;
}
