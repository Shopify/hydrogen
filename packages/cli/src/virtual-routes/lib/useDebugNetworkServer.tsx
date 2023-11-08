import {useEffect, useRef, useState} from 'react';

import type {
  ServerEvent,
  ServerEvents,
} from '../components/RequestWaterfall.jsx';

export function useDebugNetworkServer() {
  // Store server event data that can arrive at anytime across renders
  const serverEvents = useRef<ServerEvents>({
    smallestStartTime: 0,
    mainRequests: [],
    subRequests: {},
    hidePutRequests: true,
    recordEvents: true,
    preserveLog: false,
  });

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

        onEvent(data);

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
      serverEvents.current.mainRequests = [
        ...serverEvents.current.mainRequests,
        {
          ...data,
          url: data.url.replace(location.origin, ''),
        },
      ];
    });
    evtSource.addEventListener('Request', mainRequestHandler);

    const subRequestHandler = serverEventHandler((data: ServerEvent) => {
      let groupEvents = serverEvents.current.subRequests[data.id] || [];
      groupEvents = [...groupEvents, data];
      serverEvents.current.subRequests = {
        ...serverEvents.current.subRequests,
        [data.id]: groupEvents,
      };
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
    setTimestamp(new Date().getTime());
  }

  function setPreserveLog(preserveLog: boolean) {
    serverEvents.current.preserveLog = preserveLog;
    setTimestamp(new Date().getTime());
  }

  return {
    serverEvents: serverEvents.current,
    clear,
    stop,
    record,
    setHidePutRequests,
    setPreserveLog,
    timestamp,
  };
}
