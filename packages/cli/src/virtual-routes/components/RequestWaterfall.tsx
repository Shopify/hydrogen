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
  hidePutRequests: boolean;
  recordEvents: boolean;
  preserveLog: boolean;
};

export type RequestWaterfallConfig = {
  colors: {
    server: string;
    streaming: string;
    subRequest: string;
  };
};

const PANEL_HEIGHT = 300;
const STYLE_FONT =
  '10px Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif';

export function RequestWaterfall({
  serverEvents,
  config,
}: {
  serverEvents: ServerEvents;
  config: RequestWaterfallConfig;
}) {
  const panelHeight = PANEL_HEIGHT;

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

      if (serverEvents.hidePutRequests) {
        subRequest.cacheStatus !== 'PUT' &&
          subRequestItems.push(subRequestItem);
      } else {
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
          color: config.colors.server,
          type: 'block',
          start: 'requestStart',
          end: 'responseStart',
        },
        {
          name: 'streaming',
          color: config.colors.streaming,
          type: 'block',
          start: 'responseStart',
          end: 'responseEnd',
        },
      ],
      request: [
        {
          name: 'request',
          color: config.colors.subRequest,
          type: 'block',
          start: 'requestStart',
          end: 'requestEnd',
        },
      ],
    },
  };
  return (
    <FlameChartWrapper
      height={panelHeight}
      waterfall={data}
      settings={{
        styles: {
          main: {
            blockHeight: 22,
            font: STYLE_FONT,
          },
          timeframeSelectorPlugin: {
            font: STYLE_FONT,
          },
          timeGridPlugin: {
            font: STYLE_FONT,
          },
          waterfallPlugin: {
            defaultHeight: panelHeight,
          },
        },
      }}
    />
  );
}
