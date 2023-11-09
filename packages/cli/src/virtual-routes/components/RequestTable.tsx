import {
  buildRequestData,
  RequestTimings,
  type ServerEvent,
  type ServerEvents,
} from './RequestWaterfall.jsx';

type RequestRow = {
  id: string;
  requestId: string;
  url: string;
  cacheStatus: string;
  duration: number;
};

export function RequestTable({serverEvents}: {serverEvents: ServerEvents}) {
  let totalMainRequests = 0;
  let totalSubRequest = 0;

  const items = buildRequestData<RequestRow>({
    serverEvents,
    buildMainRequest: (mainRequest: ServerEvent, timing: RequestTimings) => {
      totalMainRequests++;
      return {
        id: mainRequest.id,
        requestId: mainRequest.id,
        url: mainRequest.url,
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
        requestId: subRequest.id,
        url: subRequest.url,
        cacheStatus: subRequest.cacheStatus,
        duration: timing.requestEnd - timing.requestStart,
      };
    },
  });

  console.log(items);

  return (
    <div id="request-table">
      <div id="request-table__header" className="grid-row">
        <div className="grid-cell">Name</div>
        <div className="grid-cell">Cache</div>
        <div className="grid-cell">Time</div>
      </div>
      <div id="request-table__content">
        {items.map((row, index) => (
          <div key={index} className="grid-row">
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
  );
}
