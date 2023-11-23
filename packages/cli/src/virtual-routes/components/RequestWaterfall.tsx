import type {WaterfallItem, Waterfall} from 'flame-chart-js';
import {useMemo} from 'react';

import {FlameChartWrapper} from './FlameChartWrapper.jsx';
import {
  buildRequestData,
  type ServerEvent,
  type ServerEvents,
} from '../lib/useDebugNetworkServer.jsx';
import { T } from 'vitest/dist/types-198fd1d9.js';

export type RequestWaterfallConfig = {
  colors: {
    server: string;
    streaming: string;
    subRequest: string;
  };
};

const STYLE_FONT =
  '10px Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif';

let resizeTimeout: NodeJS.Timeout;

export function RequestWaterfall({
  serverEvents,
  config,
}: {
  serverEvents: ServerEvents;
  config: RequestWaterfallConfig;
}) {
  const items = buildRequestData<WaterfallItem>({
    serverEvents,
    buildMainRequest: (
      mainRequest: ServerEvent,
      timing: Record<string, number>,
    ) => {
      return {
        name: mainRequest.url,
        intervals: 'mainRequest',
        timing,
        meta: [
          {
            name: 'id',
            value: mainRequest.id,
            color: 'black',
          },
        ],
      } satisfies WaterfallItem;
    },
    buildSubRequest: (
      subRequest: ServerEvent,
      timing: Record<string, number>,
    ) => {
      return {
        name: `${subRequest.cacheStatus} ${
          subRequest.displayName ?? subRequest.url
        }`.trim(),
        intervals: 'request',
        timing,
        meta: [
          {
            name: 'id',
            value: subRequest.id,
            color: 'black',
          },
        ],
      } satisfies WaterfallItem;
    },
  });

  const data: Waterfall = {
    items: [
      {
        // Workaround a bug in flame-chart-js where the first item onSelect is not triggered
        name: 'padding-request',
        intervals: 'request',
        timing: {
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
          requestEnd: -1,
        },
      } satisfies WaterfallItem,
      ...items,
    ],
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

  const onSelect = (data: any) => {
    const eventIdMeta = data?.node?.meta?.filter(
      (meta: any) => meta.name === 'id',
    )?.[0];

    if (eventIdMeta) {
      setTimeout(() => {
        window.setActiveEventId && window.setActiveEventId(eventIdMeta.value);
        document
          .querySelector(`#request-table__row-${eventIdMeta.value}`)
          ?.scrollIntoView();
      }, 0);
    }
  };

  const settings = useMemo(
    () => ({
      options: {
        tooltip: () => {},
      },
      styles: {
        main: {
          blockHeight: 22,
          font: STYLE_FONT,
          tooltipShadowBlur: 1,
        },
        timeframeSelectorPlugin: {
          font: STYLE_FONT,
          waterfallStrokeOpacity: 1,
          waterfallFillOpacity: 0.1,
        },
        timeGridPlugin: {
          font: STYLE_FONT,
        },
        waterfallPlugin: {
          defaultHeight: 500,
        },
      },
    }),
    [],
  );

  return (
    <FlameChartWrapper
      waterfall={data}
      onSelect={onSelect}
      settings={settings}
      onResize={(flameChart, width, height) => {
        flameChart?.setSettings({
          ...settings,
          styles: {
            ...settings.styles,
            waterfallPlugin: {
              defaultHeight: height,
            },
          },
        });

        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          flameChart?.resize(width, height);
        }, 50);
      }}
    />
  );
}
