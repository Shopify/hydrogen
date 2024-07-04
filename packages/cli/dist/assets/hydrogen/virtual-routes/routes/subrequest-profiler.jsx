import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Script } from "@shopify/hydrogen";
import { RequestWaterfall } from "../components/RequestWaterfall.jsx";
import { RequestTable } from "../components/RequestTable.jsx";
import { Link } from "@remix-run/react";
import favicon from "../assets/favicon.svg";
import faviconDark from "../assets/favicon-dark.svg";
import { useDebugNetworkServer } from "../lib/useDebugNetworkServer.jsx";
import { RequestDetails } from "../components/RequestDetails.jsx";
import { IconClose } from "../components/IconClose.jsx";
import { IconDiscard } from "../components/IconDiscard.jsx";
import styles from "../assets/debug-network.css?url";
const links = () => {
  return [
    {
      rel: "icon",
      type: "image/svg+xml",
      href: favicon
    },
    {
      rel: "stylesheet",
      href: styles
    }
  ];
};
const WATERFALL_CONFIG = {
  colors: {
    server: "#2ED389",
    streaming: "#33CCFF",
    subRequest: "#FFCC00"
  }
};
function DebugNetwork() {
  const {
    serverEvents,
    clear,
    timestamp,
    setHidePutRequests,
    setPreserveLog,
    setHideNotification
  } = useDebugNetworkServer();
  const isEmptyState = serverEvents.mainRequests.length === 0;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      id: "server-network-timing",
      className: `${serverEvents.hideNotification ? "" : "withNotification"}`,
      children: [
        /* @__PURE__ */ jsx(
          Script,
          {
            src: "https://unpkg.com/flame-chart-js@2.3.2/dist/index.min.js",
            suppressHydrationWarning: true
          }
        ),
        /* @__PURE__ */ jsx(
          NotificationBanner,
          {
            hideNotification: serverEvents.hideNotification,
            setHideNotification
          }
        ),
        /* @__PURE__ */ jsx(DebugHeader, {}),
        /* @__PURE__ */ jsxs("div", { id: "main", className: `${isEmptyState ? " empty" : ""}`, children: [
          /* @__PURE__ */ jsx(
            OptionsAndLegend,
            {
              serverEvents,
              clearCallback: clear,
              setHidePutRequests,
              setPreserveLog
            }
          ),
          /* @__PURE__ */ jsx("div", { id: "request-waterfall", className: "pad", children: isEmptyState ? /* @__PURE__ */ jsx(EmptyState, {}) : /* @__PURE__ */ jsx("div", { className: "request-waterfall-chart", children: /* @__PURE__ */ jsx(
            RequestWaterfall,
            {
              serverEvents,
              config: WATERFALL_CONFIG
            },
            timestamp
          ) }) }),
          /* @__PURE__ */ jsx(RequestInfo, { serverEvents })
        ] })
      ]
    }
  );
}
function NotificationBanner({
  hideNotification,
  setHideNotification
}) {
  if (hideNotification) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: "notification", children: [
    /* @__PURE__ */ jsx("div", { id: "close-notification", children: /* @__PURE__ */ jsx(
      "button",
      {
        className: "plain icon",
        onClick: () => {
          setHideNotification(true);
        },
        children: /* @__PURE__ */ jsx(IconClose, {})
      }
    ) }),
    /* @__PURE__ */ jsx("p", { children: "Note: You may need to turn on 'Disable Cache' for your navigating window." })
  ] });
}
function EmptyState() {
  return /* @__PURE__ */ jsxs("div", { id: "empty-view", children: [
    /* @__PURE__ */ jsx("p", { className: "text-large bold", children: "Navigate to your app" }),
    /* @__PURE__ */ jsx("p", { className: "text-normal", children: "Open your localhost to initiate subrequest profiler" }),
    /* @__PURE__ */ jsx(Link, { to: "/", target: "_blank", className: "link-margin-top", children: /* @__PURE__ */ jsx("button", { className: "primary", children: "Open app" }) })
  ] });
}
function DebugHeader() {
  return /* @__PURE__ */ jsx("header", { className: "justify-between text-large", children: /* @__PURE__ */ jsxs("div", { className: "flex-row", children: [
    /* @__PURE__ */ jsx("img", { className: "logo", src: faviconDark, alt: "Hydrogen logo" }),
    /* @__PURE__ */ jsx("h1", { children: "Subrequest Profiler" }),
    /* @__PURE__ */ jsx("span", { className: "pill", children: "Development" })
  ] }) });
}
function OptionsAndLegend({
  serverEvents,
  clearCallback,
  setHidePutRequests,
  setPreserveLog
}) {
  return /* @__PURE__ */ jsxs("div", { id: "options-and-legend", className: "justify-between pad", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex-row text-large", children: [
      /* @__PURE__ */ jsxs("button", { id: "buttonClear", onClick: () => clearCallback(), children: [
        /* @__PURE__ */ jsx(IconDiscard, {}),
        /* @__PURE__ */ jsx("span", { children: "Clear" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-control", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "hidePutRequests",
            type: "checkbox",
            checked: serverEvents.hidePutRequests,
            onChange: (event) => setHidePutRequests(event.target.checked)
          }
        ),
        /* @__PURE__ */ jsx("label", { htmlFor: "hidePutRequests", children: "Hide cache update requests (PUT)" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-control", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "preserveLog",
            type: "checkbox",
            checked: serverEvents.preserveLog,
            onChange: (event) => setPreserveLog(event.target.checked)
          }
        ),
        /* @__PURE__ */ jsx("label", { htmlFor: "preserveLog", children: "Preserve Log" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-row text-normal gap-small", children: [
      /* @__PURE__ */ jsxs("div", { className: "legend flex-row", children: [
        /* @__PURE__ */ jsx("p", { className: "bold-1", children: "Main Request" }),
        /* @__PURE__ */ jsxs("p", { className: "flex-row gap-small", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "swatch",
              style: {
                backgroundColor: WATERFALL_CONFIG.colors.server
              }
            }
          ),
          "Time on server"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "flex-row gap-small", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "swatch",
              style: {
                backgroundColor: WATERFALL_CONFIG.colors.streaming
              }
            }
          ),
          "Time to stream to client"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "legend flex-row", children: /* @__PURE__ */ jsxs("p", { className: "flex-row gap-small", children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            className: "swatch",
            style: {
              backgroundColor: WATERFALL_CONFIG.colors.subRequest
            }
          }
        ),
        "Sub request"
      ] }) })
    ] })
  ] });
}
function RequestInfo({ serverEvents }) {
  const [activeEventId, setActiveEventId] = useState();
  useEffect(() => {
    window.setActiveEventId = setActiveEventId;
  }, []);
  useEffect(() => {
    if (!activeEventId) {
      setActiveEventId(void 0);
    }
  }, [activeEventId]);
  return /* @__PURE__ */ jsxs("div", { id: "request-info", children: [
    /* @__PURE__ */ jsx("div", { className: "overflow-hidden", children: /* @__PURE__ */ jsx(
      RequestTable,
      {
        serverEvents,
        activeEventId,
        setActiveEventId
      }
    ) }),
    /* @__PURE__ */ jsx(
      "div",
      {
        id: "request-details-panel",
        className: `${activeEventId ? "active" : ""}`,
        children: /* @__PURE__ */ jsx(
          RequestDetails,
          {
            serverEvents,
            activeEventId,
            setActiveEventId
          }
        )
      }
    )
  ] });
}
export {
  DebugNetwork as default,
  links
};
