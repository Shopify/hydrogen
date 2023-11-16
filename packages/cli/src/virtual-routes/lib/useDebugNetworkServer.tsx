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
};

export type ServerEvents = {
  smallestStartTime: number;
  mainRequests: ServerEvent[];
  subRequests: Record<string, ServerEvent[]>;
  allRequests: Record<string, ServerEvent>;
  hidePutRequests: boolean;
  recordEvents: boolean;
  preserveLog: boolean;
  activeEventId: string | undefined;
};

let nextEventId = 0;

const LOCAL_STORAGE_SETTINGS_KEY = 'h2-debug-network-settings';
type DebugNetworkSettings = Pick<
  ServerEvents,
  'preserveLog' | 'hidePutRequests'
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
    smallestStartTime: 0,
    mainRequests: [],
    subRequests: {},
    allRequests: {},
    hidePutRequests: true,
    recordEvents: true,
    preserveLog: false,
    activeEventId: undefined,
  });

  useEffect(() => {
    try {
      const debugNetworkSettings = getSettings();

      serverEvents.current.hidePutRequests =
        debugNetworkSettings.hidePutRequests ?? true;
      serverEvents.current.preserveLog =
        debugNetworkSettings.preserveLog ?? false;
    } catch {}
  }, []);

  // For triggering a react render
  const [timestamp, setTimestamp] = useState<number>();

  function clearServerEvents() {
    fetch('/debug-network-server', {method: 'DELETE'}).catch((error) =>
      console.error('Could not clear history:', error),
    );

    serverEvents.current = {
      ...serverEvents.current,
      smallestStartTime: 0,
      mainRequests: [],
      subRequests: {},
      allRequests: {},
    };
  }

  // Handle server events
  function serverEventHandler(onEvent: (data: ServerEvent) => void) {
    return (event: MessageEvent) => {
      if (serverEvents.current.recordEvents) {
        const data = JSON.parse(event.data) as unknown as ServerEvent;

        if (serverEvents.current.smallestStartTime === 0) {
          serverEvents.current.smallestStartTime = data.startTime;
        } else {
          serverEvents.current.smallestStartTime = Math.min(
            data.startTime,
            serverEvents.current.smallestStartTime,
          );
        }

        const id = `event-${nextEventId++}`;
        onEvent({
          ...data,
          id,
        });

        setTimeout(() => {
          setTimestamp(new Date().getTime());
        }, 0);
      }
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
        serverEvents.current.smallestStartTime = cleanData.startTime;
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
    setTimestamp(new Date().getTime());
  }

  function stop() {
    serverEvents.current = {
      ...serverEvents.current,
      recordEvents: false,
    };
    setTimestamp(new Date().getTime());
  }

  function record() {
    clearServerEvents();
    serverEvents.current = {
      ...serverEvents.current,
      recordEvents: true,
    };
    setTimestamp(new Date().getTime());
  }

  function setHidePutRequests(hidePutRequests: boolean) {
    serverEvents.current.hidePutRequests = hidePutRequests;
    setSettings({hidePutRequests});
    setTimestamp(new Date().getTime());
  }

  function setPreserveLog(preserveLog: boolean) {
    serverEvents.current.preserveLog = preserveLog;
    setSettings({preserveLog});
    setTimestamp(new Date().getTime());
  }

  function setActiveEventId(eventId: string | undefined) {
    serverEvents.current.activeEventId = eventId;
    setTimestamp(new Date().getTime());
  }

  return {
    serverEvents: serverEvents.current,
    clear,
    stop,
    record,
    setHidePutRequests,
    setPreserveLog,
    setActiveEventId,
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
  const calcDuration = (time: number) => time - serverEvents.smallestStartTime;
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
