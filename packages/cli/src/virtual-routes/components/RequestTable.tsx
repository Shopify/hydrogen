import {useEffect} from 'react';
import {
  buildRequestData,
  type RequestTimings,
  type ServerEvent,
  type ServerEvents,
} from '../lib/useDebugNetworkServer.jsx';

type RequestRow = {
  id: string;
  requestId: string;
  url: string;
  cacheStatus: string;
  duration: number;
  status: number;
};

export function RequestTable({
  serverEvents,
  activeEventId,
  setActiveEventId,
}: {
  serverEvents: ServerEvents;
  activeEventId: string | undefined;
  setActiveEventId: (eventId: string | undefined) => void;
}) {
  let totalMainRequests = 0;
  let totalSubRequest = 0;

  const items = buildRequestData<RequestRow>({
    serverEvents,
    buildMainRequest: (mainRequest: ServerEvent, timing: RequestTimings) => {
      totalMainRequests++;
      return {
        id: mainRequest.id,
        requestId: mainRequest.requestId,
        url: mainRequest.url,
        status: mainRequest.responseInit?.status ?? 0,
        cacheStatus: mainRequest.cacheStatus,
        duration: timing.responseEnd - timing.requestStart,
      };
    },
    buildSubRequest: (subRequest: ServerEvent, timing: RequestTimings) => {
      if (serverEvents.hidePutRequests) {
        subRequest.cacheStatus !== 'PUT' && totalSubRequest++;
      } else {
        totalSubRequest++;
      }

      return {
        id: subRequest.id,
        requestId: subRequest.requestId,
        url: subRequest.displayName ?? subRequest.url,
        status: subRequest.responseInit?.status ?? 0,
        cacheStatus: subRequest.cacheStatus,
        duration: timing.requestEnd - timing.requestStart,
      };
    },
  });

  useEffect(() => {
    // Remove selection of active event if it's not in the list anymore
    if (!serverEvents.preserveLog && activeEventId) {
      const selectedItem = items.find((item) => item.id === activeEventId);

      if (!selectedItem) {
        setActiveEventId(undefined);
      }
    }
  }, [serverEvents.preserveLog]);

  return (
    <div id="request-table">
      <div>
        <div id="request-table__header" className="grid-row">
          <div className="grid-cell">Name</div>
          <div className="grid-cell">Cache</div>
          <div className="grid-cell">Time</div>
        </div>
        <div id="request-table__content">
          {items.map((row) => (
            <div
              id={`request-table__row-${row.id}`}
              key={row.id}
              tabIndex={0}
              className={`grid-row${activeEventId === row.id ? ' active' : ''}${
                row.status >= 400 ? ' error' : ''
              }`}
              onClick={() => setActiveEventId(row.id)}
              onKeyUp={(event) => {
                if (event.code === 'Space') setActiveEventId(row.id);
              }}
            >
              <div className="grid-cell">{row.url}</div>
              <div className="grid-cell">{row.cacheStatus}</div>
              <div className="grid-cell">{row.duration}ms</div>
            </div>
          ))}
        </div>
        <div id="request-table__footer">
          {totalMainRequests} request | {totalSubRequest} sub request
        </div>
      </div>
    </div>
  );
}
