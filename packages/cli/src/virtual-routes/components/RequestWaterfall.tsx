import {useEffect} from 'react';
import type {WaterfallItem, Waterfall} from 'flame-chart-js';
import {useMemo} from 'react';

import {FlameChartWrapper} from './FlameChartWrapper.jsx';
import {Link} from '@remix-run/react';
import {
  buildRequestData,
  type ServerEvent,
  type ServerEvents,
} from '../lib/useDebugNetworkServer.jsx';

export type RequestWaterfallConfig = {
  colors: {
    server: string;
    streaming: string;
    subRequest: string;
  };
};

const STYLE_FONT =
  '10px Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif';

export function RequestWaterfall({
  serverEvents,
  config,
  setActiveEventId,
}: {
  serverEvents: ServerEvents;
  config: RequestWaterfallConfig;
  setActiveEventId: (eventId: string | undefined) => void;
}) {
  if (serverEvents.mainRequests.length === 0)
    return (
      <div
        style={{
          // height: `${panelHeight}px`,
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
        name: `${subRequest.cacheStatus} ${subRequest.url}`.trim(),
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

  useEffect(() => {
    // Remove selection of active event if it's not in the list anymore
    if (!serverEvents.preserveLog && serverEvents.activeEventId) {
      const selectedItem = items.find(
        (item) => item.meta?.[0]?.value === serverEvents.activeEventId,
      );

      if (!selectedItem) {
        setActiveEventId(undefined);
      }
    }
  }, [serverEvents.preserveLog]);

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

  // const tooltipRenderer = (data: any, renderEngine: RenderEngine | OffscreenRenderEngine, mouse: Mouse | null) => {
  //   console.log({data, renderEngine, mouse});
  // }

  const onSelect = (data: any) => {
    console.log(data);
    const eventIdMeta = data.node.meta.filter(
      (meta: any) => meta.name === 'id',
    )[0];
    if (eventIdMeta) {
      setActiveEventId(eventIdMeta.value);
    }
  };

  const settings = useMemo(
    () => ({
      // options: {
      //   tooltip: tooltipRenderer,
      // },
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
      },
    }),
    [],
  );

  return (
    <FlameChartWrapper
      waterfall={data}
      onSelect={onSelect}
      settings={settings}
    />
  );
}
