import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ReadableStream } from 'node:stream/web';
import { getGraphiQLUrl } from './graphiql-url.js';
import { mapSourcePosition } from 'source-map-support';

const H2O_BINDING_NAME = "H2O_LOG_EVENT";
let ResponseConstructor;
function setConstructors(constructors) {
  ResponseConstructor = constructors.Response;
}
const DEV_ROUTES = /* @__PURE__ */ new Set([
  "/graphiql",
  "/graphiql/customer-account.schema.json",
  "/subrequest-profiler",
  "/debug-network-server"
]);
const EVENT_MAP = {
  request: "Request",
  subrequest: "Sub request"
};
async function getRequestInfo(request) {
  const data = await request.json();
  return {
    ...data,
    requestId: data.requestId ?? "",
    eventType: data.eventType || "unknown",
    endTime: data.endTime || Date.now(),
    purpose: data.purpose === "prefetch" ? "(prefetch)" : "",
    cacheStatus: data.cacheStatus ?? "",
    graphql: data.graphql ? JSON.parse(data.graphql) : null
  };
}
const eventEmitter = new EventEmitter();
const eventHistory = [];
function createResponse(main = "ok", init) {
  return new ResponseConstructor(main, init);
}
function clearHistory(request) {
  eventHistory.length = 0;
  return createResponse();
}
function createLogRequestEvent(options) {
  return async function logRequestEvent(request) {
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
    let graphiqlLink = "";
    let descriptionUrl = request.url;
    let displayName = displayNameData;
    if (eventType === "subrequest") {
      displayName = displayName || graphql?.query.match(/(query|mutation)\s+(\w+)/)?.[0]?.replace(/\s+/, " ");
      descriptionUrl = displayUrl || request.url;
      if (graphql) {
        graphiqlLink = getGraphiQLUrl({ graphql });
      }
    }
    let stackLine = null;
    let stackLink = null;
    if (stackInfo?.file) {
      if (options?.transformLocation) {
        stackInfo.file = options.transformLocation(stackInfo.file);
      }
      const { source, line, column } = mapSourcePosition({
        source: stackInfo.file,
        line: stackInfo.line ?? 0,
        column: stackInfo.column ?? 0
      });
      stackLine = `${source}:${line}:${column + 1}`;
      stackLink = `vscode://${path.join("file", stackLine)}`;
      stackLine = stackLine.split(path.sep + "app" + path.sep)[1] ?? stackLine;
      if (stackInfo.func) {
        stackLine = `${stackInfo.func.replace(/\d+$/, "")} (${stackLine})`;
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
        stackLink
      })
    };
    eventHistory.push(event);
    if (eventHistory.length > 100)
      eventHistory.shift();
    eventEmitter.emit("request", event);
    return createResponse();
  };
}
function streamRequestEvents(request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const enqueueEvent = ({ event = "message", data }) => {
        controller.enqueue(encoder.encode(`event: ${event}
`));
        controller.enqueue(encoder.encode(`data: ${data}

`));
      };
      eventHistory.forEach(enqueueEvent);
      eventEmitter.addListener("request", enqueueEvent);
      let closed = false;
      function close() {
        if (closed)
          return;
        closed = true;
        request.signal.removeEventListener("abort", close);
        eventEmitter.removeListener("request", enqueueEvent);
        controller.close();
      }
      request.signal.addEventListener("abort", close);
      if (request.signal.aborted)
        return close();
    }
  });
  return createResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive"
    }
  });
}
function handleDebugNetworkRequest(request) {
  return request.method === "DELETE" ? clearHistory() : streamRequestEvents(request);
}

export { DEV_ROUTES, H2O_BINDING_NAME, createLogRequestEvent, handleDebugNetworkRequest, setConstructors };
