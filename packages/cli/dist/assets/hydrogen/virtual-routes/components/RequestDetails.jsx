import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { Link } from "@remix-run/react";
import { IconClose } from "./IconClose.jsx";
import _useResizeObserver from "use-resize-observer";
const useResizeObserver = _useResizeObserver;
const TABS = {
  1: "General",
  2: "Headers",
  3: "Cache",
  4: "Data"
};
function RequestDetails({
  serverEvents,
  activeEventId,
  setActiveEventId
}) {
  const [activeTab, setActiveTab] = useState(1);
  if (!activeEventId) {
    return null;
  }
  const requestInfo = serverEvents.allRequests[activeEventId];
  if (!requestInfo) {
    return null;
  }
  function activeTabClass(tab) {
    return activeTab === tab ? " active" : "";
  }
  function TabButton(key) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        tabIndex: 0,
        className: `tab${activeTabClass(key)}`,
        onClick: () => setActiveTab(key),
        onKeyUp: (event) => {
          if (event.code === "Space") setActiveTab(key);
        },
        children: TABS[key]
      }
    );
  }
  return /* @__PURE__ */ jsxs("div", { id: "request-detail", children: [
    /* @__PURE__ */ jsxs("div", { id: "request-detail-header", children: [
      /* @__PURE__ */ jsxs(TabButtonsBar, { children: [
        TabButton(1),
        !!requestInfo.responseInit?.headers && TabButton(2),
        !!requestInfo.cache && TabButton(3),
        !!requestInfo.responsePayload && TabButton(4)
      ] }),
      /* @__PURE__ */ jsx("div", { id: "close-request-detail", children: /* @__PURE__ */ jsx(
        "button",
        {
          className: "plain icon",
          onClick: () => {
            setActiveEventId(void 0);
          },
          children: /* @__PURE__ */ jsx(IconClose, {})
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "tabPanels pad", children: [
      /* @__PURE__ */ jsx("div", { id: "tab1-panel", className: `tabPanel${activeTabClass(1)}`, children: /* @__PURE__ */ jsxs("div", { className: "grid-layout", children: [
        /* @__PURE__ */ jsx(DetailsRow, { rowName: "Name", value: requestInfo.displayName }),
        /* @__PURE__ */ jsx(DetailsRow, { rowName: "Request URL", value: requestInfo.url }),
        requestInfo.responseInit ? /* @__PURE__ */ jsx(
          DetailsRow,
          {
            rowName: "Status",
            value: `${requestInfo.responseInit?.status} ${requestInfo.responseInit?.statusText}`
          }
        ) : null,
        /* @__PURE__ */ jsx(
          DetailsRow,
          {
            rowName: "GraphiQL",
            value: requestInfo.graphiqlLink,
            type: "url"
          }
        ),
        /* @__PURE__ */ jsx(
          DetailsRow,
          {
            rowName: "Location",
            text: requestInfo.stackLine,
            value: requestInfo.stackLink,
            type: "url"
          }
        )
      ] }) }),
      !!requestInfo.responseInit?.headers && /* @__PURE__ */ jsx("div", { id: "tab2-panel", className: `tabPanel${activeTabClass(2)}`, children: /* @__PURE__ */ jsx("div", { className: "grid-layout", children: Object.entries(requestInfo.responseInit?.headers).map(
        ([key, value]) => /* @__PURE__ */ jsx(DetailsRow, { rowName: value[0], value: value[1] }, key)
      ) }) }),
      !!requestInfo.cache && /* @__PURE__ */ jsx("div", { id: "tab3-panel", className: `tabPanel${activeTabClass(3)}`, children: /* @__PURE__ */ jsxs("div", { className: "grid-layout", children: [
        /* @__PURE__ */ jsx(DetailsRow, { rowName: "Status", value: requestInfo.cache?.status }),
        /* @__PURE__ */ jsx(
          DetailsRow,
          {
            rowName: "Cache-Control",
            value: requestInfo.cache?.strategy
          }
        ),
        /* @__PURE__ */ jsx(
          DetailsRow,
          {
            rowName: "Cache Key",
            value: requestInfo.cache?.key?.toString()
          }
        )
      ] }) }),
      !!requestInfo.responsePayload && /* @__PURE__ */ jsx("div", { id: "tab4-panel", className: `tabPanel${activeTabClass(4)}`, children: /* @__PURE__ */ jsx("pre", { className: "code-json", children: JSON.stringify(requestInfo.responsePayload, void 0, 2) }) })
    ] })
  ] });
}
function TabButtonsBar({ children }) {
  const [fadeClass, setFadeClass] = useState("");
  const scrollBarRef = useRef(null);
  useResizeObserver({
    ref: scrollBarRef,
    onResize: () => {
      if (scrollBarRef.current) {
        setFade(scrollBarRef.current);
      }
    }
  });
  function setFade(target) {
    if (target.scrollWidth === target.clientWidth) {
      setFadeClass("");
      return;
    }
    const scrollRange = target.scrollWidth - target.clientWidth;
    if (target.scrollLeft > 10 && target.scrollLeft < scrollRange - 10) {
      setFadeClass("fadeLeftRight");
    } else if (target.scrollLeft <= 10) {
      setFadeClass("fadeRight");
    } else if (target.scrollLeft > scrollRange - 10) {
      setFadeClass("fadeLeft");
    }
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      id: "tab-buttons-wrapper",
      onResize: (event) => setFade(event.currentTarget),
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            id: "tabButtons",
            ref: scrollBarRef,
            className: "flex-row gap-tiny",
            onScroll: (event) => setFade(event.currentTarget),
            children
          }
        ),
        /* @__PURE__ */ jsx("div", { className: `fadCover ${fadeClass}` })
      ]
    }
  );
}
function DetailsRow({
  rowName,
  value,
  text,
  type = "string"
}) {
  if (!rowName || !value) {
    return null;
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "gridTitle", children: rowName }),
    type === "url" && /* @__PURE__ */ jsx(Link, { target: "_blank", to: value, children: text ?? value }),
    type === "string" && /* @__PURE__ */ jsx("div", { className: "word-break-all", children: text ?? value })
  ] });
}
export {
  RequestDetails
};
