import type {Waterfall, WaterfallItems} from 'flame-chart-js';

import {FlameChartWrapper} from './FlameChartWrapper.jsx';
import {Link} from '@remix-run/react';

export type ServerEvent = {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
  cacheStatus: string;
  stackLine?: string;
  graphql?: string;
};

export type ServerEvents = {
  smallestStartTime: number;
  mainRequests: ServerEvent[];
  subRequests: Record<string, ServerEvent[]>;
  showPutRequests: boolean;
  viewportHeight: number;
};

const PANEL_HEIGHT = 300;

export function RequestWaterfall({serverEvents}: {serverEvents: ServerEvents}) {
  const panelHeight = serverEvents.viewportHeight - 67 || PANEL_HEIGHT;

  if (serverEvents.mainRequests.length === 0)
    return (
      <div
        style={{
          height: `${panelHeight}px`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FAFAFA',
        }}
      >
        <p style={{fontWeight: 'bold', color: '#777'}}>
          Navigate your{' '}
          <Link to="/" target="_blank">
            app
          </Link>
        </p>
      </div>
    );

  let totalRequests = 0;
  let totalSubRequests = 0;

  const calcDuration = (time: number) => time - serverEvents.smallestStartTime;
  let items: WaterfallItems = [];

  serverEvents.mainRequests.forEach((mainRequest: ServerEvent) => {
    const mainResponseStart = calcDuration(mainRequest.endTime);
    let mainResponseEnd = mainResponseStart;

    const subRequestItems: WaterfallItems = [];
    const subRequests = serverEvents.subRequests[mainRequest.id] || [];
    subRequests.forEach((subRequest: ServerEvent) => {
      const subRequestEnd = calcDuration(subRequest.endTime);

      if (subRequest.cacheStatus !== 'PUT') {
        mainResponseEnd = Math.max(mainResponseEnd, subRequestEnd);
      }

      const subRequestItem = {
        name: `${subRequest.cacheStatus} ${subRequest.url}`.trim(),
        intervals: 'request',
        timing: {
          requestStart: calcDuration(subRequest.startTime),
          requestEnd: subRequestEnd,
        },
      };

      if (serverEvents.showPutRequests) {
        subRequestItems.push(subRequestItem);
      } else {
        subRequest.cacheStatus !== 'PUT' &&
          subRequestItems.push(subRequestItem);
      }

      totalSubRequests++;
    });

    totalRequests++;

    items.push({
      name: mainRequest.url,
      intervals: 'mainRequest',
      timing: {
        requestStart: calcDuration(mainRequest.startTime),
        responseStart: mainResponseStart,
        responseEnd: mainResponseEnd,
      },
    });
    items = items.concat(subRequestItems);
  });

  const data: Waterfall = {
    items,
    intervals: {
      mainRequest: [
        {
          name: 'server',
          color: '#99CC00',
          type: 'block',
          start: 'requestStart',
          end: 'responseStart',
        },
        {
          name: 'streaming',
          color: '#33CCFF',
          type: 'block',
          start: 'responseStart',
          end: 'responseEnd',
        },
      ],
      request: [
        {
          name: 'request',
          color: '#FFCC00',
          type: 'block',
          start: 'requestStart',
          end: 'requestEnd',
        },
      ],
    },
  };
  return (
    <>
      <FlameChartWrapper
        height={panelHeight}
        waterfall={data}
        settings={{
          styles: {
            waterfallPlugin: {
              defaultHeight: panelHeight,
            },
          },
        }}
      />
      <div
        style={{
          display: 'flex',
          padding: '5px',
          borderTop: '1px solid #CCC',
          borderBottom: '1px solid #CCC',
        }}
      >
        {totalRequests} requests
        <span
          style={{
            paddingLeft: '2px',
            paddingRight: '2px',
          }}
        >
          |
        </span>
        {totalSubRequests} sub requests
      </div>
    </>
  );
}
