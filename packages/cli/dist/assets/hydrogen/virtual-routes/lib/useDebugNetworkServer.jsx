import { useEffect, useRef, useState } from "react";
let nextEventId = 0;
const SUBREQUEST_PROFILER_ENDPOINT = "/debug-network-server";
const LOCAL_STORAGE_SETTINGS_KEY = "h2-debug-network-settings";
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function setSettings(settings) {
  localStorage.setItem(
    LOCAL_STORAGE_SETTINGS_KEY,
    JSON.stringify({ ...getSettings(), ...settings })
  );
}
function useDebugNetworkServer() {
  const serverEvents = useRef({
    mainRequests: [],
    subRequests: {},
    allRequests: {},
    hidePutRequests: true,
    preserveLog: false,
    activeEventId: void 0,
    hideNotification: void 0
  });
  const [timestamp, setTimestamp] = useState();
  function triggerRender() {
    setTimestamp((/* @__PURE__ */ new Date()).getTime());
  }
  useEffect(() => {
    try {
      const debugNetworkSettings = getSettings();
      serverEvents.current.hidePutRequests = debugNetworkSettings.hidePutRequests ?? true;
      serverEvents.current.preserveLog = debugNetworkSettings.preserveLog ?? false;
      serverEvents.current.hideNotification = debugNetworkSettings.hideNotification ?? void 0;
      triggerRender();
    } catch {
    }
  }, []);
  function clearServerEvents() {
    fetch(SUBREQUEST_PROFILER_ENDPOINT, { method: "DELETE" }).catch(
      (error) => console.error("Could not clear history:", error)
    );
    serverEvents.current = {
      ...serverEvents.current,
      mainRequests: [],
      subRequests: {},
      allRequests: {},
      activeEventId: void 0
    };
  }
  function serverEventHandler(onEvent) {
    return (event) => {
      const data = JSON.parse(event.data);
      const id = `event-${nextEventId++}`;
      onEvent({
        ...data,
        id
      });
      setTimeout(triggerRender, 0);
    };
  }
  useEffect(() => {
    const evtSource = new EventSource(SUBREQUEST_PROFILER_ENDPOINT, {
      withCredentials: true
    });
    const mainRequestHandler = serverEventHandler((data) => {
      const cleanData = {
        ...data,
        url: data.url.replace(location.origin, "")
      };
      if (serverEvents.current.preserveLog) {
        serverEvents.current.mainRequests = [
          ...serverEvents.current.mainRequests,
          cleanData
        ];
      } else {
        serverEvents.current.mainRequests = [cleanData];
      }
      serverEvents.current.allRequests[cleanData.id] = cleanData;
    });
    evtSource.addEventListener("Request", mainRequestHandler);
    const subRequestHandler = serverEventHandler((data) => {
      let groupEvents = serverEvents.current.subRequests[data.requestId] || [];
      groupEvents = [...groupEvents, data];
      serverEvents.current.subRequests = {
        ...serverEvents.current.subRequests,
        [data.requestId]: groupEvents
      };
      serverEvents.current.allRequests[data.id] = data;
    });
    evtSource.addEventListener("Sub request", subRequestHandler);
    return () => {
      evtSource.removeEventListener("Request", mainRequestHandler);
      evtSource.removeEventListener("Sub request", subRequestHandler);
      evtSource.close();
    };
  }, []);
  function clear() {
    clearServerEvents();
    triggerRender();
  }
  function setHidePutRequests(hidePutRequests) {
    serverEvents.current.hidePutRequests = hidePutRequests;
    setSettings({ hidePutRequests });
    triggerRender();
  }
  function setPreserveLog(preserveLog) {
    serverEvents.current.preserveLog = preserveLog;
    setSettings({ preserveLog });
    triggerRender();
  }
  function setActiveEventId(eventId) {
    serverEvents.current.activeEventId = eventId;
  }
  function setHideNotification(hideNotification) {
    serverEvents.current.hideNotification = hideNotification;
    setSettings({ hideNotification });
    triggerRender();
  }
  return {
    serverEvents: serverEvents.current,
    clear,
    setHidePutRequests,
    setPreserveLog,
    setActiveEventId,
    setHideNotification,
    timestamp
  };
}
function buildRequestData({
  serverEvents,
  buildMainRequest,
  buildSubRequest
}) {
  const calcDuration = (time) => time - (serverEvents.mainRequests[0]?.startTime ?? 0);
  let items = [];
  serverEvents.mainRequests.forEach((mainRequest) => {
    const mainResponseStart = calcDuration(mainRequest.endTime);
    let mainResponseEnd = mainResponseStart;
    const subRequestItems = [];
    const subRequests = serverEvents.subRequests[mainRequest.requestId] || [];
    subRequests.forEach((subRequest) => {
      const subRequestEnd = calcDuration(subRequest.endTime);
      if (subRequest.cacheStatus !== "PUT") {
        mainResponseEnd = Math.max(mainResponseEnd, subRequestEnd);
      }
      const subRequestItem = buildSubRequest(subRequest, {
        requestStart: calcDuration(subRequest.startTime),
        requestEnd: subRequestEnd,
        responseStart: -1,
        responseEnd: -1
      });
      if (serverEvents.hidePutRequests) {
        subRequest.cacheStatus !== "PUT" && subRequestItems.push(subRequestItem);
      } else {
        subRequestItems.push(subRequestItem);
      }
    });
    items.push(
      buildMainRequest(mainRequest, {
        requestStart: calcDuration(mainRequest.startTime),
        responseStart: mainResponseStart,
        responseEnd: mainResponseEnd,
        requestEnd: -1
      })
    );
    items = items.concat(subRequestItems);
  });
  return items;
}
export {
  SUBREQUEST_PROFILER_ENDPOINT,
  buildRequestData,
  useDebugNetworkServer
};
