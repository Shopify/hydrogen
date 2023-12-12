import {useEffect, useRef, useState} from 'react';

export type ServerEvent = {
  id: string;
  requestId: string;
  url: string;
  startTime: number;
  endTime: number;
  cacheStatus: string;
  stackLine?: string;
  stackLink?: string;
  graphiqlLink?: string;
  responsePayload?: unknown;
  responseInit?: ResponseInit;
  cache?: {
    status?: string;
    strategy?: string;
    key?: string | readonly unknown[];
  };
  displayName?: string;
};

export type ServerEvents = {
  mainRequests: ServerEvent[];
  subRequests: Record<string, ServerEvent[]>;
  allRequests: Record<string, ServerEvent>;
  hidePutRequests: boolean;
  preserveLog: boolean;
  activeEventId: string | undefined;
  hideNotification?: boolean;
};

let nextEventId = 0;

const LOCAL_STORAGE_SETTINGS_KEY = 'h2-debug-network-settings';
type DebugNetworkSettings = Pick<
  ServerEvents,
  'preserveLog' | 'hidePutRequests' | 'hideNotification'
>;

function getSettings(): Partial<DebugNetworkSettings> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function setSettings(settings: Partial<DebugNetworkSettings>) {
  localStorage.setItem(
    LOCAL_STORAGE_SETTINGS_KEY,
    JSON.stringify({...getSettings(), ...settings}),
  );
}

export function useDebugNetworkServer() {
  // Store server event data that can arrive at anytime across renders
  const serverEvents = useRef<ServerEvents>({
    mainRequests: [],
    subRequests: {},
    allRequests: {},
    hidePutRequests: true,
    preserveLog: false,
    activeEventId: undefined,
    hideNotification: undefined,
  });

  // For triggering a react render
  const [timestamp, setTimestamp] = useState<number>();

  // Trigger a render when the server events change
  function triggerRender() {
    setTimestamp(new Date().getTime());
  }

  useEffect(() => {
    try {
      const debugNetworkSettings = getSettings();

      serverEvents.current.hidePutRequests =
        debugNetworkSettings.hidePutRequests ?? true;
      serverEvents.current.preserveLog =
        debugNetworkSettings.preserveLog ?? false;
      serverEvents.current.hideNotification =
        debugNetworkSettings.hideNotification ?? undefined;

      triggerRender();
    } catch {}
  }, []);

  function clearServerEvents() {
    fetch('/debug-network-server', {method: 'DELETE'}).catch((error) =>
      console.error('Could not clear history:', error),
    );

    serverEvents.current = {
      ...serverEvents.current,
      mainRequests: [],
      subRequests: {},
      allRequests: {},
    };
  }

  // Handle server events
  function serverEventHandler(onEvent: (data: ServerEvent) => void) {
    return (event: MessageEvent) => {
      const data = JSON.parse(event.data) as unknown as ServerEvent;
      const id = `event-${nextEventId++}`;
      onEvent({
        ...data,
        id,
      });

      setTimeout(triggerRender, 0);
    };
  }

  useEffect(() => {
    const evtSource = new EventSource('/debug-network-server', {
      withCredentials: true,
    });

    const mainRequestHandler = serverEventHandler((data: ServerEvent) => {
      const cleanData = {
        ...data,
        url: data.url.replace(location.origin, ''),
      };
      if (serverEvents.current.preserveLog) {
        serverEvents.current.mainRequests = [
          ...serverEvents.current.mainRequests,
          cleanData,
        ];
      } else {
        serverEvents.current.mainRequests = [cleanData];
      }
      serverEvents.current.allRequests[cleanData.id] = cleanData;
    });
    evtSource.addEventListener('Request', mainRequestHandler);

    const subRequestHandler = serverEventHandler((data: ServerEvent) => {
      let groupEvents = serverEvents.current.subRequests[data.requestId] || [];
      groupEvents = [...groupEvents, data];
      serverEvents.current.subRequests = {
        ...serverEvents.current.subRequests,
        [data.requestId]: groupEvents,
      };
      serverEvents.current.allRequests[data.id] = data;
    });
    evtSource.addEventListener('Sub request', subRequestHandler);

    return () => {
      evtSource.removeEventListener('Request', mainRequestHandler);
      evtSource.removeEventListener('Sub request', subRequestHandler);
      evtSource.close();
    };
  }, []);

  function clear() {
    clearServerEvents();
    triggerRender();
  }

  function setHidePutRequests(hidePutRequests: boolean) {
    serverEvents.current.hidePutRequests = hidePutRequests;
    setSettings({hidePutRequests});
    triggerRender();
  }

  function setPreserveLog(preserveLog: boolean) {
    serverEvents.current.preserveLog = preserveLog;
    setSettings({preserveLog});
    triggerRender();
  }

  function setActiveEventId(eventId: string | undefined) {
    serverEvents.current.activeEventId = eventId;
  }

  function setHideNotification(hideNotification: boolean) {
    serverEvents.current.hideNotification = hideNotification;
    setSettings({hideNotification});
    triggerRender();
  }

  return {
    serverEvents: serverEvents.current,
    clear,
    setHidePutRequests,
    setPreserveLog,
    setActiveEventId,
    setHideNotification,
    timestamp,
  };
}

export type RequestTimings = {
  requestStart: number;
  requestEnd: number;
  responseStart: number;
  responseEnd: number;
};

export function buildRequestData<T>({
  serverEvents,
  buildMainRequest,
  buildSubRequest,
}: {
  serverEvents: ServerEvents;
  buildMainRequest: (mainRequest: ServerEvent, timing: RequestTimings) => T;
  buildSubRequest: (subRequest: ServerEvent, timing: RequestTimings) => T;
}): T[] {
  const calcDuration = (time: number) =>
    time - (serverEvents.mainRequests[0]?.startTime ?? 0);
  let items: T[] = [];

  serverEvents.mainRequests.forEach((mainRequest: ServerEvent) => {
    const mainResponseStart = calcDuration(mainRequest.endTime);
    let mainResponseEnd = mainResponseStart;

    const subRequestItems: T[] = [];
    const subRequests = serverEvents.subRequests[mainRequest.requestId] || [];
    subRequests.forEach((subRequest: ServerEvent) => {
      const subRequestEnd = calcDuration(subRequest.endTime);

      if (subRequest.cacheStatus !== 'PUT') {
        mainResponseEnd = Math.max(mainResponseEnd, subRequestEnd);
      }

      const subRequestItem = buildSubRequest(subRequest, {
        requestStart: calcDuration(subRequest.startTime),
        requestEnd: subRequestEnd,
        responseStart: -1,
        responseEnd: -1,
      });

      if (serverEvents.hidePutRequests) {
        subRequest.cacheStatus !== 'PUT' &&
          subRequestItems.push(subRequestItem as T);
      } else {
        subRequestItems.push(subRequestItem as T);
      }
    });

    items.push(
      buildMainRequest(mainRequest, {
        requestStart: calcDuration(mainRequest.startTime),
        responseStart: mainResponseStart,
        responseEnd: mainResponseEnd,
        requestEnd: -1,
      }),
    );
    items = items.concat(subRequestItems);
  });

  return items;
}
