import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import {
  buildRequestData
} from "../lib/useDebugNetworkServer.jsx";
function RequestTable({
  serverEvents,
  activeEventId,
  setActiveEventId
}) {
  let totalMainRequests = 0;
  let totalSubRequest = 0;
  const items = buildRequestData({
    serverEvents,
    buildMainRequest: (mainRequest, timing) => {
      totalMainRequests++;
      return {
        id: mainRequest.id,
        requestId: mainRequest.requestId,
        url: mainRequest.url,
        status: mainRequest.responseInit?.status ?? 0,
        cacheStatus: mainRequest.cacheStatus,
        duration: timing.responseEnd - timing.requestStart
      };
    },
    buildSubRequest: (subRequest, timing) => {
      if (serverEvents.hidePutRequests) {
        subRequest.cacheStatus !== "PUT" && totalSubRequest++;
      } else {
        totalSubRequest++;
      }
      return {
        id: subRequest.id,
        requestId: subRequest.requestId,
        url: subRequest.displayName ?? subRequest.url,
        status: subRequest.responseInit?.status ?? 0,
        cacheStatus: subRequest.cacheStatus,
        duration: timing.requestEnd - timing.requestStart
      };
    }
  });
  useEffect(() => {
    if (!serverEvents.preserveLog && activeEventId) {
      const selectedItem = items.find((item) => item.id === activeEventId);
      if (!selectedItem) {
        setActiveEventId(void 0);
      }
    }
  }, [serverEvents.preserveLog]);
  return /* @__PURE__ */ jsx("div", { id: "request-table", children: /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { id: "request-table__header", className: "grid-row", children: [
      /* @__PURE__ */ jsx("div", { className: "grid-cell", children: "Name" }),
      /* @__PURE__ */ jsx("div", { className: "grid-cell", children: "Cache" }),
      /* @__PURE__ */ jsx("div", { className: "grid-cell", children: "Time" })
    ] }),
    /* @__PURE__ */ jsx("div", { id: "request-table__content", children: items.map((row) => /* @__PURE__ */ jsxs(
      "div",
      {
        id: `request-table__row-${row.id}`,
        tabIndex: 0,
        className: `grid-row${activeEventId === row.id ? " active" : ""}${row.status >= 400 ? " error" : ""}`,
        onClick: () => setActiveEventId(row.id),
        onKeyUp: (event) => {
          if (event.code === "Space") setActiveEventId(row.id);
        },
        children: [
          /* @__PURE__ */ jsx("div", { className: "grid-cell", children: row.url }),
          /* @__PURE__ */ jsx("div", { className: "grid-cell", children: row.cacheStatus }),
          /* @__PURE__ */ jsxs("div", { className: "grid-cell", children: [
            row.duration,
            "ms"
          ] })
        ]
      },
      row.id
    )) }),
    /* @__PURE__ */ jsxs("div", { id: "request-table__footer", children: [
      totalMainRequests,
      " request",
      totalMainRequests > 1 ? "s" : "",
      " |",
      " ",
      totalSubRequest,
      " sub request",
      totalSubRequest > 1 ? "s" : ""
    ] })
  ] }) });
}
export {
  RequestTable
};
