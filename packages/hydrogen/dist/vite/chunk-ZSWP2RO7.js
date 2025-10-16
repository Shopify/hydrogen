// src/vite/request-events.ts
import path from "path";
import { EventEmitter } from "events";
import { mapSourcePosition } from "source-map-support";
var IGNORED_ROUTES = /* @__PURE__ */ new Set([
  "/graphiql",
  "/subrequest-profiler",
  "/debug-network-server",
  "/favicon.ico"
]);
var EVENT_MAP = {
  request: "Request",
  subrequest: "Sub request"
};
function getEventInfo(data) {
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
var eventEmitter = new EventEmitter();
var eventHistory = [];
function emitRequestEvent(payload, root) {
  if (!payload || !payload.url || !payload.requestId) {
    return;
  }
  if (payload.eventType === "request" && !payload.__fromVite) {
    return;
  }
  delete payload.__fromVite;
  const { pathname } = new URL(payload.url, "http://localhost");
  if (IGNORED_ROUTES.has(pathname)) return;
  const {
    url: descriptionUrl,
    displayName: displayNameData,
    eventType,
    purpose,
    graphql,
    stackInfo,
    ...data
  } = getEventInfo(payload);
  let graphiqlLink = "";
  let displayName = displayNameData;
  if (eventType === "subrequest") {
    displayName = displayName || graphql?.query.match(/(query|mutation)\s+(\w+)/)?.[0]?.replace(/\s+/, " ");
    if (graphql) {
      graphiqlLink = getGraphiQLUrl(graphql);
    }
  }
  let stackLine = null;
  let stackLink = null;
  if (stackInfo?.file) {
    stackInfo.file = path.join(root, stackInfo.file);
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
  if (eventHistory.length > 100) eventHistory.shift();
  eventEmitter.emit("request", event);
}
function clearHistory(req, res) {
  eventHistory.length = 0;
  res.writeHead(200);
  res.end();
}
function streamRequestEvents(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive"
  });
  const enqueueEvent = ({ event = "message", data }) => {
    res.write(`event: ${event}
`);
    res.write(`data: ${data}

`);
  };
  eventHistory.forEach(enqueueEvent);
  eventEmitter.addListener("request", enqueueEvent);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    eventEmitter.removeListener("request", enqueueEvent);
  }
  req.on("close", close);
  res.on("close", close);
}
function getGraphiQLUrl({ query, variables, schema }) {
  let url = `/graphiql?query=${encodeURIComponent(query)}`;
  if (variables) {
    if (typeof variables !== "string") variables = JSON.stringify(variables);
    url += `&variables=${encodeURIComponent(variables)}`;
  }
  if (schema) {
    url += `&schema=${schema}`;
  }
  return url;
}

export {
  emitRequestEvent,
  clearHistory,
  streamRequestEvents
};
